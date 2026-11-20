export default {
  slug: 'copper-crossroads', title: 'Copper Crossroads', theme: 'copper', previewOnly: true,
  description: 'Match rail symbols along six routes. A winning crossing and a straight route together award a 19-point junction bonus.',
  columns: 3, rows: 3,
  symbols: ['⊞', '⊙', '⎔', '⌖', '◆', '✚'],
  names: ['Track', 'Wheel', 'Bolt', 'Switch', 'Copper Ore', 'Signal'],
  lines: [
    [0, 0, 0], [1, 1, 1], [2, 2, 2],
    [0, 1, 2], [2, 1, 0], [0, 2, 0],
  ],
  multipliers: [1, 1, 2, 3, 4, 4],
  points: [5, 8, 7, 12, 13, 11],
  accentNotes: [220, 262, 349],
  bonus: ({ lines }) => lines.some(line => line < 3) && (lines.includes(3) || lines.includes(4)) ? 19 : 0,
};
