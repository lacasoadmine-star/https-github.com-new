// Public player-facing X2 rules, with explicitly independent operator choices.
// Public pages establish the optional color gamble and collect action only;
// they do not establish card probabilities or the number of allowed attempts.
const SOURCES = Object.freeze({
  ind74_official_multihot5wild: Object.freeze({
    url: 'https://www.smartsoftgaming.com/games/multi-hot-5-wild',
    mathVersion: 'official72-multihot5wild-r5',
  }),
  ind74_official_multihot5burnwilds: Object.freeze({
    url: 'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds',
    mathVersion: 'official72-multihot5burnwilds-r4',
  }),
});

export function configurePublicColorGamble(definition) {
  const source = SOURCES[definition?.id];
  if (!source || definition.family !== 'slots' || !Array.isArray(definition.rules)) {
    throw new TypeError('A documented independent wild-slot definition is required.');
  }
  definition.mathVersion = source.mathVersion;
  definition.gamble = {
    enabled: true, maxRounds: 3, choices: ['red', 'black'], startOption: 'holdWin',
    probabilityModel: 'independent-fair-color', providerLimitVerified: false,
    source: source.url, evidenceKind: 'official-public-document',
    rule: 'Correct color doubles the held award; incorrect color loses it. Collect is available before each attempt. The independently selected three-attempt limit automatically collects the final success.',
  };
  definition.rules.push(
    'The official public page advertises X2: guess the color of a flashing card to double a winning award, or collect it.',
    'Choose holdWin before the spin to retain a winning award for red/black X2 or immediate collection. No additional stake is debited.',
    'This independent implementation uses equally likely red/black cards and at most three attempts. The final success collects automatically. These probabilities, attempt limit and pre-spin hold control are operator choices; provider equivalence is not established.',
  );
  definition.provenance = {...definition.provenance, publicGambleSource: source.url,
    gambleProbabilitySource: 'Independent fair-color draws; provider probabilities and limits unverified.'};
  return definition;
}
