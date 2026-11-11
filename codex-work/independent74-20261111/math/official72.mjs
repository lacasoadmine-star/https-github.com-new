// Catalogue identities and observed public layouts are reference evidence.
// Every probability model remains independently authored; provider parity is
// not inferred from a matching title, a loaded canvas or a successful test.
import scope from '../scope/official74.json' with {type:'json'};
import {officialTitleBase} from './official-title-modules.mjs';
import {getGameDefinition as revisedModel} from './requested72.mjs';
import freshPlinko from './fresh-plinkoxclassic.mjs';
import {configureChickenHighway,CHICKEN_HIGHWAY_ID} from './chicken-highway.mjs';
import {configureWheelOfDestiny,startWheelOfDestiny,validateWheelOfDestinyRound,maximumWheelOfDestinyPayout,WHEEL_OF_DESTINY_ID} from './wheel-of-destiny.mjs';
import {configureObservedPlinkoX,startObservedPlinkoX,validateObservedPlinkoXRound,maximumObservedPlinkoXPayout,observedPlinkoXOptions,OBSERVED_PLINKOX_ID} from './observed-plinkox.mjs';
import {officialLayout, independentPaylines, OBSERVED_LAYOUTS} from './official72-layouts.mjs';
import {startSlot, publicSlot, calculateSlotReturn} from './engines/slots.mjs';
import {startCrash, advanceCrash, collectCrash, publicCrash, syncCrash} from './engines/crash.mjs';
import {startLadder, advanceLadder, collectLadder, publicLadder} from './engines/ladder.mjs';
import {startMines, advanceMines, collectMines, publicMines, mineMultiplier} from './engines/mines.mjs';
import {startInstant, publicInstant} from './engines/instant.mjs';
import {error, stake, payout, draw} from './engines/shared.mjs';
import {startThreeReelSlot, startPublicWildSlot, holdSlotWin, gambleSlotWin, collectSlotWin,
  validateHeldSlot, publicHeldSlot} from './official72-mechanics.mjs';
import {configurePopxCascade,startPopxCascade,syncPopxCascade,collectPopxCascade,
  publicPopxCascade,validatePopxCascade} from './popx.mjs';
import {configurePublicColorGamble, PUBLIC_COLOR_GAMBLE_IDS} from './public-gamble.mjs';
import {configurePublicSlotFeatures, PUBLIC_EXPANDING_WILD_IDS} from './public-slot-features.mjs';
import {configureObservedWildWays,startObservedWildWays,OBSERVED_WILD_WAYS_ID} from './ways-slot.mjs';
import {configureObservedThreeReel,startObservedRegularWays,OBSERVED_THREE_IDS,MULTI_HOT_WAYS_ID} from './observed-three-reel.mjs';
import {startPowerOfTiger,validatePowerTigerRound,maximumPowerTigerPayout,
  powerTigerMaximumMultiplierBps,POWER_TIGER_ID} from './power-of-tiger.mjs';
import {startCoinsOfAtlantis,validateCoinsAtlantisRound,maximumCoinsAtlantisPayout,
  publicCoinsAtlantisRound,coinsAtlantisOptions,coinsAtlantisMaximumMultiplierBps,COINS_ATLANTIS_ID} from './coins-of-atlantis.mjs';
import {startGatesOfMerlyn,validateGatesMerlynRound,publicGatesMerlynRound,maximumGatesMerlynPayout,
  gatesMerlynOptions} from './gates-of-merlyn.mjs';
import {chargingOptions,chargingCarryBucket,emptyChargingCarry,
  chargingFreshMaximumMultiplierBps,maximumChargingPayout,startChargingWilds,validateChargingRound} from './charging-wilds.mjs';
export {chargingCarryBucket,emptyChargingCarry} from './charging-wilds.mjs';
import {configureBookOfBonanza,startBookOfBonanza,validateBookBonanzaRound,publicBookBonanzaRound,
  maximumBookBonanzaPayout,BOOK_BONANZA_ID} from './book-of-bonanza.mjs';
import {configureIsolatedTitle} from './title-configurators.mjs';
import {MARIACHI_COINS_ID,mariachiOptions,mariachiMaximumMultiplierBps,maximumMariachiPayout,
  startMariachiCoins,validateMariachiRound,publicMariachiRound} from './mariachi-coins.mjs';
import {startJungleSisters,validateJungleRound,publicJungleRound,maximumJunglePayout,jungleMaximumMultiplierBps} from './jungle-sisters.mjs';

const norm = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export const GAME_ID = 'ind74_official_mineisland2';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const largestSymbolPrize = d => Math.max(...d.symbols.flatMap(symbol => Object.values(symbol.pays)),...Object.values(d.wildSymbol?.pays??{}));
const largestWheel = d => Math.max(...(d.multiplierValues ?? [1]));
const PLINKO_CLASSIC = 'ind74_official_plinkoxclassic';
const WILD_THREE = 'ind74_official_multihot5wild';
const GAMBLE_HUNDRED = 'ind74_official_multihot100';
const MINE_ISLAND = 'ind74_official_mineisland';
const THREE_REEL_TITLES=new Set(['Multi Hot 5 Deluxe','Safari Simba','Habesha Fortune 5','Bao Slot 5X','Power of Tiger','Sugar Fiesta']);
const VERIFIED_LINE_COUNTS=new Map([['Power of Tiger',5],['Gems Crown Charging Wilds',5],['Burning Ice',5],['Jungle Sisters Deluxe',20],['Sugar Fiesta',3]]);

