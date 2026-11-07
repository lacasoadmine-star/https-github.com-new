// Independent, unpublished review engines. Public rules/data are cited separately.
// This file contains no provider implementation, production connection or wallet.
import {
  bookPaylinePaths, vegasPaylinePaths, vegasLinePaytable, vegasVisibleReels,
  coin94MultipliersHundredths, legendThresholds,
} from './remaining-reference-data.mjs';

const CAP = 1000000n;
const POINTS = 10000n;
const DEADLINE_MS = 1800000;
const MAX_FRAMES = 24;
const RAW_REVIEW_CAP = 10000000;
const clone = value => structuredClone(value);
const fail = (message, status = 422) => { throw Object.assign(new Error(message), {status}); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clock = value => { if (!Number.isSafeInteger(value) || value < 0) fail('INVALID_ENGINE_TIME', 500); return value; };
const money = value => {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,14})$/.test(value)) fail('INVALID_ENGINE_MONEY', 500);
  return BigInt(value);
};
const checkedStake = value => { const amount = money(value); if (amount < 10n || amount > 10000n) fail('STAKE_OUT_OF_RANGE'); return amount; };
const draw = rng => { const value = rng(); if (!Number.isFinite(value) || value < 0 || value >= 1) fail('INVALID_ENGINE_RANDOM', 500); return value; };
const integer = (rng, max) => Math.floor(draw(rng) * max);
const limited = value => value > CAP ? CAP : value;
const ratio = (numerator, denominator, places = 2) => {
  const scale = 10n ** BigInt(places), scaled = numerator * scale / denominator;
  return `${scaled / scale}.${String(scaled % scale).padStart(places, '0')}`;
};
const weighted = (rng, entries) => {
  let selected = draw(rng) * entries.reduce((sum, item) => sum + item[1], 0);
  for (const [value, weight] of entries) { selected -= weight; if (selected < 0) return value; }
  return entries.at(-1)[0];
};
const choose = (rng, values, count) => {
  const remaining = [...values], output = [];
  while (output.length < count && remaining.length) output.push(remaining.splice(integer(rng, remaining.length), 1)[0]);
  return output;
};
const positions = (columns, rows) => Array.from({length: columns * rows}, (_, index) => [Math.floor(index / rows), index % rows]);
const cellsOf = (grid, id) => grid.flatMap((column, c) => column.flatMap((value, r) => value === id ? [[c, r]] : []));
const cellKey = ([c, r]) => `${c}:${r}`;
const wild = value => value === 'wild' || value === 'royal-wild' || value === 'gold';
const EXCLUDED = new Set(['wild', 'royal-wild', 'scatter', 'magic', 'gold', 'multiplier']);
const normals = config => config.symbols.filter(symbol => !EXCLUDED.has(symbol.id)).map(symbol => symbol.id);
const isWays = id => id === 'moonstone_native' || id === 'samurai_native';
const isLegend = id => id === 'egyptianlegends_native' || id === 'olympianlegends_native';

// These unit scales are deliberately not a new certified/calibrated return.
// The prior calibration predates the public-rule corrections and is invalid.
// Vegas uses its actual public line-bet table without any payout rescaling.
export const slotScales = Object.fromEntries([
  'moonstone_native', 'magicgarden_native', 'bookofmagic_native', 'samurai_native',
  'vegasnights_native', 'egyptianlegends_native', 'olympianlegends_native',
].map(id => [id, {numerator: 1, denominator: 1}]));

// Only Magic Garden still uses this explicitly unverified review geometry.
export const linePaths = [
  [1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2], [0,1,2,1,0], [2,1,0,1,2],
  [0,0,1,0,0], [2,2,1,2,2], [1,0,0,0,1], [1,2,2,2,1], [0,1,1,1,0],
  [2,1,1,1,2], [1,0,1,0,1], [1,2,1,2,1], [0,1,0,1,0], [2,1,2,1,2],
  [1,1,0,1,1], [1,1,2,1,1], [0,0,2,0,0], [2,2,0,2,2], [0,2,2,2,0],
];
const REVIEW_PAY = [[50,250,1000],[25,150,600],[20,100,400],[15,75,300],[10,50,200],[8,35,150],[6,25,100],[5,20,80],[4,15,60],[3,12,50],[2,10,40]];
const EGYPT_MULTIPLIERS = [2,3,4,5,6,8,10,15,20,25,50,100,250,500];
const EGYPT_GODS = ['Bastet', 'Sobek', 'Isis', 'Anubis', 'Horus'];
const OLYMPUS_GODS = ['Poseidon', 'Hecate', 'Atlas', 'Hephaestus', 'Zeus'];

