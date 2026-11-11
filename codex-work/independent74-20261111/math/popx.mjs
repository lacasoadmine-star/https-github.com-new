import { active, baseRound, draw, error, payout, publicBase, timestamp } from './engines/shared.mjs';

const SCHEDULE = [11500, 14000, 18000, 24000, 33000, 47000, 70000, 110000, 180000, 300000, 550000, 1000000];
const ART = [
  ['cherry', 'Cherry', '🍒'], ['grape', 'Grape', '🍇'], ['lemon', 'Lemon', '🍋'],
  ['orange', 'Orange', '🍊'], ['melon', 'Watermelon', '🍉'], ['kiwi', 'Kiwi', '🥝'],
  ['pineapple', 'Pineapple', '🍍'], ['bell', 'Bell', '🔔'], ['clover', 'Clover', '☘'],
  ['star', 'Star', '★'], ['diamond', 'Diamond', '◆'],
];
const copy = value => structuredClone(value);
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
// PostgreSQL jsonb may reorder object keys. State validation must compare
// values and array order, not the incidental insertion order of JS objects.
const equal = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

// Only the public 6×5 / eleven-symbol / eight-or-more cascade rule is reference
// evidence. Timing, conditional grid distributions, the multiplier schedule,
// cap and independent single-player operation below are authored model choices.
export function configurePopxCascade(definition) {
  const d = copy(definition);
  if (d.id !== 'ind74_official_popx') error('INVALID_MODEL', 'This cascade definition belongs to the official PopX catalogue ID.');
  Object.assign(d, {
    family: 'crash', crashMechanic: 'cascade', mathVersion: 'official72-popx-r3',
    model: 'independent-single-player-cascade-crash-v1', rows: 5, cols: 6, minMatch: 8,
    cascadeMs: 1500, multipliersBps: [...SCHEDULE], maxSteps: SCHEDULE.length,
    maxMultiplierBps: SCHEDULE.at(-1), returnBps: 9600,
    symbols: ART.map(([id, label, glyph]) => ({ id: 'popx_' + id, label, glyph })),
    cascadeRules: {
      source: 'https://www.smartsoftgaming.com/games/popx', publicGridRuleVerified: true,
      sharedSessionImplemented: false, providerProbabilitiesVerified: false,
      providerTimingVerified: false, providerMultiplierScheduleVerified: false,
      operatorTimingMs: 1500, operatorMaximumMultiplierBps: SCHEDULE.at(-1),
    },
    nominalReturn: { numerator: '9600', denominator: '10000',
      description: 'Independent survival schedule gives 96% expected return at each fixed successful-stage cashout before minor-unit rounding. This is not provider RTP.' },
    rules: [
      'This independent board has six columns, five rows and eleven symbol types. A group of at least eight identical symbols anywhere is a match.',
      'All matching symbols are removed. Remaining symbols fall within their columns, and new symbols fill only the resulting holes.',
      'Each successful cascade raises the confirmed multiplier. The first board without a match crashes the round and pays zero.',
      'The first board resolves when the stake is accepted. Collecting a live round pays its latest confirmed multiplier; a collection at or after a crash pays zero.',
      'The independent operator schedule advances every 1500 milliseconds through 1.15, 1.4, 1.8, 2.4, 3.3, 4.7, 7, 11, 18, 30, 55 and 100 times the stake. Reaching 100 times automatically collects.',
      'The independent first survival probability is 9600/11500. Later survival probabilities are the previous multiplier divided by the next multiplier. Conditional board construction, timing and the 100-times cap are authored choices, not recovered provider probabilities.',
      'This implementation is a single-player round. The provider describes a shared session; shared multiplayer synchronization and any bonus features remain unverified and are not implemented here.',
    ],
  });
  delete d.ticketCount;
  delete d.growthBpsPerSecond;
  return d;
}