function maximumMultiplier(d) {
  if(d.jungleFeature)return jungleMaximumMultiplierBps(d);
  if(d.chargingFeature)return chargingFreshMaximumMultiplierBps(d);
  if(d.slotMechanic==='tumble')return d.tumbleFeature.maximumMultiplier*10000;
  if(d.id===BOOK_BONANZA_ID)return d.bookFeature.maximumMultiplier*10000;
  if(d.id===MARIACHI_COINS_ID)return mariachiMaximumMultiplierBps(d);
  if(d.id===WHEEL_OF_DESTINY_ID)return 12000000;
  if(d.id===OBSERVED_PLINKOX_ID)return Math.max(...Object.values(d.bucketTablesBps).flat())*10;
  if(d.id===COINS_ATLANTIS_ID)return coinsAtlantisMaximumMultiplierBps(d);
  if(d.id===POWER_TIGER_ID)return powerTigerMaximumMultiplierBps(d);
  if (d.family === 'slots') return largestSymbolPrize(d) * largestWheel(d) * 10000 * (d.gamble?.enabled ? 2 ** d.gamble.maxRounds : 1)/(d.symbolPrizeDivisor??1);
  if (d.family === 'crash') return d.maxMultiplierBps;
  if (d.id === GAME_ID) return Math.max(...d.paytable.flatMap(table => table.rows.map(row => row.multiplierBps)));
  if (d.family === 'ladder') return d.id===CHICKEN_HIGHWAY_ID?Math.max(...d.paytable.map(table=>table.rows.at(-1).multiplierBps)):d.multipliersBps.at(-1);
  if (d.family === 'mines') return mineMultiplier(d, d.maxPicks);
  if (d.family === 'plinko') return Math.max(...d.bucketMultipliersBps) * Math.max(...(d.ballMultipliers ?? [1]));
  if (d.family === 'wheel') return Math.max(...d.sectors.map(sector => sector.multiplierBps));
  if (d.family === 'dice') return Math.floor(d.returnBps * 100 / d.minTarget);
  error('INVALID_MODEL', 'Unsupported independent game family.');
}

