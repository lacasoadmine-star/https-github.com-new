// Wire amounts and error identity shared by the renderer facade and backend.
// No engine, entropy, Node-only import, session or wallet is included here.
export const GAME_ID = 'zplay72_multi_hot_5_super_wilds_v1';
const MONEY = /^(0|[1-9]\d{0,12})\.\d{2}$/;
const MAX = 9223372036854775807n;
export class SuperWildsError extends Error {
  constructor(code, status = 503) { super(code); this.name = 'SuperWildsError'; this.code = code; this.status = status; }
}
export function minor(value) {
  if (typeof value !== 'string' || !MONEY.test(value)) throw new SuperWildsError('SUPERWILDS_MONEY_INVALID', 400);
  const result = BigInt(value.replace('.', ''));
  if (result > MAX) throw new SuperWildsError('SUPERWILDS_MONEY_INVALID', 400);
  return result;
}
export function amount(value) {
  if (typeof value !== 'bigint' || value < 0n || value > MAX) throw new SuperWildsError('SUPERWILDS_HOST_AMOUNT_INVALID');
  return value;
}
export const money = value => { const n = amount(value); return `${n / 100n}.${String(n % 100n).padStart(2, '0')}`; };
