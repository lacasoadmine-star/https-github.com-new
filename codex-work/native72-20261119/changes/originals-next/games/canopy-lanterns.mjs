export default {
  slug: 'canopy-lanterns', title: 'Canopy Lanterns', theme: 'canopy', previewOnly: true,
  description: 'Light a route through five reels. Lanterns in all four corners earn an extra 28 points.',
  columns: 5, rows: 4,
  symbols: ['✧', '❋', '♣', '◈', '☘', '◮'],
  names: ['Lantern', 'Orchid', 'Fern', 'Seed', 'Clover', 'Moth'],
  lines: [
    [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3],
    [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [0, 2, 3, 2, 0], [3, 1, 0, 1, 3],
    [0, 1, 2, 3, 2], [3, 2, 1, 0, 1], [1, 0, 1, 2, 3], [2, 3, 2, 1, 0],
  ],
  multipliers: [1, 1, 2, 2, 4, 6],
  points: [18, 10, 4, 6, 5, 12],
  accentNotes: [165, 220, 277, 330, 440],
  bonus: ({ grid }) => [grid[0][0], grid[0][3], grid[4][0], grid[4][3]].every(symbol => symbol === 0) ? 28 : 0,
};
