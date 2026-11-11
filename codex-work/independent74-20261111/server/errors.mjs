export class ServiceError extends Error {
  constructor(code, message, status = 400) {
    super(message); this.name = 'ServiceError'; this.code = code; this.status = status;
  }
}

export function fail(code, message, status = 400) { throw new ServiceError(code, message, status); }

export function publicError(error) {
  if (error instanceof ServiceError) return { status: error.status, body: { ok: false, error: { code: error.code, message: error.message } } };
  return { status: 503, body: { ok: false, error: { code: 'WALLET_UNAVAILABLE', message: 'The account service is unavailable. Check the round before retrying.' } } };
}
