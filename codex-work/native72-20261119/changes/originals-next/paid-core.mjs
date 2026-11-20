import { createHash, randomInt, randomUUID } from 'node:crypto';
import { deal } from './round.mjs';
import { games } from './games/catalog.mjs';

const betLevels = ['1.00', '2.00', '5.00'];
const idFor = game => game.slug.replaceAll('-', '_');
const bonusCounts = {
  'prism-deluxe': [20, 5, 5],
  'savanna-signals': [12, 9, 3],
  'ember-arcade': [24, 20, 8],
  'signal-ten': [18, 3, 3],
  'neon-circuit': [16, 15, 5],
  'orbit-hundred': [40, 4, 4],
};
const version = 'zplay-originals-next-1';
const ratio = 0.96;

function choose(n, k) {
  let ways = 1;
  for (let i = 1; i <= k; i++) ways *= (n + 1 - i) / i;
  return ways;
}

function expectedBonus(game) {
  const [points, cells, minimum] = bonusCounts[game.slug];
  if (game.slug === 'prism-deluxe') return points / game.symbols.length ** 4;
  const p = 1 / game.symbols.length;
  let probability = 0;
  for (let k = minimum; k <= cells; k++) probability += choose(cells, k) * p ** k * (1 - p) ** (cells - k);
  return points * probability;
}

function createGame(game) {
  const frequencies = game.multipliers;
  const expected = game.lines.length * game.points.reduce((sum, value) => sum + value, 0) /
    game.symbols.length ** game.columns * frequencies.reduce((sum, value) => sum + value, 0) /
    frequencies.length + expectedBonus(game);
  const factor = ratio / expected;
  const maxPoints = Math.max(...game.points) * game.lines.length * Math.max(...frequencies) + bonusCounts[game.slug][0];
  const id = idFor(game);
  const mathVersion = version + ':' + id;
  const mathSha256 = createHash('sha256').update(JSON.stringify({
    mathVersion, symbols: game.names, lines: game.lines, frequencies, factor, points: game.points,
    bonus: bonusCounts[game.slug], betLevels,
  })).digest('hex');
  return { id, name: game.title, game, mathVersion, mathSha256, factor,
    maxMultiplier: Math.ceil(maxPoints * factor), betLevels };
}

export function extendOriginals(existing, { paidIds = [] } = {}) {
  const selected = new Set(paidIds);
  const models = games.filter(game => !game.previewOnly && selected.has(idFor(game))).map(createGame);
  const byId = new Map(models.map(model => [model.id, model]));
  if (byId.size !== selected.size || existing.GAMES.some(game => byId.has(game.id))) {
    throw Error('ORIGINALS_MODEL_SELECTION_INVALID');
  }
  return {
    ...existing,
    GAMES: [...existing.GAMES, ...models],
    nextModel(id) { return byId.get(id); },
    nextManifest: models.map(({ id, name, mathVersion, mathSha256, betLevels, game }) =>
      ({ id, name, mathVersion, mathSha256, betLevels, columns: game.columns, rows: game.rows })),
    math(model) { return byId.has(model.id) ? { maxMultiplier: byId.get(model.id).maxMultiplier } : existing.math(model); },
    spin(id, units, draw = randomInt) {
      const model = byId.get(id);
      if (!model) return existing.spin(id, units, draw);
      const result = deal(model.game, 1, draw);
      return {
        gameId: id, roundId: randomUUID(), grid: result.grid, lines: result.lines,
        wheelMultiplier: result.multiplier, bonus: result.bonus,
        frames: [{ multiplier: result.multiplier }],
        mathVersion: model.mathVersion, mathSha256: model.mathSha256,
        multiplier: result.score * model.factor,
      };
    },
  };
}