const definitions = scope.entries.filter(entry => !entry.protected).map(entry => {
  const model = entry.name === 'Plinko X Classic' ? freshPlinko
    : entry.name === 'Multi Hot 100' ? revisedModel('ind74_multihot100')
    : officialTitleBase(entry.gameId);
  if (!model) throw new Error('Missing independent model for official title: ' + entry.name);
  const d = structuredClone(model);
  d.id = entry.gameId;
  d.catalogName = entry.name;
  d.title = entry.name + ' — Independent';
  d.mathVersion = 'official72-' + norm(entry.name) + '-r2';
  d.officialReference = {publisher: 'SmartSoft Gaming', page: entry.officialUrl, demo: entry.demoUrl,
    catalogVerifiedOn: scope.fetchedOn, fullGameplayVerified: false};
  d.implementationStatus = 'independent-model; full-reference-parity-and-production-ledger-unverified';
  d.limits = {minBetMinor: '100', maxBetMinor: '0', betStepMinor: '100', maxWinMinor: '0'};

  if (d.id === CHICKEN_HIGHWAY_ID) configureChickenHighway(d);
  if (d.id === WHEEL_OF_DESTINY_ID) configureWheelOfDestiny(d);
  if (d.id === OBSERVED_PLINKOX_ID) configureObservedPlinkoX(d);

  if (d.id === MINE_ISLAND) {
    // The actual MineIsland launcher is an ascending island ladder, not a
    // rectangular mine-picker. Do not transfer geometry from a similar name.
    d.family = 'ladder';
    d.mathVersion = 'official72-mineisland-r3';
    for (const key of ['rows','cols','cells','mines','maxPicks']) delete d[key];
    d.modes = ['easy']; d.defaultMode = 'easy'; d.maxSteps = 10;
    d.multipliersBps = [11000,12000,15000,20000,30000,50000,100000,200000,500000,1000000];
    d.returnBps = 9600;
    d.paytable = [{mode:'easy',rows:d.multipliersBps.map((multiplierBps,index)=>({step:index+1,multiplierBps}))}];
    d.nominalReturn = {numerator:'96',denominator:'100',description:'Independent authored survival model. This is not a provider RTP claim.'};
    d.rules = [
      'The observed official Mine Island demo shows ten ascending island platforms labelled 1.1x, 1.2x, 1.5x, 2x, 3x, 5x, 10x, 20x, 50x and 100x.',
      'Play debits one stake and resolves the first jump. The observed first attempt could lose. This independent continuation offers Jump to attempt the next platform or Collect to pay the confirmed current multiplier; the original demo continuation controls remain unverified.',
      'The tenth successful jump collects at 100x. Winnings use integer minor units and round down after multiplication.',
      'The server chooses the outcomes. This independent model uses a 9600/first-multiplier survival threshold, then the preceding multiplier divided by the next multiplier; those probabilities are operator choices and are not verified provider probabilities.',
      'Selected visual cell numbers do not change the server result. No private RNG, rare provider bonus, artwork, audio or full reference equivalence is claimed.',
      'Source conflict: the official marketing page describes a rectangular tile/mines game, while its linked MineIsland demo shows this ascending island ladder. The observed launcher geometry is used here; complete title/rule equivalence is not established.',
    ];
    d.provenance = {...d.provenance,
      observed:'Official MineIsland launcher screenshot shows an ocean, kangaroo, TNT barrels and ten ascending island platforms; the first PLAY attempt was observed to lose and return to PLAY. Later continuation controls are unverified.',
      geometrySource:'reports/current74-evidence-nonslots/ind74_official_mineisland-initial.png',
      designed:'Independent survival probabilities and server round transitions with observed ten-step visible multipliers. The previous rectangular mines model does not match this game.'};
  }

  if(THREE_REEL_TITLES.has(entry.name)) {
    d.rows=3;d.cols=3;d.mathVersion='official72-'+norm(entry.name)+'-r3';
    d.paylines=[[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]];
    d.symbols=d.symbols.map(symbol=>({...symbol,pays:{3:symbol.pays[3]}}));
    d.rules=[
      'The public reference specifies three reels and three rows. This independent implementation uses five authored paylines.',
      'Three equal regular symbols from the left pay the displayed independent prize; each line uses one fifth of the total stake before integer flooring.',
      'The complete provider paytable, paylines, bonus features and probabilities remain unverified. No provider return percentage is claimed.',
    ];
    d.provenance={...d.provenance,geometrySource:entry.officialUrl,designed:'Independent three-reel regular-symbol model with author-generated five paylines and symbol awards.'};
    if(entry.name==='Power of Tiger') {
      d.provenance.geometrySource='reports/current74-evidence-slots-remaining/ind74_official_poweroftiger-initial.png';
      d.provenance.observed='Five fresh official DEMO results contain nine symbols each, matching the rendered3-by-3 grid. The public page and result LinePlay field both specify five lines.';
      d.rules.push('The observed20X sign is presentation evidence only. The advertised wild, locked-symbol respin and conditional5x/10x/15x/20x feature remain unimplemented; no trigger probabilities or active feature award are inferred from that sign.');
    }
  }
  if(VERIFIED_LINE_COUNTS.has(entry.name)) {
    const count=VERIFIED_LINE_COUNTS.get(entry.name);
    if(d.paylines.length!==count) {
      d.mathVersion='official72-'+norm(entry.name)+'-r3';
      d.paylines=independentPaylines(d.cols??5,d.rows??3,count);
      d.rules=[`The official public page specifies ${count} fixed paylines. This model uses ${count} independently authored lines.`,...d.rules];
      d.provenance={...d.provenance,paylineCountSource:entry.officialUrl,paylineSource:'Independent chart; public line count only is verified.'};
    }
  }

  if(d.id==='ind74_official_dragonscode') {
    d.rows=4;d.cols=5;d.paylines=independentPaylines(5,4,50);d.mathVersion='official72-dragonscode-r3';
    d.rules=[
      'The official DEMO renders five reels and four rows. Exact title-specific English Help documents50 paylines. This regular-symbol fallback uses50 independently authored lines, including the fourth row.',
      'Only the longest left-to-right regular-symbol match of3,4 or5 pays on each line. Per-line award is floor(total stake times the authored symbol prize divided by50); line awards add.',
      'The visible top multiplier arc and documented1x-to5x multiplier apply to this regular-spin award. X2 retains an optional winning award for the independent color-gamble lifecycle. Wild, Golden Egg, respins and feature purchase remain unimplemented; geometry and ordinary-spin support do not establish those feature outcomes.',
      'Symbol prizes, uniform regular-symbol draws and the50-line chart remain independent operator choices; no complete provider artwork, audio, RTP or feature equivalence is claimed.',
    ];
    d.provenance={...d.provenance,geometrySource:'reports/current74-evidence-slots-secondary/ind74_official_dragonscode-initial.png',
      paylineCountSource:'reports/current74-evidence-slots-secondary/ind74_official_dragonscode-official-help-en.json:help.slots.dragonscode.multiplier.reel.description.second',
      observed:'Rendered5-by4 grid with20 symbol positions; native canvas2170-by1220. Top arc visibly shows1x,2x and5x.',
      designed:'Independent50-line regular-symbol fallback, preserving unknown provider prizes/probabilities and unimplemented feature rules.'};
  }
  if (d.id === 'ind74_official_multihot40') {
    const observed = OBSERVED_LAYOUTS[d.id];
    d.rows = observed.rows;
    d.cols = observed.columns;
    d.paylines = independentPaylines(d.cols, d.rows, 40);
    d.rules = [
      'Independent five-reel, four-row slot with 40 independently authored paylines. Geometry follows the observed public demo; the provider payline chart is unverified.',
      'Only the longest left-to-right match of 3, 4 or 5 identical symbols pays on each line.',
      'Each line pays floor(stake × symbol prize / 40); the line prizes add without a hidden payout clamp.',
      'The top multiplier arc is observed presentation evidence. Its complete provider probability model is not implemented by this independent slot model.',
      'No provider wild, scatter, bonus, gamble or free-spin equivalence is asserted.',
    ];
    d.provenance = {...d.provenance, observed: observed.evidence,
      geometrySource: observed.source, paylineSource: 'Independent 40-line chart using all four rows'};
  }
  if (d.id===WILD_THREE) {
    const three = d.id === WILD_THREE;
    d.rows = 3; d.cols = three ? 3 : 5;
    d.mathVersion = 'official72-' + norm(entry.name) + '-r3';
    d.paylines = three ? [[1,1,1], [0,0,0], [2,2,2], [0,1,2], [2,1,0]]
      : [[1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2], [0,1,2,1,0], [2,1,0,1,2]];
    d.symbols = structuredClone(revisedModel('ind74_multihot100').symbols).map((symbol, i) => ({...symbol,
      id: norm(entry.name) + '-' + symbol.id.replace(/^multihot100-/, ''),
      pays: three ? {3: [50,30,20,15,12,10,8,6][i]} : symbol.pays}));
    d.wildSymbol = {id: norm(entry.name) + '-wild', label: 'Wild', glyph: 'W'};
    if(three) {
      d.mathVersion='official72-'+norm(entry.name)+'-r4';
      d.symbols=[['double-seven','Double seven','77',75],['dollars','Dollars','$$',50],['bell','Bell','🔔',25],
        ['watermelon','Watermelon','🍉',15],['grape','Grapes','🍇',15],['plum','Plum','●',5],
        ['lemon','Lemon','🍋',5],['orange','Orange','🍊',5],['cherry','Cherry','🍒',5]]
        .map(([id,label,glyph,prize])=>({id:norm(entry.name)+'-'+id,label,glyph,weight:1,pays:{3:prize}}));
      d.wildSymbol.pays={3:100};
      d.observedPaytable={source:entry.demoUrl,totalBetMinor:'5',paylines:5,
        regularPrizesPerLine:[75,50,25,15,15,5,5,5,5],wildPrizePerLine:100,
        publishedMaximumMultiplier:375,maximumCouplingVerified:false,
        conflict:'The observed all-wild prize and a possible 5x multiplier permit a 500x independent full-board bound; the help states 375x. Provider restrictions or coupling are unverified.'};
    }
    d.wildRule = {columns: three ? [0,1,2] : [1,2,3], substitutesRegularSymbols: true,
      expandWhenWinning: !three, expansionEvaluation: three ? 'none' : 'initial-winning-lines-only',
      allWildAward: three?'observed-wild-own-award':'highest-eligible-symbol-award', regularSymbolWeight: 32, wildWeight: 1,
      probabilityModel: 'independent-per-cell-tickets', providerProbabilitiesVerified: false};
    d.multiplierValues = [1,2,3,4,5];
    d.rules = [
      three ? 'Three reels and three rows with five fixed independent paylines; three matching symbols from the left pay.'
        : 'Five reels and three rows with five fixed independent paylines; the longest left-to-right match pays.',
      three ? 'Wild substitutes for any regular symbol. Three Wilds pay their observed own prize of 100 times the line stake.'
        : 'Wild appears only on reels 2, 3 and 4. A wild used by an initial winning line expands to fill its reel; all paylines are then evaluated again.',
      'A 1x, 2x, 3x, 4x or 5x multiplier multiplies the completed line awards.',
      `This independent model gives each eligible cell ${d.symbols.length*32} regular-symbol tickets and one wild ticket; regular symbols share those tickets equally. Multiplier values are equally likely.`,
      three?'Symbol prizes follow the publicly observed DEMO paytable. Paylines and probabilities are independently authored; certified provider RTP is not reproduced.'
        :'Symbol awards and paylines are independently authored. The provider probability distribution, complete paytable and certified RTP have not been reproduced.',
    ];
    if(three)d.rules.push('The help advertises 375x maximum, but its displayed wild prize combined with 5x permits a 500x independent bound. Unverified provider restrictions are not replaced with a hidden payout clamp.');
    d.provenance = {...d.provenance, publicRules: entry.officialUrl,
      designed: three?'Observed nine regular-symbol awards and the Wild award; independently authored five-line chart and probabilities. The provider maximum-win coupling remains unresolved.'
        :'Independent symbol awards, five-line chart and probabilities; public geometry and wild rules implemented separately from those operator choices.'};
  }
  const titleConfigured=configureIsolatedTitle(d);
  if (d.id === OBSERVED_WILD_WAYS_ID) configureObservedWildWays(d);
  if (!titleConfigured&&OBSERVED_THREE_IDS.includes(d.id)) configureObservedThreeReel(d);
  if (!titleConfigured&&PUBLIC_EXPANDING_WILD_IDS.includes(d.id)) configurePublicSlotFeatures(d);
  if (d.id === BOOK_BONANZA_ID) configureBookOfBonanza(d);
  if(d.id==='ind74_official_sugarfiesta'){
    d.symbols=[['icecream','Ice cream','♧',45],['heart-candy','Striped heart candy','♥',30],['candy-cane','Candy canes','♯',15],
      ['donut','Donut','◎',12],['croissant','Croissant','☾',12],['ace','A','A',6],['jack','J','J',6],['queen','Q','Q',6],['king','K','K',6]]
      .map(([id,label,glyph,prize])=>({id:'sugarfiesta-'+id,label,glyph,weight:1,pays:{3:prize}}));
    d.observedPaytable={source:entry.demoUrl,totalBetMinor:'5',paylines:3,
      displayedThreeSymbolAwardsMinor:['75','50','25','20','20','10','10','10','10'],
      publishedMaximumMultiplier:125,maximumCouplingVerified:false,
      conflict:'The displayed0.05DMO three-symbol awards normalized to independent line stakes and a5x multiplier permit a225x full-board bound. Provider125x maximum coupling remains unverified.'};
    d.rules=[
      'The fresh official DEMO screenshot and saved rendered positions show3reels and3rows; the official page specifies3fixed paylines. This model uses the three horizontal rows as independently authored lines.',
      'Nine regular symbol categories and the published three-symbol awards follow the displayed0.05DMO paytable. The independent normalization converts each displayed award to a line-stake multiplier; each line award is floor(total stake times its prize divided by3).',
      'Exact SugarFiesta Help documents a left-side1x–5x multiplier and optional red/black X2. This independent implementation chooses multiplier values uniformly and uses its disclosed held-win gamble lifecycle.',
      'Help advertises125x maximum, while the displayed prizes and independent full-board5x combination permit225x. Provider restrictions or award coupling remain unresolved. No hidden clamp is used to replace those missing rules.',
      'The symbol frequencies, provider award coupling, full label order, artwork and certified RTP are not claimed.',
    ];
    d.provenance={...d.provenance,geometrySource:'reports/priority10-reference-20261111/sugarfiesta-ready-geometry.jpg',
      observed:'Nine positions in3columns and3rows; a fresh official DEMO screenshot confirms the geometry and nine regular symbol categories.',
      publicPaytableSource:'reports/priority10-reference-20261111/sugarfiesta-paytable.jpg',publicDemoSource:entry.demoUrl};
  }
  if (!titleConfigured&&['ind74_official_multihot40','ind74_official_dragonscode','ind74_official_sugarfiesta'].includes(d.id)) {
    d.multiplierValues = [1,2,3,4,5];
    d.rules.push('The exact title Help documents multiplier values1x,2x,3x,4x,5x, applied to the completed spin award. This independent implementation selects these values uniformly; provider weights and reel order remain unknown.');
    d.provenance = {...d.provenance, publicMultiplierSource: d.id==='ind74_official_dragonscode'
      ?'reports/current74-evidence-slots-secondary/ind74_official_dragonscode-official-help-en.json:help.slots.dragonscode.multiplier.reel.description.fourth'
      :d.id==='ind74_official_sugarfiesta'?'reports/current74-evidence-slots-secondary/ind74_official_sugarfiesta-official-help-en.json:help.slots.SugarFiesta.multiplier.reel.description'
      :'references/official-slot-help-en-20261111.json:help.slots.' + norm(entry.name) + '.multiplier.reel.description'};
  }
  if (!titleConfigured&&PUBLIC_COLOR_GAMBLE_IDS.includes(d.id)) configurePublicColorGamble(d);
  if (d.id === GAMBLE_HUNDRED) {
    d.mathVersion = 'official72-' + norm(entry.name) + '-r3';
    d.gamble = {enabled: true, maxRounds: 3, choices: ['red', 'black'],
      probabilityModel: 'independent-fair-color', startOption: 'holdWin', providerLimitVerified: false,
      source: 'references/multihot100-observed-20261111.json',
      rule: 'Correct color doubles the held award; incorrect color loses that award. Collect is available before each attempt. The independent operator limit is three attempts; the final success collects automatically.'};
    d.rules = [...d.rules, 'Choose holdWin before a spin to keep a winning award available for red/black X2 or immediate collection. This does not place another stake.',
      'Each independent X2 draw is equally likely red or black. At most three attempts are allowed; the third success collects automatically. This operator limit is not a verified provider limit.'];
  }
  if (d.id === PLINKO_CLASSIC) {
    d.mathVersion = 'official72-' + norm(entry.name) + '-r3';
    d.model = 'observed-board-independent-colored-ball-v2';
    d.ballMultipliers = [1,5,10];
    d.ballSelection = [{type:'pink',multiplier:1,weight:995},{type:'orange',multiplier:5,weight:4},{type:'fire',multiplier:10,weight:1}];
    d.ballSelectionModel = {selection:'server',providerProbabilitiesVerified:false,
      source:entry.demoUrl, marketingDemoAmbiguity:true,
      rule:'The observed demo shows pink 1x, orange 5x and fire 10x balls with a maximum of 10000x. Server selection and its probabilities are independently authored.'};
    delete d.implementedBallMultiplier;
    d.completeProviderBallTypesImplemented = false;
    d.nominalReturn = {numerator:(158963n*1025n).toString(),denominator:(163840n*1000n).toString(),
      description:'Independent fair-path model and independent 995/4/1 color weights. This is not certified provider RTP.'};
    d.rules = [
      'The public board has 16 peg rows and 17 prize buckets. The observed demo identifies pink 1x, orange 5x and fire 10x balls.',
      'One accepted stake is debited. The server independently chooses the ball color; there is no player color selection or extra color charge.',
      'Payout equals the stake times the bucket multiplier times the server-selected ball multiplier; the maximum is 10000 times the stake.',
      'This independent model takes 16 fair left/right turns and selects pink/orange/fire with weights 995/4/1. These are operator probabilities, not recovered provider probabilities.',
      'Marketing describes selectable stake factors, but the observed demo shows a static color legend. Complete provider color-selection semantics and certified RTP remain unverified.',
    ];
    d.provenance = {...d.provenance, publicBallHelpSource: entry.demoUrl, marketingSource:entry.officialUrl,
      designed: 'Independent fair left/right paths and server color probabilities. The stake is debited once; public demo ball multipliers multiply the bucket award.'};
  }
  if(d.id==='ind74_official_popx')Object.assign(d,configurePopxCascade(d));
  if (d.family === 'slots') {
    d.proratedStake = d.slotMechanic!=='tumble';
    if(d.slotMechanic==='tumble'||d.chargingFeature||d.bookFeature||d.jungleFeature){
      // Its disclosed independent cascade model has no analytic provider RTP.
    } else if (d.id === WILD_THREE) {
      const weightedAwards = d.symbols.reduce((sum, symbol) => sum + BigInt(symbol.pays[3]) * (33n ** 3n - 1n), 0n) + BigInt(largestSymbolPrize(d));
      d.nominalReturn = {numerator: (weightedAwards * 15n).toString(), denominator: (BigInt(d.symbols.length*32+1) ** 3n * 5n).toString(),
        description: 'Independent three-reel weighted model, including the observed own prize for an all-wild line.', rounding: 'Before per-line minor-unit flooring.'};
    } else if (d.wildSymbol) {
      d.nominalReturn = {verified: false, description: 'Independent wild-bearing model; aggregate return is not certified or inferred from the provider.'};
    } else if(d.cols===3) {
      const wheel=d.multiplierValues??[1];
      d.nominalReturn={numerator:(d.symbols.reduce((sum,symbol)=>sum+BigInt(symbol.pays[3]),0n)*BigInt(wheel.reduce((a,b)=>a+b,0))).toString(),
        denominator:(BigInt(d.symbols.length)**3n*BigInt(wheel.length)).toString(),rounding:'Before per-line minor-unit flooring; independent uniform regular-symbol model.'};
    } else d.nominalReturn = {...calculateSlotReturn(d), rounding: 'Before per-line minor-unit flooring.'};
  }
  if (d.id === GAME_ID) {
    d.multipliersBps = d.paytable.find(table => table.mode === 'easy').rows.map(row => row.multiplierBps);
    d.returnBps = 9600;
  }
  if(['ind74_official_multihotways','ind74_official_dragonscode'].includes(d.id)){
    d.releaseReview={realMoneyAdmissionBlocked:true,codes:['INDEPENDENT_RETURN_ABOVE_STAKE','PUBLIC_MECHANICS_INCOMPLETE'],
      independentAnalyticReturn:{numerator:d.nominalReturn.numerator,denominator:d.nominalReturn.denominator,scope:'before-per-line-minor-unit-flooring'},
      requiredAction:'Review and version the independent probability distribution and complete documented public mechanics before real-money admission. Do not substitute provider RTP or silently tune unobserved weights.'};
    d.implementationStatus='independent-model; real-money-admission-blocked; independent-return-above-stake';
    d.rules.push('REAL-MONEY ADMISSION IS BLOCKED: this independent distribution has analytic return'+d.nominalReturn.numerator+'/'+d.nominalReturn.denominator+' before line rounding, above the accepted stake. Provider probabilities are not established. Functional or ledger tests do not clear this restriction; a reviewed and newly versioned independent distribution is required.');
  }
  d.maximumMultiplierBps = maximumMultiplier(d);
  // Retained LibraryService amounts have a 15-digit integer contract.
  // This derived ceiling prevents storage overflow, including all gamble steps;
  // it is NOT a financial betting policy. Admission requires server policy.
  const storageMax = 999999999999999n;
  const prizeBound = storageMax * 10000n / BigInt(d.maximumMultiplierBps);
  d.limits.maxBetMinor = ((prizeBound < storageMax ? prizeBound : storageMax) / 100n * 100n).toString();
  d.limits.maxWinMinor = payout(d.limits.maxBetMinor, d.maximumMultiplierBps);
  if(d.chargingFeature){
    // Prior saved charge has a dynamic bound. The exact transaction context,
    // configured policy and actual reserve govern admission on every spin.
    d.limits.maxWinMinor=storageMax.toString();
    d.limits.maximumMultiplierScope='fresh-carry-only';
  }
  d.limits.policy = 'server-game-policy-and-retained-account-house-reserve';
  d.limits.storageDerived = true;
  d.limits.testPresetsMinor = Array.from({length:20}, (_,i) => String((i+1)*100));
  d.layout = officialLayout(d);
  d.modelDisclosure = {
    providerPrivateMathVerified: false,
    completeReferenceParityVerified: false,
    outcomeAuthority: 'server-owned round state and bounded integer RNG',
    clientPayoutAccepted: false,
    returnIsIndependent: true,
  };
  return d;
});

