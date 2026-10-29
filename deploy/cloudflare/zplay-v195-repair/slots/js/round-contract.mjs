// Validate the response shape before rendering it. The server remains authoritative.
export function validateRound(result, model, bet) {
  const fail = () => { throw Error('UNVERIFIED_ROUND_RESULT'); };
  if (!result || typeof result.roundId !== 'string' || !result.roundId.trim() || String(result.bet) !== String(bet)) fail();
  if (result.gameId !== undefined && result.gameId !== model.id) fail();
  const money = value => (typeof value === 'string' || typeof value === 'number') && /^\d+(?:\.\d{1,4})?$/.test(String(value)) && Number.isFinite(Number(value));
  if (!money(result.balanceAfter) || !money(result.finalWin) || !model.wheel.values.includes(result.wheelMultiplier)) fail();
  const symbols = new Set(model.previewReels.flat());
  if (!Array.isArray(result.grid) || result.grid.length !== model.rows || result.grid.some(row => !Array.isArray(row) || row.length !== model.reels || row.some(s => !symbols.has(s)))) fail();
  if (!Array.isArray(result.winLines) || result.winLines.some(line => !Array.isArray(line.positions) || line.positions.some(p => !Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1]) || p[0] < 0 || p[0] >= model.rows || p[1] < 0 || p[1] >= model.reels))) fail();
  return result;
}
export class SpinLifecycle {
  constructor(onChange = () => {}) { this.state = 'IDLE'; this.onChange = onChange; }
  move(next) {
    const transitions = { IDLE:['REQUESTING'], REQUESTING:['SPINNING','ERROR','RETRYABLE_PENDING'], SPINNING:['STOPPING','RETRYABLE_PENDING'], STOPPING:['REVEALING','RETRYABLE_PENDING'], REVEALING:['WIN_PRESENTATION','RETRYABLE_PENDING'], WIN_PRESENTATION:['SETTLED','RETRYABLE_PENDING'], SETTLED:['IDLE'], ERROR:['IDLE'], RETRYABLE_PENDING:['REQUESTING'] };
    if (!transitions[this.state]?.includes(next)) throw Error(`INVALID_SPIN_TRANSITION: ${this.state} -> ${next}`);
    this.state = next; this.onChange(next);
  }
}
