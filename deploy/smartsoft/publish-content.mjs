// Run through the connected Cloudflare API. Content replacement preserves the
// existing service configuration, secrets, asset binding and DO namespace.
export function retainedModules(raw) {
  const bytes = typeof raw === 'string' ? new TextEncoder().encode(raw) : new Uint8Array(raw);
  const find = (pattern, start = 0) => {
    outer: for (let i = start; i <= bytes.length - pattern.length; i++) {
      for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer;
      return i;
    }
    return -1;
  };
  const line = find(new Uint8Array([13, 10]));
  if (line < 3 || line > 200) throw Error('INVALID_WORKER_MULTIPART');
  const boundary = bytes.slice(0, line), separator = new Uint8Array([13, 10, ...boundary]);
  const parts = [];
  let at = line + 2;
  for (;;) {
    const end = find(separator, at);
    if (end < 0) throw Error('TRUNCATED_WORKER_MULTIPART');
    const start = find(new Uint8Array([13, 10, 13, 10]), at);
    if (start < at || start >= end) throw Error('INVALID_WORKER_MODULE_HEADER');
    const header = new TextDecoder().decode(bytes.subarray(at, start));
    const name = /Content-Disposition:[^\r\n]*\bname="([^"]+)"/i.exec(header)?.[1];
    if (!name || parts.some(part => part.name === name)) throw Error('INVALID_WORKER_MODULE_NAME');
    const type = /Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1] || (name.endsWith('.mjs') ? 'application/javascript+module' : 'application/octet-stream');
    parts.push({name, type, body: bytes.slice(start + 4, end)});
    const next = end + separator.length;
    if (bytes[next] === 45 && bytes[next + 1] === 45) break;
    if (bytes[next] !== 13 || bytes[next + 1] !== 10) throw Error('INVALID_WORKER_MULTIPART_SEPARATOR');
    at = next + 2;
  }
  return parts;
}

export function unreachablePrune(retained, modules, mainModule, names = []) {
  if (!Array.isArray(names) || names.some(name => !['expansion-client-assets-20261108.mjs','expansion-worker-20261108.mjs','expansion-player-entry-20261108.mjs'].includes(name))) throw Error('INVALID_PRUNE_SCOPE');
  if (!names.length) return retained;
  const sources = new Map(retained.map(part => [part.name, new TextDecoder().decode(part.body)]));
  for (const [name, body] of Object.entries(modules)) sources.set(name, body);
  const reachable = new Set();
  function visit(name) {
    if (reachable.has(name)) return;
    reachable.add(name);
    const source = sources.get(name); if (typeof source !== 'string') throw Error('MODULE_DEPENDENCY_MISSING:' + name);
    for (const match of source.matchAll(/["']([^"'\n]+\.(?:mjs|js|bin|wasm))["']/g)) {
      const path = match[1], target = sources.has(path) ? path : path.startsWith('.') ? new URL(path, 'https://worker/' + name).pathname.slice(1) : null;
      if (target && sources.has(target)) visit(target);
    }
  }
  visit(mainModule);
  for (const name of names) if (!sources.has(name) || reachable.has(name) || Object.hasOwn(modules, name)) throw Error('PRUNE_MODULE_IS_REACHABLE_OR_CHANGED:' + name);
  return retained.filter(part => !names.includes(part.name));
}

export async function publishContent({cloudflare, accountId, scriptName, expectedEtag, mainModule, modules, replacementHashes = {}, pruneUnreachable = []}) {
  if (!['superwin-player','superwin-library-100'].includes(scriptName) || typeof expectedEtag !== 'string' || !/^[a-z0-9-]+\.mjs$/.test(mainModule)) throw Error('EXPLICIT_EXISTING_WORKER_REQUIRED');
  const root = '/accounts/' + accountId + '/workers/scripts';
  const list = await cloudflare.request({method: 'GET', path: root});
  const current = list.result.find(script => script.id === scriptName);
  if (!current || current.etag !== expectedEtag) throw Error('WORKER_CHANGED_REVIEW_LATEST_SOURCE');
  const path = root + '/' + scriptName;
  const previous = await cloudflare.request({method: 'GET', path});
  const retained = unreachablePrune(retainedModules(previous), modules, mainModule, pruneUnreachable), names = new Set(retained.map(part => part.name));
  if (!names.has(mainModule) && !Object.hasOwn(modules, mainModule)) throw Error('EXPLICIT_EXISTING_ENTRY_REQUIRED');
  const required=scriptName==='superwin-player'?['remaining20-accepted-controls-player-entry-r12.mjs','remaining20-worker-20261109.mjs']:['remaining20-accepted-controls-library-entry-r12.mjs','library.mjs'];
  if(required.some(name=>!names.has(name)))throw Error('RETAINED_ENTRY_OR_TRANSPORT_MISSING');
  for (const [name, body] of Object.entries(modules)) {
    if (!/^[a-z0-9-]+\.mjs$/.test(name) || typeof body !== 'string') throw Error('MODULE_COLLISION_OR_INVALID_SOURCE:' + name);
    if (names.has(name)) {
      if (!['native-player-entry-r22.mjs','account-lobby-source-r13.mjs','account-entry-r13.mjs','reference-resources-r14.mjs','construction-player-entry-r15.mjs','operator-library-entry-r16.mjs','operator-status-r16.mjs','operator-control-sources-r16.mjs'].includes(name) || !/^[a-f0-9]{64}$/.test(replacementHashes[name] || '')) throw Error('MODULE_COLLISION_OR_INVALID_SOURCE:' + name);
      const part = retained.find(part => part.name === name);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', part.body)), value => value.toString(16).padStart(2,'0')).join('');
      if (digest !== replacementHashes[name]) throw Error('OWNED_MODULE_CHANGED:' + name);
    }
  }
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({main_module: mainModule})], {type: 'application/json'}));
  for (const part of retained) if (!Object.hasOwn(modules, part.name)) form.append(part.name, new Blob([part.body], {type: part.type}), part.name);
  for (const [name, body] of Object.entries(modules)) form.append(name, new Blob([body], {type: 'application/javascript+module'}), name);
  const sourceBytes=retained.filter(part=>!Object.hasOwn(modules,part.name)).reduce((n,part)=>n+part.body.byteLength,0)+Object.values(modules).reduce((n,source)=>n+new TextEncoder().encode(source).byteLength,0);
  if(sourceBytes>67000000)throw Error('EXISTING_WORKER_SIZE_BUDGET_EXCEEDED');
  // Check the live head again immediately before the one content mutation.
  const latest = await cloudflare.request({method: 'GET', path: root});
  if (latest.result.find(script => script.id === scriptName)?.etag !== expectedEtag) throw Error('WORKER_CHANGED_DURING_PACKAGE');
  const result = await cloudflare.request({method: 'PUT', path: path + '/content', body: form});
  const replacedModules = Object.keys(modules).filter(name => names.has(name));
  return {result, retainedModuleCount: retained.length - replacedModules.length, replacedModules, addedModules: Object.keys(modules).filter(name => !names.has(name)), prunedUnreachableModules:pruneUnreachable, mainModule, sourceBytes};
}
