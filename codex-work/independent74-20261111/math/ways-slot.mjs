// Observed 3-by-3 geometry and documented 27 ways, with independent prizes and
// probabilities. This does not infer an award basis from provider LinePlay.
import {startPublicWildSlot} from './official72-mechanics.mjs';

export const OBSERVED_WILD_WAYS_ID = 'ind74_official_multihotwildways';
export function configureObservedWildWays(definition) {
  if (definition?.id !== OBSERVED_WILD_WAYS_ID || definition.family !== 'slots') {
    throw new TypeError('The observed Multi Hot Wild Ways definition is required.');
  }
  definition.mathVersion = 'official72-multihotwildways-r3';
  definition.model = 'independent-three-reel-27-ways';
  definition.rows = 3; definition.cols = 3; definition.ways = 27;
  // Internal paths enumerate all3^3 combinations; they are not a fixed-line
  // chart. Each way selects one position from each consecutive reel.
  definition.paylines = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
    definition.paylines.push([a,b,c]);
  }
  definition.symbols = definition.symbols.map(symbol => ({...symbol,pays:{3:symbol.pays[3]}}));
  definition.wildSymbol = {id:'multihotwildways-wild',label:'Wild',glyph:'W'};
  definition.wildRule = {columns:[0,1,2],substitutesRegularSymbols:true,expandWhenWinning:false,
    expansionEvaluation:'none',allWildAward:'highest-eligible-symbol-award',regularSymbolWeight:32,wildWeight:1,
    probabilityModel:'independent-per-cell-tickets',providerProbabilitiesVerified:false};
  definition.multiplierValues = [1,2,3,4,5];
  definition.rules = [
    'The observed official demo has three reels and three rows, a left multiplier reel, and an explicit27WAYS label. All20 recorded result grids contain nine symbols.',
    'The official public rule pays matching symbols from consecutive reels beginning at the leftmost reel. Selecting one row from each of three reels gives27 possible ways. Wild substitutes for regular symbols.',
    'This independent model evaluates each of the27 row combinations exactly once. A matching three-symbol way pays floor(total stake × the authored symbol prize /27); way awards add, then the server multiplier applies.',
    'An all-wild way receives the highest eligible regular-symbol award once. No vertical wild expansion is inferred for this title.',
    'The official English Help lists five possible factors: 1x, 2x, 3x, 4x and 5x. All five also occurred in recorded public results. This independent implementation gives them equal probability; the provider distribution remains unverified.',
    'Symbol prizes, total-stake/27 award allocation, all-wild treatment and per-cell ticket probabilities are operator choices. The static Help document does not establish the complete provider award basis, symbol-ID mapping or probabilities.',
    'The raw provider LinePlay value1 is a betting field. It is not treated as one payline, nor as evidence of27 fixed paylines. Gamble and complete provider bonus behavior remain unimplemented or unverified.',
  ];
  definition.provenance = {...definition.provenance,
    observed:'Twenty official DEMO results with nine symbols each; rendered3×3 grid, left multiplier reel and27WAYS label.',
    geometrySource:'reports/current74-evidence-slots-remaining/ind74_official_multihotwildways-initial.png',
    publicWaysSource:'https://www.smartsoftgaming.com/games/multi-hot-wild-ways',
    publicHelpSource:'references/official-slot-help-en-20261111.json:help.slots.multihotwildways.ways.to.pay.description',
    designed:'Independent regular-symbol awards,27-way stake allocation, wild tickets, highest-award all-wild treatment and uniform multiplier distribution.'};
  return definition;
}

export function startObservedWildWays(definition, options) {
  const round = startPublicWildSlot(definition, options);
  return {...round,outcome:{...round.outcome,ways:27,winningWaysCount:round.outcome.lineWins.length}};
}