export const listGameDefinitions = () => structuredClone(definitions);
export const getGameDefinition = id => structuredClone(definitions.find(d => d.id === id) ?? null);

function get(id, mode) {
  let d = definitions.find(definition => definition.id === id);
  if (!d) error('INVALID_GAME', 'This official-catalogue entry has no independent model.');
  if (d.family === 'ladder') {
    const selected = mode ?? d.defaultMode ?? 'easy';
    if (!(d.modes ?? ['easy']).includes(selected)) error('INVALID_MODE', 'Choose a supported mode.');
    if (d.id === GAME_ID || d.id === CHICKEN_HIGHWAY_ID) {
      const table = d.paytable.find(item => item.mode === selected);
      d = {...d, multipliersBps: table.rows.map(row => row.multiplierBps),maxSteps:table.rows.length};
    }
  }
  return d;
}

function startOptions(d, options) {
  const allowed = d.chargingFeature?['ante','holdWin']:d.slotMechanic==='tumble'||d.id===COINS_ATLANTIS_ID?['mode']:d.id===WHEEL_OF_DESTINY_ID?['bets']:d.id===OBSERVED_PLINKOX_ID?['risk','ballAmount']:d.family === 'ladder' ? ['mode'] : d.family === 'dice' ? ['target']
    : d.gamble?.enabled ? ['holdWin'] : [];
  if (!record(options) || Object.keys(options).some(key => !allowed.includes(key))) {
    error('INVALID_OPTIONS', 'Only supported game choices are accepted.');
  }
  if(d.id===OBSERVED_PLINKOX_ID)observedPlinkoXOptions(options);
  if(d.slotMechanic==='tumble')gatesMerlynOptions(options,d);
  if(d.id===COINS_ATLANTIS_ID)coinsAtlantisOptions(options);
  if(d.id===MARIACHI_COINS_ID)mariachiOptions(options);
  if(d.chargingFeature)chargingOptions(d,options);
  if(d.id===WHEEL_OF_DESTINY_ID&&options.bets!==undefined){
    if(!Array.isArray(options.bets))error('INVALID_WHEEL_BETS','A list of field allocations is required.');
  }
  if (d.family === 'ladder') get(d.id, options.mode);
  if (d.gamble?.enabled && options.holdWin !== undefined && typeof options.holdWin !== 'boolean') {
    error('INVALID_OPTIONS', 'The held-win choice must be a boolean.');
  }
  if (d.family === 'dice') {
    const target = options.target ?? d.defaultTarget;
    if (!Number.isInteger(target) || target < d.minTarget || target > d.maxTarget) {
      error('INVALID_TARGET', 'Choose a supported integer target.');
    }
  }
  return options;
}

