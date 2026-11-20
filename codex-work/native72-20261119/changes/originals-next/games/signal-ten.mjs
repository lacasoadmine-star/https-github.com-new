export default {
  slug: 'signal-ten', title: 'Signal Ten', theme: 'signal',
  description: 'Connect signals on ten routes. Fill the middle reel with antennas to earn a relay bonus.',
  columns: 5, rows: 3,
  symbols: ['⌘', '⚡', '⊙', '□', '✳', 'ϟ'],
  names: ['Antenna', 'Spark', 'Dial', 'Screen', 'Frequency', 'Wave'],
  lines: [
    [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [1, 0, 1, 2, 1],
    [1, 2, 1, 0, 1], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [0, 1, 1, 1, 2],
  ],
  multipliers: [1, 1, 2, 2, 3, 4],
  points: [15, 11, 8, 6, 4, 4],
  accentNotes: [294, 349, 440, 523, 587],
  bonus: ({ grid }) => grid[2].every(symbol => symbol === 0) ? 18 : 0,
};
