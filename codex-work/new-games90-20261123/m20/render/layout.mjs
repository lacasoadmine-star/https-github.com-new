// Independently measured from own current before-spin, win and control images.
// Evidence coordinates are1363x936; provider top strip ends at y26, canvas at y792.
export const VIEW = Object.freeze({ width: 1363, height: 766, header: 26, referenceHeight: 936 });
export const REELS = Object.freeze({ x: 337, y: 216, cell: 134, width: 670, height: 402, columns: 5, rows: 3 });
export const CONTROLS = Object.freeze({
  spin: { x: 1136, y: 295, width: 160, height: 160 },
  auto: { x: 1177, y: 202, width: 80, height: 80 },
  bet: { x: 1175, y: 469, width: 80, height: 80 },
  quick: { x: 1275, y: 269, width: 40, height: 50 },
  take: { x: 1184, y: 562, width: 66, height: 66 },
  double: { x: 1184, y: 123, width: 66, height: 66 },
  menu: { x: 30, y: 670, width: 54, height: 46 },
  sound: { x: 1284, y: 670, width: 48, height: 46 },
});
export const MENU = Object.freeze({ x: 232, y: 142, width: 902, height: 602, headerHeight: 42, footerHeight: 44 });
export const BET_POPUP = Object.freeze({ x: 987, y: 130, width: 366, height: 383 });
export const AUTO_POPUP = Object.freeze({ x: 459, y: 114, width: 450, height: 449 });
export const INITIAL_BOARD = Object.freeze([
  Object.freeze(['watermelon', 'grapes', 'plum', 'cherry', 'cherry']),
  Object.freeze(['grapes', 'cherry', 'orange', 'bell', 'bell']),
  Object.freeze(['watermelon', 'cherry', 'lemon', 'grapes', 'cherry']),
]);
export const SYMBOL_FRAME = Object.freeze({ seven: 'Box/0', bell: 'Box/1', grapes: 'Box/2', watermelon: 'Box/3', cherry: 'Box/4', orange: 'Box/5', plum: 'Box/6', lemon: 'Box/7' });
export function clipForColumn(column) {
  if (!Number.isInteger(column) || column < 0 || column > 4) throw new RangeError('M20_REEL_OUT_OF_RANGE');
  return { x: REELS.x + column * REELS.cell, y: REELS.y, width: REELS.cell, height: REELS.height };
}
