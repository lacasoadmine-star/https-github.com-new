import {assets} from './worker-assets.mjs';
import {RELEASE, transformRoot} from './root-transform.mjs';

// Installation composes around the existing live Worker; no API, engine or
// account route is replaced. New content is stored under immutable KV hashes.
async function matchesAsset(body, asset) {
  if (!body || body.byteLength !== asset.bytes) return false;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
  return Array.from(digest, n => n.toString(16).padStart(2, '0')).join('') === asset.sha256;
}

export function installPlayerPresentation(previous, bundled = {}) {
  return {...previous, async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (env.PORTAL !== 'player' || !['GET', 'HEAD'].includes(request.method)) {
      return previous.fetch.call(previous, request, env, ctx);
    }
    const asset = assets[path];
    if (asset) {
      const headers = {'Content-Type': asset.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'X-Zplay-Release': RELEASE};
      let body;
      try {
        body = await env.SSG_OFFICIAL_REFERENCES.get(asset.key, 'arrayBuffer');
      } catch {
        // The release carries its own copy for KV outages and cold reads.
      }
      if (!await matchesAsset(body, asset)) {
        const source = bundled[path.slice(path.lastIndexOf('/') + 1)];
        body = typeof source === 'string' ? new TextEncoder().encode(source) : null;
        if (!await matchesAsset(body, asset)) {
          return new Response('Invalid Player release', {status: 500, headers: {'Cache-Control': 'no-store'}});
        }
      }
      return new Response(request.method === 'HEAD' ? null : body, {headers});
    }
    const response = await previous.fetch.call(previous, request, env, ctx);
    if (['/', '/games/'].includes(path) && request.method === 'GET' && response.headers.get('Content-Type')?.includes('text/html')) {
      const transformed = transformRoot(response);
      const headers = new Headers(transformed.headers);
      headers.delete('Content-Length');
      headers.delete('ETag');
      headers.delete('Last-Modified');
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Zplay-Player-Release', RELEASE);
      return new Response(transformed.body, {status: transformed.status, statusText: transformed.statusText, headers});
    }
    return response;
  }};
}
