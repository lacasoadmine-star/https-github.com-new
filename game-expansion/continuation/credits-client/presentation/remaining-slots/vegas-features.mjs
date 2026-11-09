import {validGrid, minorMoney} from '../machine-renderer.mjs';

// Vegas-only, display-only adaptation of an accepted receipt. The public demo
// defines the Wild factors, but this badge layout is authored locally. No
// provider timeline, probability law, result or wallet operation is supplied.
const ID = 'vegasnights_native';
const MINOR = /^(0|[1-9]\d{0,18})$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const money = value => typeof value === 'string' && MINOR.test(value);
const sameGrid = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((column, c) => Array.isArray(column) && Array.isArray(b[c]) && column.length === b[c].length && column.every((symbol, r) => symbol === b[c][r]));
const roundIdentity = round => [round.gameId, round.game_id].filter(value => value !== undefined);

export function vegasReceiptDisplay(manifest, snapshot = {}, {motion = null} = {}) {
  if (manifest?.id !== ID || snapshot.confirmed !== true || snapshot.authenticated !== true) return null;
  const round = snapshot.round;
  if (!object(round) || !['active', 'settled'].includes(round.status)) return null;
  const ids = roundIdentity(round);
  if (!ids.length || ids.some(id => id !== ID)) return null;
  const index = snapshot.frameIndex ?? null;
  const frames = Array.isArray(round.frames) ? round.frames : Array.isArray(round.bonusFrames) ? round.bonusFrames : [];
  if (frames.length > 4096 || index !== null && (!Number.isInteger(index) || index < 0 || index >= frames.length)) return null;
  let frame = index === null ? null : frames[index];
  if (index === null) {
    // An omitted middle section must not make the last retained frame stand in
    // for the final board. The explicit finalFrame is useful on long receipts.
    const candidates = [round.finalFrame, frames.at(-1)];
    frame = candidates.find(candidate => object(candidate) && sameGrid(candidate.grid, round.grid)) ?? null;
  }
  const grid = index === null ? round.grid : frame?.grid;
  if (!validGrid(grid, manifest)) return null;
  const final = index === null;
  const amount = final ? round.status === 'settled' ? round.payoutMinor : round.currentCashoutMinor : frame?.payoutMinor;
  if (!money(amount)) return null;
  const awaiting = snapshot.pending === true && final || motion?.pending === true;
  const moving = Boolean(motion && motion.complete !== true);
  const stage = !awaiting && frame?.kind === 'free-spin' ? 'FREE SPIN' : !awaiting && frame?.kind === 'extra-wild-respin' ? 'EXTRA WILDS' : null;
  const factors = [];
  if (!awaiting && object(frame?.wildMultipliers)) {
    for (const [cell, factor] of Object.entries(frame.wildMultipliers)) {
      const match = /^([1-4]):([0-2])$/.exec(cell);
      if (!match || ![2, 3].includes(factor)) return null;
      const column = Number(match[1]), row = Number(match[2]), symbol = grid[column][row];
      // Converted royal chips never receive the free-spin Wild factor.
      if (symbol !== 'wild' && !(symbol === 'gold' && column === 4)) return null;
      const reel = motion?.reels?.find(reel => reel.column === column);
      if (!motion || reel?.settled === true) factors.push({column, row, factor});
    }
  }
  return {
    kind: 'accepted-vegas-display', frameIndex: index, final, stage,
    winLabel: final ? 'WIN' : 'FRAME WIN',
    payoutMinor: amount, cash: awaiting || moving ? '—' : minorMoney(amount),
    amountRevealed: !awaiting && !moving, factors,
    presentationBasis: 'Accepted frame data; authored badge and caption layout',
  };
}

// Call after reel-motion composition so factors never sit on a moving reel.
// Only the Vegas WIN area and additive badges change. Controls, source art,
// balance and the entire receipt remain untouched.
export function decorateVegasReceiptScene(scene, manifest, snapshot = {}, options = {}) {
  if (scene?.gameId !== ID || manifest?.id !== ID || !Array.isArray(scene.commands)) return scene;
  const display = vegasReceiptDisplay(manifest, snapshot, options);
  if (!display) return scene;
  const center = scene.width / 2, geometry = scene.gridGeometry;
  const commands = scene.commands.map(command => {
    if (command.type === 'text' && command.x === center && command.y === 1135 && command.text === 'WIN') return {...command, text: display.winLabel, role: 'vegas-win-label'};
    if (command.type === 'text' && command.x === center && command.y === 1190) return {...command, text: display.cash + ' ETB', role: 'vegas-win-amount'};
    return command;
  });
  if (display.stage) {
    commands.push({type: 'text', text: display.stage, x: center, y: 1084, size: 28, color: '#fff3c4', align: 'center', role: 'vegas-stage'});
  }
  if (geometry) for (const cell of display.factors) {
    const x = geometry.x + cell.column * (geometry.cellWidth + (geometry.columnGap || 0)), y = geometry.y + cell.row * geometry.cellHeight;
    const box = {x: x + geometry.cellWidth - 64, y: y + 8, width: 56, height: 42};
    commands.push({type: 'rect', box, color: '#160e2ee8', role: 'vegas-wild-factor-backdrop', column: cell.column, row: cell.row});
    commands.push({type: 'text', text: '×' + cell.factor, x: box.x + box.width / 2, y: box.y + 31, size: 34, color: '#ffe56d', align: 'center', role: 'vegas-wild-factor', column: cell.column, row: cell.row});
  }
  return {...scene, commands, vegasReceiptDisplay: display};
}
