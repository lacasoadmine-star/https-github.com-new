// Additive route adapter for the existing backend. This does not start a new
// server, create infrastructure, run migrations, or enable financial writes.
export function withIndependentRoutes(existingFetch, independentFetch) {
  if (typeof existingFetch !== 'function' || typeof independentFetch !== 'function') throw new TypeError('Both existing and independent fetch handlers are required.');
  return function dispatch(request, ...context) {
    const path = new URL(request.url).pathname;
    return path.startsWith('/v1/independent74/')
      ? independentFetch.call(this, request, ...context)
      : existingFetch.call(this, request, ...context);
  };
}