function reviewSymbol(config, rng, column, {normalOnly = false, scatterAllowed = true, free = false} = {}) {
  const entries = normals(config).map((id, index) => [id, isLegend(config.id) ? 7 + index * 1.6 : (4 + index * 1.3) * (free && config.id === 'bookofmagic_native' ? 1 + (index % 3) * 0.05 : 1)]);
  if (!normalOnly) {
    if (!isLegend(config.id)) {
      const allowed = config.id === 'magicgarden_native' ? column >= 1 && column <= 3 : isWays(config.id) ? column >= 2 : true;
      if (allowed) entries.push(['wild', 1.3]);
    }
    if (scatterAllowed && (config.id !== 'magicgarden_native' || [0,2,4].includes(column))) entries.push(['scatter', isLegend(config.id) ? 1.25 : 1.1]);
    if (config.id === 'magicgarden_native' && column === 4) entries.push(['magic', 0.5]);
  }
  return weighted(rng, entries);
}

function gridFor(config, rng, job) {
  if (config.id === 'vegasnights_native') {
    const set = job.mode === 'extra' ? (job.free ? 3 : 1) : job.free ? 2 : 0;
    const ids = normals(config);
    const convert = value => value === 1 ? 'scatter' : value === 2 ? 'wild' : value === 12 ? 'royal-wild' : value === 13 ? 'gold' : ids[value - 3];
    // Public presentation strips are sampled uniformly in this own review model.
    // This is not a claim about the provider server's stop distribution.
    return vegasVisibleReels[`reel_set${set}`].map(reel => {
      const stop = integer(rng, reel.length);
      return Array.from({length: 3}, (_, row) => convert(reel[(stop + row) % reel.length]));
    });
  }
  return Array.from({length: config.columns}, (_, column) => {
    let hasScatter = false;
    return Array.from({length: config.rows}, () => {
      const value = reviewSymbol(config, rng, column, {scatterAllowed: !hasScatter, free: job.free});
      hasScatter ||= value === 'scatter';
      return value;
    });
  });
}

function publicLinePay(config, id, count) {
  if (config.id === 'vegasnights_native') return vegasLinePaytable[String(normals(config).indexOf(id) + 3)]?.[count] || 0;
  if (count < 3) return 0;
  return id === 'wild' ? [100,500,2000][count - 3] : (REVIEW_PAY[normals(config).indexOf(id)] || REVIEW_PAY.at(-1))[count - 3];
}

function lineWins(config, grid, boxMultipliers = null, wildMultipliers = null) {
  const paths = config.id === 'vegasnights_native' ? vegasPaylinePaths : config.id === 'bookofmagic_native' ? bookPaylinePaths : linePaths;
  const wins = [];
  for (const [line, path] of paths.slice(0, config.paylines).entries()) {
    let best = null;
    for (const id of [...normals(config), ...(config.id === 'vegasnights_native' ? [] : ['wild'])]) {
      let count = 0;
      for (let c = 0; c < config.columns; c++) {
        const value = grid[c][path[c]];
        if (value === id || (wild(value) && id !== 'wild')) count++; else break;
      }
      if (count < 3) continue;
      const cells = path.slice(0, count).map((row, c) => [c, row]);
      let factor = 1;
      if (boxMultipliers) factor = Math.max(1, ...cells.map(cell => boxMultipliers.get(cellKey(cell)) || 1));
      if (wildMultipliers) for (const cell of cells) factor *= wildMultipliers.get(cellKey(cell)) || 1;
      if (config.id === 'bookofmagic_native' && id !== 'wild' && cells.some(([c,r]) => grid[c][r] === 'wild')) factor *= 2;
      const points = Math.round(publicLinePay(config, id, count) * 10000 / config.paylines) * factor;
      if (points > 0 && (!best || points > best.points)) best = {symbol: id, count, cells, points, line, factor};
    }
    if (best) wins.push(best);
  }
  return wins;
}

function wayWins(config, grid) {
  const wins = [];
  for (const id of normals(config)) {
    let ways = 1, count = 0, cells = [];
    for (let c = 0; c < config.columns; c++) {
      const found = grid[c].flatMap((value, r) => value === id || value === 'wild' ? [[c,r]] : []);
      if (!found.length) break;
      count++; ways *= found.length; cells.push(...found);
    }
    if (count >= 3) wins.push({symbol: id, count, ways, cells, points: publicLinePay(config, id, count) * ways * 100});
  }
  return wins;
}

function anyWhereWins(config, grid) {
  const wins = [], wildCells = cellsOf(grid, 'wild');
  for (const [rank, id] of normals(config).entries()) {
    const ordinary = cellsOf(grid, id);
    if (!ordinary.length) continue; // Public rule: no all-Wild-only combination.
    const cells = [...ordinary, ...wildCells], count = cells.length;
    if (count >= 8) {
      // Explicitly a review-only table; runtime GetPayTable values are unresolved.
      const band = count >= 12 ? 4 : count >= 10 ? 2 : 1;
      wins.push({symbol: id, count, cells, points: (12 - rank) * band * 1000});
    }
  }
  return wins;
}

