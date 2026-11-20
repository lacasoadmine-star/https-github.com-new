const routes = [
  [0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 3, 3, 3, 0], [0, 1, 2, 1, 0],
  [0, 3, 2, 3, 0], [0, 1, 2, 3, 0], [0, 3, 2, 1, 0], [0, 2, 0, 2, 0],
  [0, 0, 2, 2, 0], [0, 2, 3, 0, 1],
];

export default {
  slug: 'ember-arcade', title: 'Ember Arcade', theme: 'ember',
  description: 'Trace matches across five reels and forty routes. A board with eight embers earns an extra 24 points.',
  columns: 5, rows: 4,
  symbols: ['✹', '◈', '◆', '☄', '◉', '⯁'],
  names: ['Ember', 'Circuit', 'Core', 'Comet', 'Orbit', 'Beacon'],
  lines: routes.flatMap(route => [0, 1, 2, 3].map(offset => route.map(row => (row + offset) % 4))),
  multipliers: [1, 1, 2, 3, 4, 6],
  points: [4, 6, 8, 10, 14, 18],
  accentNotes: [220, 294, 330, 392, 494],
  bonus: ({ grid }) => grid.flat().filter(symbol => symbol === 0).length >= 8 ? 24 : 0,
};
