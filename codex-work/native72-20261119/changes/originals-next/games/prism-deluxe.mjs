export default {
  slug: 'prism-deluxe', title: 'Prism Deluxe', theme: 'prism',
  description: 'Line up three crystals. Cross the two diagonals to trigger the prism bonus.',
  columns: 3, rows: 3,
  symbols: ['◇', '⬢', '✦', '▲', '●', '⬟'],
  names: ['Diamond', 'Quartz', 'Star', 'Topaz', 'Pearl', 'Emerald'],
  lines: [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 2], [2, 1, 0]],
  multipliers: [1, 1, 2, 2, 3, 4],
  points: [12, 8, 7, 5, 4, 3],
  accentNotes: [262, 330, 392],
  bonus: ({ lines }) => lines.includes(3) && lines.includes(4) ? 20 : 0,
};