function actionOptions(d, options, collecting = false) {
  const allowed = !collecting && ['ladder', 'mines'].includes(d.family) ? ['cell']
    : !collecting && d.gamble?.enabled ? ['color'] : [];
  if (!record(options) || Object.keys(options).some(key => !allowed.includes(key))) {
    error('INVALID_OPTIONS', 'Only the current round action is accepted.');
  }
  if (!collecting && d.gamble?.enabled && !d.gamble.choices.includes(options.color)) error('INVALID_OPTIONS', 'Choose red or black.');
  return options;
}

function acceptedBet(d, betMinor, options = {}) {
  return stake(betMinor, d.limits);
}

function maximumFor(d, bet, options = {}, context) {
  if(d.jungleFeature)return maximumJunglePayout(d,bet,options);
  if(d.chargingFeature)return maximumChargingPayout(d,bet,options,context);
  if(d.slotMechanic==='tumble')return maximumGatesMerlynPayout(d,bet,options);
  if(d.id===BOOK_BONANZA_ID)return maximumBookBonanzaPayout(d,bet);
  if(d.id===WHEEL_OF_DESTINY_ID)return maximumWheelOfDestinyPayout(d,bet,options);
  if(d.id===OBSERVED_PLINKOX_ID)return maximumObservedPlinkoXPayout(d,bet,options);
  if(d.id===COINS_ATLANTIS_ID)return maximumCoinsAtlantisPayout(d,bet,options);
  if(d.id===MARIACHI_COINS_ID)return maximumMariachiPayout(d,bet,options);
  if(d.id===POWER_TIGER_ID)return maximumPowerTigerPayout(d,bet);
  // Per-line floors precede the wheel multiplier in the actual slot engine.
  // Reserving an unrelated global maximum needlessly rejects smaller wagers.
  if (d.family === 'slots') {
    const lines = BigInt(d.paylines.length);
    return (lines * (BigInt(bet) * BigInt(largestSymbolPrize(d)) / (lines*BigInt(d.symbolPrizeDivisor??1))) * BigInt(largestWheel(d)) *
      BigInt(d.gamble?.enabled && options.holdWin === true ? 2 ** d.gamble.maxRounds : 1)).toString();
  }
  if (d.family === 'ladder') return payout(bet, d.multipliersBps.at(-1));
  if (d.family === 'dice') return payout(bet, Math.floor(d.returnBps * 100 / (options.target ?? d.defaultTarget)));
  return payout(bet, d.maximumMultiplierBps);
}

