const routes = [
  [0, 0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2],
  [0, 1, 1, 2], [2, 1, 1, 0], [1, 0, 2, 1], [1, 2, 0, 1],
  [0, 2, 0, 2], [2, 0, 2, 0],
];

export default {
  slug: 'tidal-relay', title: 'Tidal Relay', theme: 'tidal', previewOnly: true,
  description: 'Match sea symbols across four reels. Equal buoys on the ends of the middle route add 14 points.',
  columns: 4, rows: 3,
  symbols: ['⚓', '◒', '≋', '✷', '⟟', '◉'],
  names: ['Anchor', 'Shell', 'Wave', 'Starfish', 'Buoy', 'Pearl'],
  lines: routes,
  multipliers: [1, 1, 1, 2, 3, 5],
  points: [16, 7, 5, 9, 6, 13],
  accentNotes: [196, 247, 330, 392],
  bonus: ({ grid }) => grid[0][1] === 4 && grid[3][1] === 4 ? 14 : 0,
};