function collapse(config, grid, wins, rng, options = {}) {
  const removed = new Set(wins.flatMap(win => win.cells.map(cellKey)));
  return grid.map((column, c) => {
    const locked = new Map(column.flatMap((value,r) => options.stickyMultipliers && value === 'multiplier' ? [[r,value]] : []));
    const kept = column.filter((_, r) => !locked.has(r) && !removed.has(`${c}:${r}`));
    let hasScatter = kept.includes('scatter');
    const replacement = Array.from({length: config.rows - locked.size - kept.length}, () => {
      const value = reviewSymbol(config, rng, c, {...options, scatterAllowed: !hasScatter});
      hasScatter ||= value === 'scatter'; return value;
    });
    const moving = [...replacement, ...kept];
    return Array.from({length:config.rows},(_,r) => locked.has(r) ? locked.get(r) : moving.shift());
  });
}

function attachMoney(raw, payout) {
  const total = BigInt(raw.totalPoints), convert = frame => {
    const framePayout = total > 0n ? payout * BigInt(frame.points) / total : 0n;
    let assigned = 0n;
    const wins = frame.wins.map((win, index) => {
      const amount = index === frame.wins.length - 1 ? framePayout - assigned : frame.points > 0 ? framePayout * BigInt(win.points) / BigInt(frame.points) : 0n;
      assigned += amount; const {points, ...details} = win;
      return {...details, payoutMinor: String(amount)};
    });
    const {points, ...details} = frame;
    return {...details, wins, payoutMinor: String(framePayout)};
  }, frames = raw.frames.map(convert);
  let shown = frames.reduce((sum, frame) => sum + money(frame.payoutMinor), 0n);
  if (raw.totalFrames === frames.length && frames.length && shown < payout) {
    const frame = frames.findLast(item => item.wins.length) || frames.at(-1), difference = payout - shown;
    frame.payoutMinor = String(money(frame.payoutMinor) + difference);
    if (frame.wins.length) frame.wins.at(-1).payoutMinor = String(money(frame.wins.at(-1).payoutMinor) + difference);
    shown = payout;
  }
  const finalFrame = raw.totalFrames === frames.length ? frames.at(-1) : raw.finalFrame ? convert(raw.finalFrame) : null;
  return {frames, finalFrame, omittedFrames: raw.totalFrames - frames.length, omittedPayoutMinor: String(payout - shown)};
}

export const towerXDistribution = [
  {threshold:544250,sum:0},{threshold:694250,sum:25},{threshold:794250,sum:50},
  {threshold:874250,sum:100},{threshold:934250,sum:200},{threshold:969250,sum:500},
  {threshold:995000,sum:1000},{threshold:1000000,sum:5000},
];
const BUILDING_TYPES = [{type:'suburb',min:1,max:5},{type:'city',min:6,max:10},{type:'green',min:15,max:40},{type:'elite',min:50,max:90},{type:'neon',min:100,max:1000}];
function towerXStart(id, stake, rng, now) {
  const roll = integer(rng, 1000000), sum = towerXDistribution.find(outcome => roll < outcome.threshold).sum, floors = [];
  let remaining = sum;
  while (remaining > 0) {
    const type = BUILDING_TYPES.filter(type => type.min <= remaining).at(-1), upper = Math.min(type.max, remaining);
    const value = floors.length > 16 ? upper : type.min + integer(rng, upper - type.min + 1);
    floors.push({level: floors.length + 1, type: type.type, multiplier: value}); remaining -= value;
  }
  const payout = limited(stake * BigInt(sum) / 100n);
  return {gameId:id,stakeMinor:String(stake),status:'settled',expiresAt:now,payoutMinor:String(payout),family:'tower',floors,frames:floors.map(floor=>({floor,kind:'building',multiplier:floor.multiplier})),totalBuildingMultiplier:sum,baseUnitsPerStake:100,feature:'Umbrella jump',actions:[]};
}

function finish(state, payout, reason) {
  return {...state,status:'settled',payoutMinor:String(limited(payout)),currentCashoutMinor:String(limited(payout)),actions:[],reason};
}

