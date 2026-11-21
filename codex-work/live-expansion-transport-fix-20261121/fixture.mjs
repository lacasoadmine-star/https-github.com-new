import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

export const MODULES = Object.freeze({
  expansion: 'expansion-worker-20261108-fetch-fix.mjs',
  balloon: 'balloon-worker-20261108.mjs',
});
export const PINS = Object.freeze({
  baseline: {
    expansion: 'd348ec638ddfae3a676a340c157eecc01971b5bb6a6e04b9b50a92e5148c1cec',
    balloon: '0a28ca4a593bc4925d11d18e468e44cf51dc2b4021677504da91bef9f5f02aca',
  },
  candidate: {
    expansion: '4fccd64669136c2bfbe74454b627b6ae06fbc2c9a061147e770702230a1fc279',
    balloon: '497606663471e6ffafcdebbbdf2263f49321a3e7ddaad8db71b9196ec65d3ec6',
  },
});
export const FIXTURE_SECRET = 'fixture-only-not-a-production-credential-'.repeat(2);
export const FIXTURE_COOKIE = 'a'.repeat(64);
export const PLAYER_ORIGIN = 'https://player.example.test';
export const ENGINE_ORIGIN = 'https://engine.example.test';
export const hash = value => createHash('sha256').update(value).digest('hex');
export const gameId = kind => kind === 'balloon' ? 'balloon_native' : 'multihot40_native';
export const route = (kind, operation = 'state') => '/api/' + (kind === 'balloon' ? 'library' : 'expansion') + '/' + operation;
export const sessionToken = kind => hash((kind === 'balloon' ? 'zplay-balloon-session:' : 'zplay-library-session:') + FIXTURE_COOKIE);

export function source(kind, revision = 'candidate') {
  const value = readFileSync(new URL('./' + revision + '/' + MODULES[kind], import.meta.url), 'utf8');
  if (hash(value) !== PINS[revision][kind]) throw new Error('Source pin mismatch: ' + revision + '/' + kind);
  return value;
}

// Only module linking is replaced. Function bodies are the pinned source.
export function moduleBody(value) {
  return value.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
}
function loadModule(value, bindings, names) {
  const script = new vm.Script('(function(){\n' + moduleBody(value) + '\nreturn {' + names.join(',') + '};\n})()');
  return script.runInNewContext({
    URL, TextEncoder, Response, Request, Headers, crypto: webcrypto,
    ...bindings,
  });
}

// Node accepts redirect:error. This constructor adapter implements the exact
// rejection observed in the Cloudflare runtime (recorded separately), so Node
// cannot silently hide this Workers-specific regression.
export function workersRequest(input, init = {}) {
  if (init.redirect !== undefined && !['manual', 'follow'].includes(init.redirect)) {
    throw new TypeError('Invalid redirect value, must be one of "follow" or "manual" ("error" won\'t be implemented since it does not make sense at the edge; use "manual" and check the response status code).');
  }
  return new Request(input, init);
}

