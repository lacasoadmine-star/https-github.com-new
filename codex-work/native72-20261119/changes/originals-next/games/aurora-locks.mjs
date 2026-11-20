export default {
  slug: 'aurora-locks', title: 'Aurora Locks', theme: 'aurora', previewOnly: true,
  description: 'Match an aurora band across four reels. A full reel of keys unlocks 25 points per reel.',
  columns: 4, rows: 4,
  symbols: ['⛶', '❄', '⋔', '◑', '✦', '◈'],
  names: ['Key', 'Frost', 'Peak', 'Moon', 'Flare', 'Ice Gem'],
  lines: [
    [0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [3, 3, 3, 3],
    [0, 1, 2, 3], [3, 2, 1, 0], [1, 0, 0, 1], [2, 3, 3, 2],
  ],
  multipliers: [1, 1, 1, 2, 2, 5],
  points: [13, 5, 7, 8, 11, 10],
  accentNotes: [277, 349, 415, 554],
  bonus: ({ grid }) => grid.filter(reel => reel.every(symbol => symbol === 0)).length * 25,
};
