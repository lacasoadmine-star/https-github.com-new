// Independently authored implementations of public player-facing rules.
// Symbol weights, card probabilities and the three-gamble limit are operator
// choices. They are not recovered provider reel strips, RNG or certified RTP.
import {active, baseRound, draw, error, publicBase} from './engines/shared.mjs';

export function startThreeReelSlot(d, {betMinor, rng}) {
  if (d.cols !== 3 || d.symbols.length !== 8 || d.wildSymbol) error('INVALID_MODEL', 'This operator engine requires three reels and eight regular symbols.');
  const round=baseRound(d,betMinor);
  const grid=Array.from({length:d.rows},()=>Array.from({length:3},()=>d.symbols[draw(rng,8)].id));
  const lineWins=[];let total=0n;
  for(const [lineIndex,line] of d.paylines.entries()) {
    const id=grid[line[0]][0];
    if(!line.every((row,col)=>grid[row][col]===id))continue;
    const prize=d.symbols.find(symbol=>symbol.id===id).pays[3];
    const win=BigInt(round.betMinor)*BigInt(prize)/BigInt(d.paylines.length);total+=win;
    lineWins.push({lineIndex,payline:[...line],symbolId:id,matches:3,multiplier:prize,winMinor:win.toString(),positions:line.map((row,col)=>({row,col}))});
  }
  const reelMultiplier=d.multiplierValues?d.multiplierValues[draw(rng,d.multiplierValues.length)]:1;
  total*=BigInt(reelMultiplier);
  for(const line of lineWins)line.winMinor=(BigInt(line.winMinor)*BigInt(reelMultiplier)).toString();
  if(total>BigInt(d.limits.maxWinMinor))error('PAYOUT_LIMIT_EXCEEDED','The configured three-reel award exceeds its accepted bound.');
  return {...round,status:total===0n?'lost':'collected',step:1,winMinor:total.toString(),
    multiplierBps:Number(total*10000n/BigInt(round.betMinor)),outcome:{kind:'slots',grid,lineWins,...(d.multiplierValues?{reelMultiplier}:{})}};
}

export function evaluatePublicWildGrid(d, betMinor, suppliedGrid) {
  const wild = d.wildSymbol.id;
  if (!Array.isArray(suppliedGrid) || suppliedGrid.length !== d.rows || suppliedGrid.some(row =>
    !Array.isArray(row) || row.length !== d.cols || row.some((id, col) =>
      id === wild ? !d.wildRule.columns.includes(col) : !d.symbols.some(symbol => symbol.id === id) && !(d.blockerSymbols??[]).includes(id)))) {
    error('INVALID_GRID', 'The grid must use the configured geometry and permitted wild columns.');
  }
  const grid = structuredClone(suppliedGrid);
  const lineWins = [];
  let total = 0n;
  for (let lineIndex = 0; lineIndex < d.paylines.length; lineIndex++) {
    const line = d.paylines[lineIndex];
    let best;
    for (const symbol of d.symbols) {
      let matches = 0;
      while (matches < d.cols && [symbol.id, wild].includes(grid[line[matches]][matches])) matches++;
      const prize = symbol.pays[matches];
      if (!Number.isSafeInteger(prize) || prize <= 0) continue;
      const win = BigInt(betMinor) * BigInt(prize) / BigInt(d.paylines.length);
      if (!best || win > best.win || (win === best.win && prize > best.multiplier)) {
        const positions = line.slice(0, matches).map((row, col) => ({row, col}));
        best = {win, lineIndex, payline: [...line], symbolId: symbol.id, matches, multiplier: prize,
          winMinor: win.toString(), positions,
          wildPositions: positions.filter(({row, col}) => grid[row][col] === wild)};
      }
    }
    if(d.wildSymbol.pays?.[d.cols]&&line.every((row,col)=>grid[row][col]===wild)) {
      const prize=d.wildSymbol.pays[d.cols],win=BigInt(betMinor)*BigInt(prize)/BigInt(d.paylines.length);
      if(!best||win>best.win||(win===best.win&&prize>best.multiplier)) {
        const positions=line.map((row,col)=>({row,col}));
        best={win,lineIndex,payline:[...line],symbolId:wild,matches:d.cols,multiplier:prize,
          winMinor:win.toString(),positions,wildPositions:positions};
      }
    }
    if (best) { const {win, ...visible} = best; total += win; lineWins.push(visible); }
  }
  return {winMinor: total.toString(), lineWins};
}

export function startPublicWildSlot(d, {betMinor, rng}) {
  const round = baseRound(d, betMinor);
  // Each regular symbol receives 32 independent tickets; wild receives one.
  // These probabilities are operator choices, not the provider's reel strips.
  const regularCount=d.symbols.length,regularTickets=regularCount*32;
  const originalGrid = Array.from({length: d.rows}, () => Array.from({length: d.cols}, (_, col) => {
    const eligible = d.wildRule.columns.includes(col);
    const ticket = draw(rng, eligible ? regularTickets+1 : regularCount);
    return eligible && ticket === regularTickets ? d.wildSymbol.id : d.symbols[ticket % regularCount].id;
  }));
  let evaluated = evaluatePublicWildGrid(d, round.betMinor, originalGrid);
  const expandedColumns = d.wildRule.expandWhenWinning
    ? [...new Set(evaluated.lineWins.flatMap(line => line.wildPositions.map(position => position.col)))].sort((a, b) => a - b)
    : [];
  const grid = originalGrid.map(row => row.map((id, col) => expandedColumns.includes(col) ? d.wildSymbol.id : id));
  if (expandedColumns.length) evaluated = evaluatePublicWildGrid(d, round.betMinor, grid);
  const reelMultiplier = d.multiplierValues[draw(rng, d.multiplierValues.length)];
  const winMinor = (BigInt(evaluated.winMinor) * BigInt(reelMultiplier)).toString();
  const lineWins = evaluated.lineWins.map(line => ({...line,
    winMinor: (BigInt(line.winMinor) * BigInt(reelMultiplier)).toString()}));
  if (BigInt(winMinor) > BigInt(d.limits.maxWinMinor)) error('PAYOUT_LIMIT_EXCEEDED', 'The configured wild award exceeds its accepted bound.');
  return {...round, status: winMinor === '0' ? 'lost' : 'collected', step: 1, winMinor,
    multiplierBps: Number(BigInt(winMinor) * 10000n / BigInt(round.betMinor)),
    outcome: {kind: 'slots', grid, originalGrid, expandedColumns, lineWins, reelMultiplier}};
}