function checked(round) {
  if (!record(round)) error('INVALID_ROUND', 'A stored server round is required.');
  const d = get(round.gameId, round.mode);
  if (round.mathVersion !== d.mathVersion || round.family !== d.family ||
      !['active', 'lost', 'collected'].includes(round.status) ||
      !Array.isArray(round.history) || !Number.isSafeInteger(round.step) || round.step < 0 ||
      typeof round.betMinor !== 'string' || typeof round.winMinor !== 'string' ||
      !/^(0|[1-9][0-9]*)$/.test(round.winMinor) ||
      !Number.isSafeInteger(round.multiplierBps) || round.multiplierBps < 0) {
    error('INVALID_ROUND', 'Stored round identity or monetary state is invalid.');
  }
  acceptedBet(d, round.betMinor);
  if (round.status !== 'collected' && round.winMinor !== '0') error('INVALID_ROUND', 'Unsettled or lost rounds cannot contain a credited payout.');
  if(d.slotMechanic==='tumble')validateGatesMerlynRound(d,round);
  if(d.id===BOOK_BONANZA_ID)validateBookBonanzaRound(d,round);
  if(d.chargingFeature)validateChargingRound(d,round);
  const context=d.chargingFeature?{bucket:round.carryBucket,priorCarry:round.carryBefore}:undefined;
  const options = d.chargingFeature?{ante:round.ante,holdWin:round.holdWin===true}:d.slotMechanic==='tumble'||d.id===COINS_ATLANTIS_ID?{mode:round.mode}:d.id===WHEEL_OF_DESTINY_ID?{bets:round.bets}:d.id===OBSERVED_PLINKOX_ID?{risk:round.risk,ballAmount:round.ballAmount}:d.family === 'dice' ? {target: round.outcome?.target} : d.gamble?.enabled ? {holdWin: round.holdWin === true} : {};
  if (d.family === 'dice') startOptions(d, options);
  if (BigInt(round.winMinor) > BigInt(maximumFor(d, round.betMinor, options,context))) error('INVALID_ROUND', 'Stored payout exceeds the accepted model bound.');
  if (d.family === 'slots') validateHeldSlot(d, round, maximumFor(d, round.betMinor,d.chargingFeature?{ante:round.ante}: {},context));
  if(d.id===POWER_TIGER_ID)validatePowerTigerRound(d,round);
  if(d.id===COINS_ATLANTIS_ID)validateCoinsAtlantisRound(d,round);
  if(d.id===MARIACHI_COINS_ID)validateMariachiRound(d,round);
  if(d.jungleFeature)validateJungleRound(d,round);
  if(d.id===OBSERVED_PLINKOX_ID)validateObservedPlinkoXRound(d,round);
  if(d.id===WHEEL_OF_DESTINY_ID)validateWheelOfDestinyRound(d,round);
  if (d.id === PLINKO_CLASSIC && (!d.ballMultipliers.includes(round.ballMultiplier) ||
      round.totalBetMinor !== round.betMinor || round.baseBetMinor !== round.betMinor ||
      round.outcome?.ballMultiplier !== round.ballMultiplier || round.outcome?.totalBetMinor !== round.betMinor ||
      round.outcome?.baseBetMinor !== round.baseBetMinor ||
      !d.ballSelection.some(ball=>ball.type===round.outcome?.ballType&&ball.multiplier===round.ballMultiplier) ||
      round.outcome?.bucketMultiplierBps!==d.bucketMultipliersBps[round.outcome?.bucket] ||
      round.multiplierBps!==round.outcome.bucketMultiplierBps*round.ballMultiplier ||
      round.winMinor!==payout(round.betMinor,round.multiplierBps))) error('INVALID_ROUND', 'The stored colored-ball award is inconsistent.');
  if (d.family === 'ladder') {
    if (!Array.isArray(round.private?.survival) || round.private.survival.length !== d.multipliersBps.length ||
        round.private.survival.some(value => typeof value !== 'boolean') ||
        round.step < 1 || round.step > d.multipliersBps.length || round.history.length !== round.step) {
      error('INVALID_ROUND', 'Stored ladder progress is invalid.');
    }
  }
  if (d.family === 'mines') {
    const mines = round.private?.mines;
    if (!Array.isArray(mines) || mines.length !== d.mines || new Set(mines).size !== d.mines ||
        mines.some(cell => !Number.isSafeInteger(cell) || cell < 0 || cell >= d.cells) ||
        round.step > d.maxPicks || round.history.length !== round.step) error('INVALID_ROUND', 'Stored mine-board progress is invalid.');
  }
  if(d.crashMechanic==='cascade')validatePopxCascade(d,round);
  if (d.family === 'crash' && d.crashMechanic!=='cascade' && (!Number.isSafeInteger(round.private?.bustMultiplierBps) ||
      round.private.bustMultiplierBps < 1 || round.private.bustMultiplierBps > d.maxMultiplierBps + 1 ||
      !Number.isSafeInteger(round.startedAt) || !Number.isSafeInteger(round.lastObservedAt) ||
      round.startedAt < 0 || round.lastObservedAt < round.startedAt || round.step > 1)) {
    error('INVALID_ROUND', 'Stored crash progress is invalid.');
  }
  return d;
}