function validateConfig(d) {
  if (d.crashMechanic !== 'cascade' || d.rows !== 5 || d.cols !== 6 || d.minMatch !== 8 ||
      !Array.isArray(d.symbols) || d.symbols.length !== 11 || new Set(d.symbols.map(s => s.id)).size !== 11 ||
      !Number.isSafeInteger(d.cascadeMs) || d.cascadeMs < 1 ||
      !Array.isArray(d.multipliersBps) || d.multipliersBps.length !== 12 ||
      d.multipliersBps.some((value, index) => !Number.isSafeInteger(value) || value <= (index ? d.multipliersBps[index - 1] : 10000)) ||
      d.maxMultiplierBps !== d.multipliersBps.at(-1) || !Number.isSafeInteger(d.returnBps) || d.returnBps <= 0 || d.returnBps > 10000) {
    error('INVALID_MODEL', 'Invalid independent PopX cascade configuration.');
  }
}

export function evaluatePopxGrid(d, grid) {
  validateConfig(d);
  const ids = new Set(d.symbols.map(symbol => symbol.id));
  if (!Array.isArray(grid) || grid.length !== d.rows || grid.some(row => !Array.isArray(row) || row.length !== d.cols || row.some(id => !ids.has(id)))) {
    error('INVALID_GRID', 'A PopX board must contain five rows of six configured symbols.');
  }
  const counts = new Map(d.symbols.map(symbol => [symbol.id, 0]));
  for (const row of grid) for (const id of row) counts.set(id, counts.get(id) + 1);
  const matchedSymbols = [...counts].filter(([, count]) => count >= d.minMatch).map(([symbolId, count]) => ({ symbolId, count }));
  const matching = new Set(matchedSymbols.map(group => group.symbolId));
  const matchedPositions = [];
  for (let row = 0; row < d.rows; row++) for (let col = 0; col < d.cols; col++) if (matching.has(grid[row][col])) matchedPositions.push({ row, col });
  return { matchedSymbols, matchedPositions, winning: matchedSymbols.length > 0 };
}

function losingFill(d, grid, rng, excluded = null) {
  const counts = new Map(d.symbols.map(symbol => [symbol.id, 0]));
  for (const row of grid) for (const id of row) if (id !== null) counts.set(id, counts.get(id) + 1);
  for (let row = 0; row < d.rows; row++) for (let col = 0; col < d.cols; col++) if (grid[row][col] === null) {
    const eligible = d.symbols.map(symbol => symbol.id).filter(id => id !== excluded && counts.get(id) < d.minMatch - 1);
    if (!eligible.length) error('INVALID_MODEL', 'The independent board cannot be filled within its count bound.');
    const id = eligible[draw(rng, eligible.length)];
    grid[row][col] = id; counts.set(id, counts.get(id) + 1);
  }
  return grid;
}

