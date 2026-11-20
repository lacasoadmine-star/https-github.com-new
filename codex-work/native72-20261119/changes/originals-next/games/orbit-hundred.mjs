export default {
  slug: 'orbit-hundred', title: 'Orbit Hundred', theme: 'orbit',
  description: 'Match objects on a hundred orbits. Comets in all four positions of the last reel trigger a flyby bonus.',
  columns: 5, rows: 4,
  symbols: ['☄', '◎', '⋆', '☉', '✴', '◒'],
  names: ['Comet', 'Rings', 'Star', 'Planet', 'Supernova', 'Moon'],
  lines: Array.from({ length: 100 }, (_, index) => {
    const route = (index * 37 + 21) % 1024;
    return Array.from({ length: 5 }, (_, column) => Math.floor(route / 4 ** column) % 4);
  }),
  multipliers: [1, 1, 2, 3, 5, 7],
  points: [9, 8, 7, 6, 5, 4],
  accentNotes: [165, 220, 277, 330, 440],
  bonus: ({ grid }) => grid.at(-1).every(symbol => symbol === 0) ? 40 : 0,
};
