function randomIndex(size) {
  const limit = 2 ** 32 - (2 ** 32 % size);
  const sample = new Uint32Array(1);
  do crypto.getRandomValues(sample); while (sample[0] >= limit);
  return sample[0] % size;
}

export function deal(game, level, pick = randomIndex) {
  const grid = Array.from({ length: game.columns }, () => Array.from({ length: game.rows }, () => pick(game.symbols.length)));
  const multiplier = game.multipliers[pick(game.multipliers.length)];
  const lines = game.lines.flatMap((rows, index) => {
    const symbol = grid[0][rows[0]];
    return rows.every((row, column) => grid[column][row] === symbol) ? [index] : [];
  });
  const linePoints = lines.reduce((total, index) => total + game.points[grid[0][game.lines[index][0]]], 0);
  const bonus = game.bonus({ grid, lines });
  return { grid, multiplier, lines, bonus, score: level * (linePoints * multiplier + bonus) };
}