export function holdSlotWin(d, round, holdWin) {
  if (!d.gamble?.enabled || !holdWin) return round;
  const baseWinMinor = round.winMinor;
  return {...round, holdWin: true, baseWinMinor, gambleRounds: 0, gambleHistory: [],
    pendingWinMinor: baseWinMinor, winMinor: '0',
    status: baseWinMinor === '0' ? 'lost' : 'active'};
}

export function gambleSlotWin(d, round, {color}, rng) {
  active(round);
  if (!d.gamble?.enabled || round.holdWin !== true || !d.gamble.choices.includes(color)) {
    error('INVALID_GAMBLE', 'Choose red or black for the current held win.');
  }
  if (round.gambleRounds >= d.gamble.maxRounds || BigInt(round.pendingWinMinor) <= 0n) {
    error('GAMBLE_LIMIT', 'This held win cannot be gambled again.');
  }
  const revealedColor = d.gamble.choices[draw(rng, d.gamble.choices.length)];
  const correct = color === revealedColor;
  const pendingWinMinor = correct ? (BigInt(round.pendingWinMinor) * 2n).toString() : '0';
  const gambleRounds = round.gambleRounds + 1;
  const gambleHistory = [...round.gambleHistory, {round: gambleRounds, color, revealedColor, correct,
    pendingBeforeMinor: round.pendingWinMinor, pendingAfterMinor: pendingWinMinor}];
  const next = {...round, pendingWinMinor, gambleRounds, gambleHistory,
    multiplierBps: Number(BigInt(pendingWinMinor) * 10000n / BigInt(round.betMinor))};
  if (!correct) return {...next, status: 'lost', winMinor: '0'};
  return gambleRounds === d.gamble.maxRounds ? collectSlotWin(d, next) : next;
}

export function collectSlotWin(d, round) {
  active(round);
  if (!d.gamble?.enabled || round.holdWin !== true || BigInt(round.pendingWinMinor) <= 0n) {
    error('INVALID_GAMBLE', 'No held slot win is available.');
  }
  return {...round, status: 'collected', winMinor: round.pendingWinMinor, pendingWinMinor: '0'};
}

export function validateHeldSlot(d, round, baseMaximumMinor) {
  if (round.holdWin !== true) {
    if (round.status === 'active') error('INVALID_ROUND', 'An active slot requires an accepted held win.');
    return;
  }
  const canonical = value => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
  if (!d.gamble?.enabled || !canonical(round.pendingWinMinor) || !canonical(round.baseWinMinor) ||
      BigInt(round.baseWinMinor) > BigInt(baseMaximumMinor) || !Number.isSafeInteger(round.gambleRounds) ||
      round.gambleRounds < 0 || round.gambleRounds > d.gamble.maxRounds ||
      !Array.isArray(round.gambleHistory) || round.gambleHistory.length !== round.gambleRounds) {
    error('INVALID_ROUND', 'The stored held-win state is invalid.');
  }
  let pending = round.baseWinMinor;
  for (const [index, entry] of round.gambleHistory.entries()) {
    if (!entry || entry.round !== index + 1 || !d.gamble.choices.includes(entry.color) ||
        !d.gamble.choices.includes(entry.revealedColor) || entry.correct !== (entry.color === entry.revealedColor) ||
        entry.pendingBeforeMinor !== pending || pending === '0' ||
        entry.pendingAfterMinor !== (entry.correct ? (BigInt(pending) * 2n).toString() : '0')) {
      error('INVALID_ROUND', 'The stored gamble history is inconsistent.');
    }
    pending = entry.pendingAfterMinor;
  }
  if (round.status === 'active') {
    if (pending === '0' || round.pendingWinMinor !== pending || round.gambleRounds >= d.gamble.maxRounds) {
      error('INVALID_ROUND', 'The active held award is inconsistent.');
    }
  } else if (round.pendingWinMinor !== '0' ||
    (round.status === 'collected' && (pending === '0' || round.winMinor !== pending)) ||
    (round.status === 'lost' && pending !== '0')) error('INVALID_ROUND', 'The settled held award is inconsistent.');
}

export function publicHeldSlot(d, round) {
  const activeWin = round.status === 'active' && round.holdWin === true;
  return {...publicBase(round), outcome: structuredClone(round.outcome), holdWin: round.holdWin === true,
    pendingWinMinor: round.pendingWinMinor ?? '0', collectibleMinor: activeWin ? round.pendingWinMinor : '0',
    gambleRounds: round.gambleRounds ?? 0, maxGambleRounds: d.gamble.maxRounds,
    gambleHistory: structuredClone(round.gambleHistory ?? []),
    allowedActions: activeWin ? ['gamble', 'collect'] : []};
}
