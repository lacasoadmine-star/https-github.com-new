export default {
  slug: 'neon-circuit', title: 'Neon Circuit', theme: 'neon',
  description: 'Match a circuit on twenty routes. Five charged batteries anywhere trigger the power bonus.',
  columns: 5, rows: 3,
  symbols: ['▣', '↯', '≡', '⟐', '◫', '∿'],
  names: ['Battery', 'Surge', 'Bus', 'Diode', 'Display', 'Pulse'],
  lines: Array.from({ length: 20 }, (_, index) => {
    const route = (index * 17 + 9) % 243;
    return Array.from({ length: 5 }, (_, column) => Math.floor(route / 3 ** column) % 3);
  }),
  multipliers: [1, 1, 2, 3, 3, 5],
  points: [11, 10, 8, 7, 6, 4],
  accentNotes: [247, 330, 370, 494, 554],
  bonus: ({ grid }) => grid.flat().filter(symbol => symbol === 0).length >= 5 ? 16 : 0,
};
