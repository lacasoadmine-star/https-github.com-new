// Content-addressed reference media only. Existing library handlers are retained.
export function installReferenceStatic(previous, inventory) {
  return {
    ...previous,
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      // The existing Player forwards this prefix through its service binding.
      const alias = '/native-expansion100/reference-art/r1/smartsoft/assets/';
      const path = url.pathname.startsWith(alias)
        ? url.pathname.replace('/native-expansion100/', '/native-library/')
        : url.pathname;
      const file = Object.hasOwn(inventory, path) ? inventory[path] : null;
      if (!file) return previous.fetch(request, env, ctx);
      if (!['GET', 'HEAD'].includes(request.method)) {
        return Response.json({error:'METHOD_NOT_ALLOWED'}, {status:405, headers:{allow:'GET, HEAD','cache-control':'no-store'}});
      }
      if (!env.ASSETS) return Response.json({error:'ASSETS_UNAVAILABLE'}, {status:503, headers:{'cache-control':'no-store'}});
      // Account credentials never reach the static asset service.
      const requestHeaders = new Headers();
      for (const name of ['range','if-range','if-none-match','if-modified-since']) {
        const value = request.headers.get(name);
        if (value) requestHeaders.set(name, value);
      }
      const asset = await env.ASSETS.fetch(new Request(new URL(path, url.origin), {method:request.method, headers:requestHeaders}));
      const headers = new Headers(asset.headers);
      headers.set('x-content-type-options','nosniff');
      if (asset.ok || asset.status === 304) {
        headers.set('content-type',file.type);
        headers.set('cache-control','public, max-age=31536000, immutable');
        headers.set('x-zplay-static-sha256',file.sha256);
      } else {
        headers.set('cache-control','no-store');
      }
      return new Response(request.method === 'HEAD' ? null : asset.body, {status:asset.status, headers});
    }
  };
}