// Frozen continuation has q=1/2 and a 1.5x successful floor. Its guaranteed
// full bank creates option value. Account for that value BEFORE awarding the
// bonus instead of pretending that a protected floor is a fair-risk step.
export function towerFrozenValue(current, bank) {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(bank) || current < bank || bank < 0 || current > 1000000) fail('INVALID_TOWER_VALUE',500);
  const next = Math.min(1000000, Math.floor(current * 1.5));
  if (next <= current || current >= bank * 2 || bank === 0) return current;
  return Math.max(current, 0.5 * towerFrozenValue(next, bank) + 0.5 * bank);
}
function towerRushStart(id, stake, now) {
  return {gameId:id,stakeMinor:String(stake),status:'active',expiresAt:now+DEADLINE_MS,family:'tower',level:0,floors:[],currentCashoutMinor:String(stake),lockedPayoutMinor:'0',frozen:false,actions:['step','cashout'],feature:'Build a floor or collect the unused stake.'};
}
function towerRushAction(state, input, rng) {
  if (input.type === 'cashout') return finish(state,money(state.currentCashoutMinor),'collected');
  if (input.type !== 'step') fail('INVALID_TOWER_ACTION');
  const current = money(state.currentCashoutMinor), bank = money(state.lockedPayoutMinor);
  let kind = 'normal', multiplier = 1.5, next = limited(current * 3n / 2n), section = null, extraFloors = [];
  if (!state.frozen) {
    kind = weighted(rng,[['normal',88],['frozen',4],['temple',4],['triple',4]]);
    multiplier = 1.25; next = limited(current * 5n / 4n);
    if (kind === 'temple') {
      section = [1.5,1.5,2,2,3,3,5,5,7,'freeze'][integer(rng,10)];
      if (section !== 'freeze') { next = limited(next * BigInt(Math.round(section * 100)) / 100n); multiplier *= section; }
    }
    if (kind === 'triple') {
      // Three ADDITIONAL guaranteed floors, each publicly permitted >=1x.
      extraFloors = [1.25,1.25,1.25];
      for (const factor of extraFloors) { next = limited(next * 5n / 4n); multiplier *= factor; }
    }
  }
  const freezes = kind === 'frozen' || section === 'freeze';
  const nextValue = freezes ? towerFrozenValue(Number(next),Number(next)) : Number(next);
  const probability = state.frozen ? 0.5 : (state.level === 0 ? Number(current) * 0.97 : Number(current)) / nextValue;
  if (draw(rng) >= probability) return finish({...state,feature:'Floor collapsed'},bank,'collapsed');
  const nextBank = freezes ? next : bank, level = state.level + 1 + extraFloors.length;
  const floors = [...state.floors,{level:state.level+1,type:kind,multiplier:state.frozen?1.5:1.25,...(section!==null?{wheelSection:section}: {})}];
  for (const [index,factor] of extraFloors.entries()) floors.push({level:state.level+2+index,type:'triple-additional',multiplier:factor});
  const updated = {...state,level,floors,currentCashoutMinor:String(next),lockedPayoutMinor:String(nextBank),frozen:state.frozen||freezes,feature:freezes?'Frozen Floor: the full current win is protected':kind==='temple'?`Temple Floor: ${section}×`:kind==='triple'?'Triple Build: three additional floors':'New floor'};
  return next >= CAP ? finish(updated,next,'limit-collected') : updated;
}

export const mineChoices = Object.keys(coin94MultipliersHundredths).map(Number);
export function mineBoostActive(mines, opened) {
  return mines === 3 ? opened >= 18 : mines === 5 ? opened >= 1 : [7,10,17,20].includes(mines);
}
export function minesPayout(stake, mines, safeCount) {
  const table = coin94MultipliersHundredths[String(mines)];
  if (!table || !Number.isInteger(safeCount) || safeCount < 0 || safeCount > table.length) fail('INVALID_MINES_STATE',500);
  return safeCount === 0 ? stake : limited(stake * BigInt(table[safeCount-1]) / 100n);
}
export function mineSafeProbability(mines, opened) {
  const table = coin94MultipliersHundredths[String(mines)];
  if (!table || !Number.isInteger(opened) || opened < 0 || opened >= table.length) fail('INVALID_MINES_STATE',500);
  const baseline = (25 - mines - opened) / (25 - opened);
  if (!mineBoostActive(mines, opened)) return {baseline,probability:baseline,boostActive:false};
  let survival = 1;
  for (let k=0;k<opened;k++) {
    const base=(25-mines-k)/(25-k);
    const chance=mineBoostActive(mines,k)?Math.max(base,Math.min(1,(94/table[k])/survival)):base;
    survival*=chance;
  }
  // This own rescue rule targets94% before cent rounding/caps. The table
  // itself is the public94 variant; non-boost fixed-count returns vary.
  const probability = Math.max(baseline,Math.min(1,(94/table[opened])/survival));
  return {baseline,probability,boostActive:true};
}
function minesStart(id, stake, options, now) {
  const count = options.mines === undefined ? 3 : options.mines;
  if (!Number.isInteger(count) || !mineChoices.includes(count)) fail('INVALID_MINE_COUNT');
  return {gameId:id,stakeMinor:String(stake),status:'active',expiresAt:now+DEADLINE_MS,family:'mines',columns:5,rows:5,mines:count,picks:[],currentCashoutMinor:String(stake),boardPredetermined:false,treasureBoost:{active:mineBoostActive(count,0),rescuedPicks:0},actions:['pick','cashout']};
}
function minesAction(state,input,rng) {
  if (input.type === 'cashout') return finish(state,money(state.currentCashoutMinor),'collected');
  if (input.type !== 'pick' || !Number.isInteger(input.index) || input.index < 0 || input.index > 24) fail('INVALID_MINE_PICK');
  if (state.picks.some(pick=>pick.index===input.index)) fail('TILE_ALREADY_REVEALED',409);
  const odds = mineSafeProbability(state.mines,state.picks.length), roll = draw(rng), safe = roll < odds.probability;
  const rescued = safe && odds.boostActive && roll >= odds.baseline;
  const picks = [...state.picks,{index:input.index,safe,...(rescued?{treasureBoost:true}:{})}];
  if (!safe) return finish({...state,picks},0n,'mine');
  const payout = minesPayout(money(state.stakeMinor),state.mines,picks.length);
  const next = {...state,picks,currentCashoutMinor:String(payout),treasureBoost:{active:mineBoostActive(state.mines,picks.length),rescuedPicks:state.treasureBoost.rescuedPicks+(rescued?1:0)}};
  return picks.length === coin94MultipliersHundredths[String(state.mines)].length || payout >= CAP ? finish(next,payout,'all-safe') : next;
}