function result(round) { checked(round); return round; }

export function startRound({gameId, betMinor, options = {}, context, rng, now} = {}) {
  const initial = get(gameId);
  startOptions(initial, options);
  const d = get(gameId, options.mode);
  betMinor = acceptedBet(d, betMinor, options);
  if(d.chargingFeature)return result(holdSlotWin(d,startChargingWilds(d,{betMinor,options,context,rng}),options.holdWin));
  if(d.slotMechanic==='tumble')return result(startGatesOfMerlyn(d,{betMinor,rng,options}));
  if(d.id===BOOK_BONANZA_ID)return result(startBookOfBonanza(d,{betMinor,rng}));
  if(d.id===POWER_TIGER_ID)return result(startPowerOfTiger(d,{betMinor,rng}));
  if(d.id===COINS_ATLANTIS_ID)return result(startCoinsOfAtlantis(d,{betMinor,rng,options}));
  if(d.id===MARIACHI_COINS_ID)return result(holdSlotWin(d,startMariachiCoins(d,{betMinor,rng,options}),options.holdWin));
  if(d.jungleFeature)return result(holdSlotWin(d,startJungleSisters(d,{betMinor,rng}),options.holdWin));
  if(d.id===OBSERVED_PLINKOX_ID)return result(startObservedPlinkoX(d,{betMinor,rng,options}));
  if(d.id===WHEEL_OF_DESTINY_ID)return result(startWheelOfDestiny(d,{betMinor,rng,options}));
  if (d.family === 'slots') return result(holdSlotWin(d,
    d.id===MULTI_HOT_WAYS_ID ? startObservedRegularWays(d,{betMinor,rng}) : d.ways ? startObservedWildWays(d,{betMinor,rng}) : d.wildSymbol ? startPublicWildSlot(d, {betMinor, rng}) : d.cols===3 ? startThreeReelSlot(d,{betMinor,rng}) : startSlot(d, {betMinor, rng}), options.holdWin));
  if(d.crashMechanic==='cascade')return result(startPopxCascade(d,{betMinor,rng,now}));
  if (d.family === 'crash') return result(startCrash(d, {betMinor, rng, now}));
  if (d.family === 'ladder') return result({...startLadder(d, {betMinor, rng}), mode: options.mode ?? d.defaultMode ?? 'easy'});
  if (d.family === 'mines') return result(startMines(d, {betMinor, rng}));
  const instant = startInstant(d, {betMinor, options, rng});
  if (d.id !== PLINKO_CLASSIC) return result(instant);
  const ticket=draw(rng,d.ballSelection.reduce((sum,ball)=>sum+ball.weight,0));
  let cursor=0;
  const ball=d.ballSelection.find(candidate=>(cursor+=candidate.weight)>ticket);
  const factors = {ballMultiplier:ball.multiplier, baseBetMinor:betMinor, totalBetMinor:betMinor};
  const multiplierBps=instant.multiplierBps*ball.multiplier, winMinor=payout(betMinor,multiplierBps);
  return result({...instant, ...factors,multiplierBps,winMinor,
    outcome: {...instant.outcome, ...factors,ballType:ball.type,bucketMultiplierBps:instant.multiplierBps,multiplierBps}});
}