function initialGrid(d, winning, rng) {
  const grid = Array.from({ length: d.rows }, () => Array(d.cols).fill(null));
  if (!winning) return losingFill(d, grid, rng);
  const target = d.symbols[draw(rng, d.symbols.length)].id;
  const positions = Array.from({ length: d.rows * d.cols }, (_, index) => index);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = draw(rng, i + 1); [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const count = d.minMatch + draw(rng, 5);
  for (const position of positions.slice(0, count)) grid[Math.floor(position / d.cols)][position % d.cols] = target;
  return losingFill(d, grid, rng, target);
}

function fallenGrid(d, previous) {
  const removedPositions = evaluatePopxGrid(d, previous).matchedPositions;
  if (!removedPositions.length) error('INVALID_ROUND', 'A crashed board cannot cascade.');
  const removed = new Set(removedPositions.map(({ row, col }) => row * d.cols + col));
  const grid = Array.from({ length: d.rows }, () => Array(d.cols).fill(null));
  const survivorMoves = [];
  for (let col = 0; col < d.cols; col++) {
    const survivors = [];
    for (let row = 0; row < d.rows; row++) if (!removed.has(row * d.cols + col)) survivors.push({ row, id: previous[row][col] });
    const offset = d.rows - survivors.length;
    for (let i = 0; i < survivors.length; i++) {
      const targetRow = offset + i;
      grid[targetRow][col] = survivors[i].id;
      survivorMoves.push({ symbolId: survivors[i].id, from: { row: survivors[i].row, col }, to: { row: targetRow, col } });
    }
  }
  return { grid, removedPositions, survivorMoves };
}

function cascadeGrid(d, previous, winning, rng) {
  const fallen = fallenGrid(d, previous);
  if (!winning) { losingFill(d, fallen.grid, rng); return fallen; }
  const target = d.symbols[draw(rng, d.symbols.length)].id;
  for (const row of fallen.grid) for (let col = 0; col < row.length; col++) if (row[col] === null) row[col] = target;
  return fallen;
}

function frameOutcome(frame) {
  return { kind: 'cascade', grid: copy(frame.grid), matchedPositions: copy(frame.matchedPositions),
    matchedSymbols: copy(frame.matchedSymbols), removedPositions: copy(frame.removedPositions),
    survivorMoves: copy(frame.survivorMoves), cascadeIndex: frame.index,
    result: frame.result, multiplierBps: frame.multiplierBps };
}

function validateSequence(d, round) {
  validateConfig(d);
  const sequence = round.private?.sequence;
  if (round.gameId !== d.id || round.mathVersion !== d.mathVersion || round.family !== 'crash' || round.crashMechanic !== 'cascade' || !Number.isSafeInteger(round.startedAt) || round.startedAt < 0 ||
      !Number.isSafeInteger(round.lastObservedAt) || round.lastObservedAt < round.startedAt ||
      !Array.isArray(sequence) || sequence.length < 1 || sequence.length > d.multipliersBps.length) error('INVALID_ROUND', 'Invalid stored PopX sequence.');
  for (const [index, frame] of sequence.entries()) {
    const match = evaluatePopxGrid(d, frame.grid);
    const final = index === sequence.length - 1;
    const expectedResult = match.winning ? (index === d.multipliersBps.length - 1 ? 'cap' : 'match') : 'crash';
    if (frame.index !== index || frame.at !== round.startedAt + index * d.cascadeMs || frame.result !== expectedResult ||
        !equal(frame.matchedSymbols, match.matchedSymbols) || !equal(frame.matchedPositions, match.matchedPositions) ||
        frame.multiplierBps !== (match.winning ? d.multipliersBps[index] : 0) ||
        (frame.result !== 'match') !== final) error('INVALID_ROUND', 'Stored PopX cascade outcomes are inconsistent.');
    if (index === 0) {
      if (!equal(frame.removedPositions, []) || !equal(frame.survivorMoves, [])) error('INVALID_ROUND', 'Initial board cannot have removed cells.');
    } else {
      const fallen = fallenGrid(d, sequence[index - 1].grid);
      if (!equal(frame.removedPositions, fallen.removedPositions) || !equal(frame.survivorMoves, fallen.survivorMoves)) error('INVALID_ROUND', 'Stored cascade does not preserve its removed cells and survivors.');
      for (let row = 0; row < d.rows; row++) for (let col = 0; col < d.cols; col++) if (fallen.grid[row][col] !== null && fallen.grid[row][col] !== frame.grid[row][col]) error('INVALID_ROUND', 'A cascade changed a surviving symbol.');
    }
  }
  if (!Number.isSafeInteger(round.private.terminalAt) || round.private.terminalAt !== sequence.at(-1).at) error('INVALID_ROUND', 'Invalid PopX terminal timestamp.');
  return sequence;
}

function project(d, round, now) {
  const sequence = validateSequence(d, round), at = timestamp(now);
  if (at < round.startedAt || at < round.lastObservedAt) error('INVALID_TIME', 'Server time cannot move backwards within a round.');
  const index = Math.min(sequence.length - 1, Math.floor((at - round.startedAt) / d.cascadeMs));
  const frame = sequence[index];
  const status = frame.result === 'crash' ? 'lost' : frame.result === 'cap' ? 'collected' : 'active';
  return { ...copy(round), lastObservedAt: at, cascadeIndex: index, step: index + 1, status,
    multiplierBps: frame.multiplierBps, winMinor: status === 'collected' ? payout(round.betMinor, frame.multiplierBps) : '0',
    history: sequence.slice(0, index + 1).map(item => ({ step: item.index + 1, cascadeIndex: item.index,
      type: item.result === 'match' ? 'cascade' : item.result === 'cap' ? 'automatic-collect' : 'crash',
      multiplierBps: item.multiplierBps, matchedCount: item.matchedPositions.length })),
    outcome: frameOutcome(frame) };
}

export function validatePopxCascade(d, round) {
  const sequence = validateSequence(d, round);
  const index = Math.min(sequence.length - 1, Math.floor((round.lastObservedAt - round.startedAt) / d.cascadeMs));
  const frame = sequence[index];
  if (round.cascadeIndex !== index || round.step !== index + 1 || round.maxSteps !== d.multipliersBps.length ||
      round.multiplierBps !== frame.multiplierBps || !equal(round.outcome, frameOutcome(frame)) ||
      !Array.isArray(round.history) || round.history.length !== index + 1 ||
      round.history.some((item, i) => item.step !== i + 1 || item.cascadeIndex !== i || item.multiplierBps !== sequence[i].multiplierBps || item.matchedCount !== sequence[i].matchedPositions.length || item.type !== (sequence[i].result === 'match' ? 'cascade' : sequence[i].result === 'cap' ? 'automatic-collect' : 'crash')) ||
      !['active', 'lost', 'collected'].includes(round.status) ||
      (round.status === 'lost' && (frame.result !== 'crash' || round.winMinor !== '0')) ||
      (round.status === 'active' && (frame.result !== 'match' || round.winMinor !== '0')) ||
      (round.status === 'collected' && (frame.result === 'crash' || round.winMinor !== payout(round.betMinor, frame.multiplierBps)))) {
    error('INVALID_ROUND', 'Stored PopX public progress or award is inconsistent.');
  }
  return true;
}

export function startPopxCascade(d, { betMinor, rng, now }) {
  validateConfig(d);
  const base = baseRound(d, betMinor), startedAt = timestamp(now), sequence = [];
  for (let index = 0; index < d.multipliersBps.length; index++) {
    const threshold = index ? d.multipliersBps[index - 1] : d.returnBps;
    const winning = draw(rng, d.multipliersBps[index]) < threshold;
    const board = index ? cascadeGrid(d, sequence[index - 1].grid, winning, rng)
      : { grid: initialGrid(d, winning, rng), removedPositions: [], survivorMoves: [] };
    const matches = evaluatePopxGrid(d, board.grid);
    if (matches.winning !== winning) error('INVALID_MODEL', 'Conditional cascade construction changed its selected outcome.');
    const result = !winning ? 'crash' : index === d.multipliersBps.length - 1 ? 'cap' : 'match';
    sequence.push({ ...board, ...matches, index, at: timestamp(startedAt + index * d.cascadeMs), result,
      multiplierBps: winning ? d.multipliersBps[index] : 0 });
    if (result !== 'match') break;
  }
  const round = { ...base, crashMechanic: 'cascade', startedAt, lastObservedAt: startedAt,
    maxSteps: d.multipliersBps.length, private: { sequence, terminalAt: sequence.at(-1).at } };
  return project(d, round, startedAt);
}

export function syncPopxCascade(d, round, now) {
  validatePopxCascade(d, round);
  return round.status === 'active' ? project(d, round, now) : copy(round);
}

export function collectPopxCascade(d, round, now) {
  active(round);
  const current = syncPopxCascade(d, round, now);
  return current.status !== 'active' ? current : { ...current, status: 'collected', winMinor: payout(current.betMinor, current.multiplierBps) };
}

export function publicPopxCascade(d, round, now) {
  const view = syncPopxCascade(d, round, now);
  const live = round.status === 'active' && view.status === 'active';
  return { ...publicBase(round), crashMechanic: 'cascade', multiplierBps: view.multiplierBps,
    history: copy(view.history), step: view.step, cascadeIndex: view.cascadeIndex,
    startedAt: view.startedAt, serverNow: timestamp(now), maxMultiplierBps: d.maxMultiplierBps,
    outcome: copy(view.outcome), grid: copy(view.outcome.grid), matchedPositions: copy(view.outcome.matchedPositions),
    matchedSymbols: copy(view.outcome.matchedSymbols),
    nextCascadeAt: live ? timestamp(view.startedAt + (view.cascadeIndex + 1) * d.cascadeMs) : null,
    collectibleMinor: live ? payout(view.betMinor, view.multiplierBps) : '0',
    pendingResolution: round.status === 'active' && view.status !== 'active',
    allowedActions: live ? ['reveal', 'collect'] : [] };
}