export function createRemainingEngine(configs) {
  const configById = Object.fromEntries(configs.map(config=>[config.id,config]));
  const known = configs.filter(config=>!['darkhorus_native','assassins_native'].includes(config.id));

  function sampleRawSlot(id,rng,{record=true,maxRawPoints=RAW_REVIEW_CAP}={}) {
    const config = configById[id];
    if (!slotScales[id] || !Number.isSafeInteger(maxRawPoints) || maxRawPoints < 1) fail('UNSUPPORTED_SLOT');
    let totalPoints=0,totalFrames=0,bonusSpins=0,feature='',finalGrid=[],finalFrame=null,progress=0,bonusProgress=0;
    const featureEvents=[];
    const frames=[],queue=[{kind:'base',mode:'base',free:false}];
    const capped=()=>totalPoints>=maxRawPoints;
    const addFrame=(grid,wins,details={})=>{
      const points=wins.reduce((sum,win)=>sum+win.points,0);
      totalPoints+=points;totalFrames++;finalGrid=clone(grid);
      const frame={grid:clone(grid),wins:clone(wins),points,multiplier:1,...details};
      finalFrame=frame;
      if(record&&frames.length<MAX_FRAMES)frames.push(frame);
      return frame;
    };
    const addSpins=(count,free=true)=>{bonusSpins+=count;for(let n=0;n<count;n++)queue.push({kind:'free-spin',mode:'base',free});feature=`${bonusSpins} free spins awarded`;};
    for(let spin=0;spin<queue.length&&!capped();spin++) {
      const job=queue[spin];let grid=gridFor(config,rng,job);
      if(isLegend(id)) {
        let currentProgress=job.free?bonusProgress:0,earnedIndex=0;
        while(legendThresholds[earnedIndex%5]+110*Math.floor(earnedIndex/5)<=currentProgress)earnedIndex++;
        const earned=[];
        const updateProgress=wins=>{
          currentProgress+=new Set(wins.flatMap(win=>win.cells.map(cellKey))).size;
          while(legendThresholds[earnedIndex%5]+110*Math.floor(earnedIndex/5)<=currentProgress){earned.push(earnedIndex%5);earnedIndex++;}
        };
        const cascade=(kind,modify=null,{trackProgress=false,normalOnly=false,stickyMultipliers=false,detail={}}={})=>{
          let index=0;
          while(!capped()) {
            const before=modify?.before?.(grid,index)||{};
            let wins=anyWhereWins(config,grid);
            if(modify?.wins)wins=modify.wins(wins,grid,index);
            addFrame(grid,wins,{kind,cascade:index,feature:detail.god||feature,...detail,...before});
            if(!wins.length)break;
            if(trackProgress)updateProgress(wins);
            modify?.after?.(wins,grid,index);
            if(capped())break;
            grid=collapse(config,grid,wins,rng,{normalOnly,stickyMultipliers});index++;
          }
        };
        cascade(job.kind,null,{trackProgress:true});
        const featureNormalPositions=()=>positions(6,5).filter(([c,r])=>grid[c][r]!=='scatter');
        for(const stage of earned) {
          if(capped())break;
          const god=(id==='egyptianlegends_native'?EGYPT_GODS:OLYMPUS_GODS)[stage];feature=god;
          featureEvents.push({god,stage:stage+1,progress:currentProgress,spin:job.kind});
          if(id==='olympianlegends_native') {
            const ids=normals(config),factor=weighted(rng,(job.free?[2,3,5,7,10,20,50]:[1,2,3,5,7,10,20]).map((v,i)=>[v,[60,20,10,5,3,1,1][i]]));
            if(stage===0){const low=new Set(ids.slice(4));grid=collapse(config,grid,[{cells:positions(6,5).filter(([c,r])=>low.has(grid[c][r]))}],rng,{normalOnly:true});}
            if(stage===1)for(const[c,r]of choose(rng,featureNormalPositions(),2+integer(rng,4)))grid[c][r]='wild';
            if(stage===2){
              // Exact block dimensions are a recorded public-reference gap.
              const chosen=ids[integer(rng,ids.length)],left=integer(rng,4),top=integer(rng,3);
              for(let c=left;c<left+3;c++)for(let r=top;r<top+3;r++)if(grid[c][r]!=='scatter')grid[c][r]=chosen;
            }
            if(stage===3)for(const c of choose(rng,[0,1,2,3,4,5],3+integer(rng,4))){
              const kept=grid[c].filter(value=>value==='wild'||value==='scatter');
              grid[c]=[...Array.from({length:5-kept.length},()=>reviewSymbol(config,rng,c,{normalOnly:true})),...kept];
            }
            if(stage===4){const visible=[...new Set(grid.flat().filter(value=>ids.includes(value)))];if(visible.length){const chosen=visible[integer(rng,visible.length)];grid=grid.map(col=>col.map(value=>value===chosen?'wild':value));}}
            cascade('mythic-feature',{wins:wins=>wins.map(win=>({...win,points:win.points*factor}))},{detail:{god,stage:stage+1,multiplier:factor,progress:currentProgress}});
          } else {
            const orbValues=new Map(),cellMultipliers=new Map();
            let bar=stage===4?weighted(rng,[1,2,3,4,5,6,7,8,10,50,100,250,500].map((value,index)=>[value,Math.max(1,45-index*4)])):1;
            const placeOrbs=()=>{
              for(const[c,r]of choose(rng,featureNormalPositions().filter(([c,r])=>grid[c][r]!=='multiplier'),1+integer(rng,3))){grid[c][r]='multiplier';orbValues.set(`${c}:${r}`,weighted(rng,EGYPT_MULTIPLIERS.map((v,i)=>[v,Math.max(1,40-i*3)])));}
            };
            if(stage===3)for(const cell of choose(rng,featureNormalPositions(),2+integer(rng,5)))cellMultipliers.set(cellKey(cell),2);
            if(stage===4){const ids=normals(config),visible=[...new Set(grid.flat().filter(value=>ids.includes(value)))];if(visible.length){const chosen=visible[integer(rng,visible.length)];grid=grid.map(col=>col.map(value=>value===chosen?'wild':value));}}
            const startPoints=totalPoints,startFrame=frames.length;
            const modifier={
              before:()=>{
                if(stage<=2){
                  if(stage!==1){grid=grid.map(col=>col.map((value)=>value==='multiplier'?normals(config)[integer(rng,normals(config).length)]:value));orbValues.clear();}
                  placeOrbs();if(stage===0)bar+=Array.from(orbValues.values()).reduce((a,b)=>a+b,0);
                }
                return {multiplier:bar,multiplierSymbols:Object.fromEntries(orbValues),...(stage===3?{cellMultipliers:Object.fromEntries(cellMultipliers)}:{})};
              },
              wins:wins=>wins.map(win=>{
                const factor=stage===0||stage===4?bar:stage===2?Math.max(1,Array.from(orbValues.values()).reduce((a,b)=>a+b,0)):stage===3?Math.max(1,win.cells.reduce((sum,cell)=>sum+(cellMultipliers.get(cellKey(cell))||0),0)):1;
                return {...win,points:win.points*factor,factor};
              }),
              after:wins=>{if(stage===3)for(const key of new Set(wins.flatMap(win=>win.cells.map(cellKey))))if(cellMultipliers.has(key))cellMultipliers.set(key,cellMultipliers.get(key)+1);},
            };
            cascade('mythic-feature',modifier,{stickyMultipliers:stage===1,detail:{god,stage:stage+1,progress:currentProgress}});
            if(stage===1){
              const factor=Math.max(1,Array.from(orbValues.values()).reduce((a,b)=>a+b,0));
              totalPoints+=(totalPoints-startPoints)*(factor-1);
              for(const frame of frames.slice(startFrame)){frame.points*=factor;frame.multiplier=factor;for(const win of frame.wins)win.points*=factor;}
              if(finalFrame&&!frames.includes(finalFrame)){finalFrame.points*=factor;finalFrame.multiplier=factor;for(const win of finalFrame.wins)win.points*=factor;}
            }
          }
        }
        if(job.free)bonusProgress=currentProgress;
        progress=currentProgress;
        const scatters=cellsOf(grid,'scatter').length;
        if(id==='egyptianlegends_native') {
          // Only the Bonus Game scatter table was verified. The unknown base
          // scatter prize remains a documented, production-blocking gap.
          const count=Math.min(scatters,6),scatterPoints=job.free?({4:3,5:5,6:100}[count]||0)*10000:0;
          if(scatterPoints)addFrame(grid,[{symbol:'scatter',count,cells:cellsOf(grid,'scatter'),points:scatterPoints}],{kind:'scatter-award'});
          if(job.free&&scatters>=3)addSpins({3:2,4:3,5:5,6:10}[count]);
          else if(!job.free&&scatters>=4)addSpins(10);
        } else if(!job.free&&scatters>=4)addSpins(12);
        continue;
      }

      let boxMultipliers=null,luckyBoxes=[];
      if(id==='magicgarden_native') {
        boxMultipliers=new Map();
        for(const[c,r]of choose(rng,positions(5,3),3)){const multiplier=weighted(rng,[[2,7],[3,2],[5,1]]);boxMultipliers.set(`${c}:${r}`,multiplier);luckyBoxes.push({column:c,row:r,multiplier});}
        if(grid[4].includes('magic')){for(let c=0;c<5;c++)for(let r=0;r<3;r++)if(grid[c][r]==='magic'||(c>0&&draw(rng)<0.12))grid[c][r]='wild';feature='Magic wild conversion';}
      }
      let cascade=0;
      while(!capped()) {
        let wildMultipliers=null;
        if(id==='vegasnights_native'&&job.free)wildMultipliers=new Map(positions(5,3).filter(([c,r])=>grid[c][r]==='wild'||grid[c][r]==='gold').map(cell=>[cellKey(cell),weighted(rng,[[2,2],[3,1]])]));
        let wins=isWays(id)?wayWins(config,grid):lineWins(config,grid,boxMultipliers,wildMultipliers);
        const multiplier=isWays(id)&&job.free?Math.min(cascade+1,10):id==='bookofmagic_native'&&job.free?3:1;
        if(multiplier!==1)wins=wins.map(win=>({...win,points:win.points*multiplier}));
        const scatters=cellsOf(grid,'scatter').length;
        if(cascade===0) {
          if(isWays(id)&&!job.free&&scatters>=3)addSpins(scatters>=5?25:scatters===4?20:15);
          if(id==='bookofmagic_native'&&scatters>=3)addSpins(15);
          if(id==='vegasnights_native'&&scatters===3)addSpins(5);
          if(id==='vegasnights_native'&&job.mode!=='extra'&&grid[4][1]==='gold'){
            for(let n=0;n<3;n++)queue.push({kind:'extra-wild-respin',mode:'extra',free:job.free});feature='Three extra wild respins';
          }
          if(scatters>=3){
            const points=(id==='vegasnights_native'?2:([0,0,0,2,10,50][Math.min(scatters,5)]||0))*10000*(id==='bookofmagic_native'&&job.free?3:1);
            wins.push({symbol:'scatter',count:scatters,cells:cellsOf(grid,'scatter'),points});
          }
        }
        addFrame(grid,wins,{kind:job.kind,cascade,multiplier,feature,...(luckyBoxes.length?{luckyBoxes}:{}),...(wildMultipliers?{wildMultipliers:Object.fromEntries(wildMultipliers)}:{})});
        const lineOrWayWins=wins.filter(win=>win.symbol!=='scatter');
        if(!isWays(id)||!lineOrWayWins.length||capped())break;
        grid=collapse(config,grid,lineOrWayWins,rng);cascade++;
      }
    }
    if(!Number.isSafeInteger(totalPoints)||totalPoints<0)fail('INVALID_RAW_PAYOUT',500);
    return {totalPoints,frames,totalFrames,bonusSpins,feature,finalGrid,finalFrame,progress,featureEvents,stoppedAtPayoutCap:capped()};
  }

  function slotStart(id,stake,rng,now) {
    const scale=slotScales[id],rawLimit=Math.ceil(100*10000*scale.denominator/scale.numerator);
    const raw=sampleRawSlot(id,rng,{maxRawPoints:rawLimit});
    const uncapped=stake*BigInt(raw.totalPoints)*BigInt(scale.numerator)/(POINTS*BigInt(scale.denominator));
    const roundCap=limited(stake*100n),payout=uncapped>roundCap?roundCap:uncapped,presentation=attachMoney(raw,payout);
    return {gameId:id,stakeMinor:String(stake),status:'settled',expiresAt:now,payoutMinor:String(payout),family:configById[id].family,grid:raw.finalGrid,wins:presentation.finalFrame?.wins||[],...presentation,feature:raw.feature,bonusSpins:raw.bonusSpins,freeSpinsRemaining:0,progress:raw.progress,featureEvents:raw.featureEvents,maxWinMultiplier:100,capped:uncapped>=roundCap,actions:[]};
  }
  function transition(state,debit=0n) {
    const stake=money(state.stakeMinor);
    const liability=state.gameId==='towerx_native'?limited(stake*50n):state.gameId==='coinminer_native'?minesPayout(stake,state.mines,coin94MultipliersHundredths[String(state.mines)].length):slotScales[state.gameId]?limited(stake*100n):CAP;
    return {state,debitMinor:String(debit),maxPayoutMinor:String(liability),payoutMinor:state.status==='settled'?state.payoutMinor:null};
  }
  function createAdapter(includeDrafts=false) {
    const definitions=Object.fromEntries(known.filter(config=>includeDrafts||config.launchable===true).map(config=>[config.id,{
      id:config.id,name:config.name,version:config.version,type:config.type,launchable:config.launchable===true,minStake:'0.10',maxStake:'100.00',maxWin:'10000.00',currency:'ETB',officialPrivateMathVerified:false,publicConfig:config,model:config.math,
    }]));
    return {
      definitions,
      start(id,options,rng,now){
        clock(now);if(!Object.hasOwn(definitions,id))fail('GAME_REFERENCE_UNRESOLVED',409);
        if(!object(options)||Object.keys(options).some(key=>!['stakeMinor',...(id==='coinminer_native'?['mines']:[])].includes(key)))fail('INVALID_GAME_OPTIONS');
        const stake=checkedStake(options.stakeMinor);
        const state=id==='towerx_native'?towerXStart(id,stake,rng,now):id==='towerrush_native'?towerRushStart(id,stake,now):id==='coinminer_native'?minesStart(id,stake,options,now):slotStart(id,stake,rng,now);
        return transition(state,stake);
      },
      act(state,input,rng,now){
        clock(now);if(!object(state)||state.status!=='active'||!Object.hasOwn(definitions,state.gameId))fail('ROUND_NOT_ACTIVE',409);
        if(!object(input)||Object.keys(input).some(key=>!['type',...(state.gameId==='coinminer_native'?['index']:[])].includes(key)))fail('INVALID_GAME_ACTION');
        if(now>=state.expiresAt)return this.expire(state,rng,now);
        return transition(state.gameId==='coinminer_native'?minesAction(clone(state),input,rng):state.gameId==='towerrush_native'?towerRushAction(clone(state),input,rng):fail('INVALID_GAME_ACTION'));
      },
      expire(state,_rng,now){
        clock(now);if(!object(state)||!Object.hasOwn(definitions,state.gameId))fail('GAME_MODEL_UNAVAILABLE',409);
        if(state.status==='settled')return transition(clone(state));
        if(!['coinminer_native','towerrush_native'].includes(state.gameId))fail('INVALID_ACTIVE_MODEL',500);
        return transition(finish(clone(state),money(state.currentCashoutMinor),'expired-collected'));
      },
      publicState(state,now){
        clock(now);const output=clone(state);
        if(state.currentCashoutMinor!==undefined)output.multiplier=ratio(money(state.currentCashoutMinor),money(state.stakeMinor));
        return {...output,serverNow:now};
      },
    };
  }
  function evaluateDraftGrid(id,grid,{free=false,wildMultipliers={}}={}) {
    const config=configById[id];
    if(!config||!slotScales[id]||!Array.isArray(grid)||grid.length!==config.columns||grid.some(col=>!Array.isArray(col)||col.length!==config.rows))fail('INVALID_REVIEW_GRID');
    const allowed=new Set(config.symbols.map(symbol=>symbol.id));
    if(grid.flat().some(symbol=>!allowed.has(symbol)))fail('INVALID_REVIEW_SYMBOL');
    let wins=isLegend(id)?anyWhereWins(config,grid):isWays(id)?wayWins(config,grid):lineWins(config,grid,null,new Map(Object.entries(wildMultipliers)));
    if(id==='bookofmagic_native'&&free)wins=wins.map(win=>({...win,points:win.points*3}));
    return {wins,totalPoints:wins.reduce((sum,win)=>sum+win.points,0)};
  }
  return {adapter:createAdapter(),createIsolatedDraftAdapter:()=>createAdapter(true),sampleRawSlot,evaluateDraftGrid};
}