export function makeRequest(kind, operation = 'state', options = {}) {
  const action = operation === 'action';
  const id = options.gameId ?? gameId(kind);
  const body = options.body ?? JSON.stringify({
    game_id: id, action: 'start', request_id: 'fixture-request-only', stake: '5.00',
  });
  const headers = {
    cookie: 'sw_session=' + FIXTURE_COOKIE,
    ...(action ? {
      origin: PLAYER_ORIGIN,
      'content-type': 'application/json',
      [kind === 'balloon' ? 'X-Zplay-Balloon-Session' : 'X-Zplay-Library-Session']: sessionToken(kind),
    } : {}),
    ...options.headers,
  };
  for (const [name, value] of Object.entries(headers)) if (value === null) delete headers[name];
  const query = action ? '' : '?game_id=' + id + (options.sort ? '&sort=' + options.sort : '');
  return new Request(PLAYER_ORIGIN + route(kind, operation) + query, {
    method: options.method ?? (action ? 'POST' : 'GET'), headers,
    ...(action ? { body } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });
}

export function fixture(kind, options = {}) {
  const revision = options.revision ?? (process.env.TRANSPORT_REVIEW_BASELINE === '1' ? 'baseline' : 'candidate');
  const calls = [], previousCalls = [];
  const syntheticFetch = async (input, init) => {
    const request = workersRequest(input, init);
    calls.push({ request, input: String(input), init });
    if (options.upstream) return options.upstream(request, init);
    return Response.json({ fixture: true, game_id: gameId(kind) });
  };
  const previous = {
    marker: 'retained-handler',
    async fetch(request) {
      previousCalls.push(request);
      if (new URL(request.url).pathname === '/api/machine-session') {
        return options.identity ? options.identity(request) : Response.json({ authenticated: true });
      }
      return Response.json({ legacy: true });
    },
  };
  const common = { fetch: syntheticFetch, ASSETS: {} };
  const balloon = loadModule(source('balloon', revision), common, ['sign', 'installBalloon']);
  const expansion = loadModule(source('expansion', revision), {
    ...common, sign: balloon.sign,
    GAMES: [{ id: 'multihot40_native', launchable: true }],
    REFERENCE_ART_FILES: {},
  }, ['installExpansion']);
  const handler = kind === 'balloon' ? balloon.installBalloon(previous) : expansion.installExpansion(previous);
  const env = {
    PORTAL: 'player', NATIVE_ENGINE_ORIGIN: ENGINE_ORIGIN,
    NATIVE_ENGINE_SECRET: FIXTURE_SECRET, ...options.env,
  };
  return { handler, env, calls, previousCalls, sign: balloon.sign,
    run(request = makeRequest(kind)) { return handler.fetch(request, env, {}); } };
}

// The generated function runs the exact source bodies inside Cloudflare's
// execution runtime with an actual Request constructor and synthetic fetch.
// No cloudflare.request call and no real fetch are made by this probe.
export function cloudflareRouteProbe() {
  const revisions = Object.fromEntries(['baseline', 'candidate'].map(revision => [
    revision, Object.fromEntries(['balloon', 'expansion'].map(kind => [kind, moduleBody(source(kind, revision))])),
  ]));
  const blocks = [];
  for (const revision of ['baseline', 'candidate']) {
    blocks.push('{\nconst revision=' + JSON.stringify(revision) + ';\n' +
      'const calls=[]; const ASSETS={},GAMES=[{id:"multihot40_native",launchable:true}],REFERENCE_ART_FILES={};\n' +
      'const fetch=async(input,init)=>{const request=new Request(input,init);calls.push({url:request.url,method:request.method,redirect:request.redirect});return Response.json({fixture:true});};\n' +
      'const previous={async fetch(){return Response.json({authenticated:true});}};\n' +
      'const env={PORTAL:"player",NATIVE_ENGINE_ORIGIN:"https://engine.example.test",NATIVE_ENGINE_SECRET:' + JSON.stringify(FIXTURE_SECRET) + '};\n' +
      'const balloon=(()=>{\n' + revisions[revision].balloon + '\nreturn {sign,installBalloon};})();\n' +
      'const sign=balloon.sign;\nconst expansion=(()=>{\n' + revisions[revision].expansion + '\nreturn {installExpansion};})();\n' +
      'for(const kind of ["expansion","balloon"]){const start=calls.length; const id=kind==="balloon"?"balloon_native":"multihot40_native"; const prefix=kind==="balloon"?"library":"expansion";' +
      'const handler=kind==="balloon"?balloon.installBalloon(previous):expansion.installExpansion(previous);' +
      'const response=await handler.fetch(new Request("https://player.example.test/api/"+prefix+"/state?game_id="+id,{headers:{cookie:"sw_session=' + FIXTURE_COOKIE + '"}}),env,{});' +
      'const body=await response.json();results.push({revision,kind,status:response.status,error:body.error??null,fixture:body.fixture===true,syntheticUpstreamCalls:calls.slice(start)});}\n}');
  }
  return 'async () => { const results=[];\n' + blocks.join('\n') +
    '\nreturn {observedAt:new Date().toISOString(),description:"Pinned route bodies with actual Cloudflare Request constructor and synthetic fetch",realNetworkRequests:0,productionRequests:0,productionWagers:0,sourcePins:' +
    JSON.stringify(PINS) + ',results};\n}';
}
