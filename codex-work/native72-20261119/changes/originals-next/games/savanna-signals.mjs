export default {
  slug: 'savanna-signals', title: 'Savanna Signals', theme: 'savanna',
  description: 'Match three trail markers along a route. Three suns anywhere earn a sunrise bonus.',
  columns: 3, rows: 3,
  symbols: ['☀', '≋', '⌁', '☾', '✶', '⊕'],
  names: ['Sun', 'River', 'Trail', 'Moon', 'Campfire', 'Compass'],
  lines: [[1, 1, 1], [0, 1, 0], [2, 1, 2], [0, 2, 0], [2, 0, 2]],
  multipliers: [1, 1, 1, 2, 3, 5],
  points: [8, 7, 6, 4, 4, 3],
  accentNotes: [196, 247, 294],
  bonus: ({ grid }) => grid.flat().filter(symbol => symbol === 0).length >= 3 ? 12 : 0,
};