export function advanceRound(round, options = {}, now, rng) {
  const d = checked(round);
  actionOptions(d, options);
  if (d.gamble?.enabled) return result(gambleSlotWin(d, round, options, rng));
  if(d.crashMechanic==='cascade'){
    if(round.status!=='active')error('ROUND_FINISHED','This cascade round has settled.');
    return result(syncPopxCascade(d,round,now));
  }
  if (d.family === 'crash') return result(advanceCrash(d, round, options, now));
  if (d.family === 'ladder') return result(advanceLadder(d, round, options));
  if (d.family === 'mines') return result(advanceMines(d, round, options));
  error('ROUND_FINISHED', 'This round has settled.');
}

export function collectRound(round, options = {}, now) {
  const d = checked(round);
  actionOptions(d, options, true);
  if (d.gamble?.enabled) return result(collectSlotWin(d, round));
  if(d.crashMechanic==='cascade')return result(collectPopxCascade(d,round,now));
  if (d.family === 'crash') return result(collectCrash(d, round, options, now));
  if (d.family === 'ladder') return result(collectLadder(d, round));
  if (d.family === 'mines') return result(collectMines(d, round));
  error('ROUND_FINISHED', 'This round has settled.');
}

export function publicRound(round, now) {
  const d = checked(round);
  let view;
  if(d.slotMechanic==='tumble')view=publicGatesMerlynRound(d,round);
  else if(d.id===BOOK_BONANZA_ID)view=publicBookBonanzaRound(d,round);
  else if(d.id===COINS_ATLANTIS_ID)view=publicCoinsAtlantisRound(d,round);
  else if(d.id===MARIACHI_COINS_ID)view=publicMariachiRound(d,round);
  else if(d.jungleFeature)view=publicJungleRound(d,round);
  else if (d.family === 'slots') view = d.gamble?.enabled ? publicHeldSlot(d, round) : publicSlot(round);
  else if(d.crashMechanic==='cascade')view=publicPopxCascade(d,round,now);
  else if (d.family === 'crash') view = publicCrash(d, round, now);
  else if (d.family === 'ladder') view = {...publicLadder(d, round), mode: round.mode ?? d.defaultMode ?? 'easy'};
  else if (d.family === 'mines') view = publicMines(d, round);
  else view = publicInstant(round);
  if(d.id===WHEEL_OF_DESTINY_ID)view.bets=structuredClone(round.bets);
  if(d.id===OBSERVED_PLINKOX_ID)Object.assign(view,{risk:round.risk,ballAmount:round.ballAmount,perBallBetMinor:round.perBallBetMinor,totalBetMinor:round.totalBetMinor});
  if(d.slotMechanic==='tumble')Object.assign(view,{mode:round.mode,baseBetMinor:round.baseBetMinor,totalBetMinor:round.totalBetMinor,costBps:round.costBps});
  if(d.chargingFeature)Object.assign(view,{ante:round.ante,baseBetMinor:round.baseBetMinor,totalBetMinor:round.totalBetMinor,
    carryBucket:structuredClone(round.carryBucket),carryBefore:structuredClone(round.carryBefore),carryAfter:structuredClone(round.carryAfter)});
  if (d.id === PLINKO_CLASSIC) Object.assign(view, {ballMultiplier: round.ballMultiplier,
    baseBetMinor: round.baseBetMinor, totalBetMinor: round.totalBetMinor});
  // Renderer mutation must never alter the stored result or future outcomes.
  return structuredClone(view);
}

export function reconcileRound(round, now) {
  const d = checked(round);
  if(d.crashMechanic==='cascade')return round.status==='active'?result(syncPopxCascade(d,round,now)):round;
  return d.family === 'crash' && round.status === 'active' ? result(syncCrash(d, round, now)) : round;
}

export function maximumPayoutMinor({gameId, betMinor, options = {},context} = {}) {
  const initial = get(gameId);
  startOptions(initial, options);
  const d = get(gameId, options.mode);
  return maximumFor(d, acceptedBet(d, betMinor, options), options,context);
}

export function modelAuditMatrix() {
  return definitions.map(d => {
    const costFeature=d.tumbleFeature??d.coinFeature;
    const optionSets = d.chargingFeature?d.chargingFeature.anteValues.flatMap(ante=>[{ante,holdWin:false},{ante,holdWin:true}]):costFeature?costFeature.modes.map(mode=>({mode})):d.family === 'ladder' ? (d.modes ?? ['easy']).map(mode => ({mode}))
      : d.family === 'dice' ? Array.from({length: d.maxTarget - d.minTarget + 1}, (_, i) => ({target: d.minTarget + i}))
      : d.gamble?.enabled ? [{holdWin: false}, {holdWin: true}]
      : [{}];
    return {
      id: d.id, title: d.catalogName, family: d.family, mathVersion: d.mathVersion,
      layout: structuredClone(d.layout), independentReturn: structuredClone(d.nominalReturn ?? null),
      optionPayoutBounds: optionSets.map(options => {
        const step=d.chargingFeature?BigInt(d.chargingFeature.totalStakeStepMinor[options.ante]):costFeature?BigInt(costFeature.totalStakeStepMinor[options.mode]):BigInt(d.limits.betStepMinor);
        const minimumStakeMinor=costFeature||d.chargingFeature?step.toString():d.limits.minBetMinor;
        const maximumStakeMinor=(BigInt(d.limits.maxBetMinor)/step*step).toString();
        const contextFor=bet=>d.chargingFeature?{bucket:chargingCarryBucket(d,bet,options),priorCarry:emptyChargingCarry()}:undefined;
        return{options,minimumStakeMinor,maximumStakeMinor,
          ...(d.chargingFeature?{payoutBoundScope:'fresh-carry-only'}:{}),
          minimumStakeMaximumPayoutMinor:maximumPayoutMinor({gameId:d.id,betMinor:minimumStakeMinor,options,context:contextFor(minimumStakeMinor)}),
          maximumStakeMaximumPayoutMinor:maximumPayoutMinor({gameId:d.id,betMinor:maximumStakeMinor,options,context:contextFor(maximumStakeMinor)})};
      }),
      fullReferenceParityVerified: false, providerPrivateMathVerified: false,
    };
  });
}
