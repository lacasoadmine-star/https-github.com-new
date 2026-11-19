import {assets} from './worker-assets.mjs';
import {RELEASE, transformRoot} from './root-transform.mjs';

// Installation composes around the existing live Worker; no API, engine or
// account route is replaced. New content is stored under immutable KV hashes.
export function installPlayerPresentation(previous) {
  return {...previous, async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (env.PORTAL !== 'player' || !['GET', 'HEAD'].includes(request.method)) {
      return previous.fetch.call(previous, request, env, ctx);
    }
    const asset = assets[path];
    if (asset) {
      const headers = {'Content-Type': asset.contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'X-Zplay-Release': RELEASE};
      const body = await env.SSG_OFFICIAL_REFERENCES.get(asset.key, 'arrayBuffer');
      if (!body) return new Response('Player asset temporarily unavailable', {status: 503, headers: {...headers, 'Cache-Control': 'no-store'}});
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', body)), n => n.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256) return new Response('Player asset integrity check failed', {status: 503, headers: {...headers, 'Cache-Control': 'no-store'}});
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
