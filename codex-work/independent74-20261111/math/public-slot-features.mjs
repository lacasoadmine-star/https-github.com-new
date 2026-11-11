// Public wild participation/expansion rules only. The operator reel charts,
// symbol awards, probabilities and repeated-expansion order remain independent.
const FEATURES = Object.freeze({
  ind74_official_coinsofatlantis: Object.freeze({
    source: 'https://www.smartsoftgaming.com/games/coins-of-atlantis',
    version: 'official72-coinsofatlantis-r3', label: 'Atlantis Wild', maximumWheel: 1,
    missing: 'The separately advertised coin respin, bonus purchase and full-board coin doubling are not implemented by this regular-spin feature.',
  }),
  ind74_official_jinglebellbonanza: Object.freeze({
    source: 'https://www.smartsoftgaming.com/games/jingle-bell-bonanza',
    version: 'official72-jinglebellbonanza-r3', label: 'Jingle Wild', maximumWheel: 5,
    missing: 'The advertised scatter awards and complete provider bonus behavior remain unverified and are not implemented by this regular-spin feature.',
  }),
  ind74_official_farmsfortune: Object.freeze({
    source: 'https://www.smartsoftgaming.com/games/farms-fortune-6n0s6',
    version: 'official72-farmsfortune-r3', label: 'Farmer Wild', maximumWheel: 5,
    missing: 'The advertised scatter bonuses, bonus purchase and gamble are not implemented by this regular-spin feature.',
  }),
});

export const PUBLIC_EXPANDING_WILD_IDS = Object.freeze(Object.keys(FEATURES));

export function configurePublicSlotFeatures(definition) {
  const feature = FEATURES[definition?.id];
  if (!feature || definition.family !== 'slots' || definition.cols !== 5 ||
      !Array.isArray(definition.symbols) || !Array.isArray(definition.paylines)) {
    throw new TypeError('A documented five-reel expanding-wild model is required.');
  }
  definition.mathVersion = feature.version;
  definition.wildSymbol = {id: definition.id.slice('ind74_official_'.length) + '-wild', label: feature.label, glyph: 'W'};
  definition.wildRule = {
    columns: [1, 2, 3], substitutesRegularSymbols: true, expandWhenWinning: true,
    expansionEvaluation: 'initial-winning-lines-only', allWildAward: 'highest-eligible-symbol-award',
    regularSymbolWeight: 32, wildWeight: 1, probabilityModel: 'independent-per-cell-tickets',
    providerProbabilitiesVerified: false, source: feature.source,
  };
  definition.multiplierValues = Array.from({length: feature.maximumWheel}, (_, index) => index + 1);
  definition.rules = [
    `This independent ${definition.cols}-reel, ${definition.rows}-row model uses ${definition.paylines.length} independently authored paylines and symbol awards. The complete provider geometry and line chart are not established.`,
    'The official public rule restricts wilds to reels 2, 3 and 4. A wild substitutes for a regular symbol and expands vertically when participating in a winning combination.',
    'This implementation identifies wilds in the initial winning lines, fills those columns with wilds, and evaluates all paylines once more. Repeated provider expansion ordering remains unverified.',
    feature.maximumWheel === 5
      ? 'The official page advertises a multiplier up to 5x. This independent implementation uses equally likely factors 1x through 5x; their exact provider labels and probabilities remain unverified.'
      : 'This regular-spin feature uses a neutral 1x multiplier. No additional provider multiplier behavior is inferred.',
    `Each eligible cell has ${definition.symbols.length * 32} independent regular-symbol tickets and one wild ticket. These probabilities, line chart and symbol awards are operator choices, not recovered provider mathematics.`,
    feature.missing,
  ];
  definition.provenance = {...definition.provenance, publicExpandingWildSource: feature.source,
    designed: 'Documented wild reel restriction and winning-participation expansion; independently authored awards, line chart, probability distribution and one-pass expansion order.'};
  return definition;
}
