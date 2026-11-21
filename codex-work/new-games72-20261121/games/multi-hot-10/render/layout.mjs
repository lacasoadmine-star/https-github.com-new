/** Coordinates measured from this game's current 1363x936 landscape capture.
 * The provider header occupies 26px; the game stage is 1363x768 below it.
 * Layout coordinates and sprite geometry remain independent from wager math.
 */
export const STAGE = Object.freeze({ width: 1363, height: 1363 * 1220 / 2170 });
export const GRID = Object.freeze({ x: 337, y: 216, width: 670, height: 402, reels: 5, rows: 3, cell: 134 });
export const BOX = Object.freeze({ x: 329, y: 208, width: 686, height: 419 });
export const CONTROL_RECTS = Object.freeze({
  spin: Object.freeze({ x: 1136, y: 295, width: 160, height: 160 }),
  auto: Object.freeze({ x: 1177, y: 202, width: 80, height: 80 }),
  bet: Object.freeze({ x: 1175, y: 469, width: 80, height: 80 }),
  quick: Object.freeze({ x: 1268, y: 258, width: 51, height: 60 }),
  take: Object.freeze({ x: 1184, y: 560, width: 67, height: 67 }),
  gamble: Object.freeze({ x: 1184, y: 122, width: 67, height: 67 }),
  menu: Object.freeze({ x: 29, y: 664, width: 57, height: 58 }),
  sound: Object.freeze({ x: 1280, y: 665, width: 53, height: 57 }),
});
export const FOOTERS = Object.freeze({
  balance: Object.freeze({ x: 378, y: 662, width: 167, height: 52 }),
  win: Object.freeze({ x: 588, y: 660, width: 174, height: 55 }),
  bet: Object.freeze({ x: 806, y: 662, width: 167, height: 52 }),
});
export function viewportTransform(width, height) {
  const scale = Math.min(width / STAGE.width, height / STAGE.height);
  return { scale, width: STAGE.width * scale, height: STAGE.height * scale,
    x: (width - STAGE.width * scale) / 2, y: (height - STAGE.height * scale) / 2 };
}
export function contains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height;
}
export function clipReel(index) {
  if (!Number.isInteger(index) || index < 0 || index >= GRID.reels) throw new RangeError('Invalid reel');
  return { x: GRID.x + index * GRID.cell, y: GRID.y, width: GRID.cell, height: GRID.height };
}
