// Public player-facing X2 rules, with explicitly independent operator choices.
// Public pages establish the optional color gamble and collect action only;
// they do not establish card probabilities or the number of allowed attempts.
const HELP_FILE = 'references/official-slot-help-en-20261111.json';
const documented = (title, version, page, caption = 'double.gamble.description', helpDocument) => Object.freeze({
  url: 'https://www.smartsoftgaming.com/games/' + page,
  mathVersion: 'official72-' + title + '-r' + version,
  evidenceFile: HELP_FILE,
  captionKey: 'help.slots.' + title + '.' + caption,
  ...(helpDocument ? {helpDocument} : {}),
});
const SOURCES = Object.freeze({
  ind74_official_sugarfiesta:Object.freeze({
    ...documented('sugarfiesta',4,'sugar-fiesta'),
    evidenceFile:'reports/current74-evidence-slots-secondary/ind74_official_sugarfiesta-official-help-en.json',
    captionKey:'help.slots.SugarFiesta.double.gamble.description',
  }),
  ind74_official_dragonscode: Object.freeze({
    ...documented('dragonscode',4,'dragons-code'),
    evidenceFile:'reports/current74-evidence-slots-secondary/ind74_official_dragonscode-official-help-en.json',
  }),
  ind74_official_multifruitschargingwilds: documented('multifruitschargingwilds', 5, 'multi-fruits-charging-wilds'),
  ind74_official_gemscrownchargingwilds: documented('gemscrownchargingwilds', 6, 'gems-crown-charging-wilds'),
  ind74_official_dicejungle: documented('dicejungle', 4, 'dice-jungle'),
  ind74_official_hotsamba: documented('hotsamba', 3, 'hot-samba'),
  ind74_official_baoslot5x: documented('baoslot5x', 4, 'bao-slot-5x'),
  ind74_official_farmsfortune: documented('farmsfortune', 4, 'farms-fortune-6n0s6'),
  ind74_official_draculasfortune: documented('draculasfortune', 3, 'draculas-fortune-2'),
  ind74_official_vampires: Object.freeze({
    ...documented('vampires',3,'vampires','riskGame.description'),
    evidenceFile:'reports/current74-evidence-slots-secondary/ind74_official_vampires-official-help-en.json',
    helpDocument:'reports/current74-evidence-slots-secondary/ind74_official_vampires-official-help.html',
    providerCollectControlVerified:false,
    publicRule:'The active Vampires Help describes red/black RISK GAME: a correct choice doubles the gambling amount and an incorrect choice loses it. This independent implementation also permits collection of the held award; the provider collect-control details are not established by that caption.',
  }),
  ind74_official_bookoffuturia: Object.freeze({
    ...documented('bookoffuturia',3,'book-of-futuria'),
    captionKey:'help.slot.bookoffuturia.x2.description',
    evidenceFile:'references/official-bookoffuturia-help-en-20261111.json',
    helpDocument:'reports/current74-evidence-slots-secondary/ind74_official_bookoffuturia-official-help.html',
  }),
  // Both exact title Help documents use this literal case-sensitive caption.
  ind74_official_junglesisters: Object.freeze({
    ...documented('junglesisters',3,'jungle-sisters'),
    captionKey:'help.slots.jungleSisters.risk.game.description',
    helpDocument:'reports/current74-evidence-slots-secondary/ind74_official_junglesisters-official-help.html',
  }),
  ind74_official_junglesistersdeluxe: Object.freeze({
    ...documented('junglesistersdeluxe',4,'jungle-sisters-deluxe'),
    captionKey:'help.slots.jungleSisters.risk.game.description',
    helpDocument:'reports/current74-evidence-slots-secondary/ind74_official_junglesistersdeluxe-official-help.html',
  }),
  ind74_official_multihot20: documented('multihot20', 4, 'multi-hot-20'),
  ind74_official_multihot10: documented('multihot10', 4, 'multi-hot-10-2'),
  ind74_official_multihot40: documented('multihot40', 3, 'multi-hot-40'),
  ind74_official_multihotwildways: documented('multihotwildways', 4, 'multi-hot-wild-ways'),
  ind74_official_multihot5deluxe: documented('multihot5deluxe', 4, 'multi-hot-5-deluxe'),
  // This exact Jingle Help document uses the following literal Dracula caption;
  // the mapping is present in its saved HTML, not a guessed title alias.
  ind74_official_jinglebellbonanza: Object.freeze({
    ...documented('jinglebellbonanza', 4, 'jingle-bell-bonanza'),
    captionKey: 'help.slots.draculasfortune.double.gamble.description',
    helpDocument: 'reports/current74-evidence-slots-remaining/ind74_official_jinglebellbonanza-official-help.html',
  }),
  ind74_official_multihot5superwilds: documented('multihot5superwilds', 3, 'multi-hot-5-super-wilds'),
  ind74_official_safarisimba: documented('safarisimba', 4, 'safari-simba-2'),
  ind74_official_multihotways: documented('multihotways', 4, 'multi-hot-ways', 'cards.description'),
  ind74_official_multihot5wild: Object.freeze({
    url: 'https://www.smartsoftgaming.com/games/multi-hot-5-wild',
    mathVersion: 'official72-multihot5wild-r5',
  }),
  ind74_official_multihot5burnwilds: Object.freeze({
    url: 'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds',
    mathVersion: 'official72-multihot5burnwilds-r5',
  }),
});

export const PUBLIC_COLOR_GAMBLE_IDS = Object.freeze(Object.keys(SOURCES));

export function configurePublicColorGamble(definition) {
  const source = SOURCES[definition?.id];
  if (!source || definition.family !== 'slots' || !Array.isArray(definition.rules)) {
    throw new TypeError('A documented independent slot definition is required.');
  }
  definition.mathVersion = source.mathVersion;
  definition.gamble = {
    enabled: true, maxRounds: 3, choices: ['red', 'black'], startOption: 'holdWin',
    probabilityModel: 'independent-fair-color', providerLimitVerified: false,
    source: source.url, evidenceKind: 'official-public-document',
    ...(source.evidenceFile ? {evidenceFile: source.evidenceFile, captionKey: source.captionKey} : {}),
    ...(source.helpDocument ? {helpDocument: source.helpDocument} : {}),
    ...(source.providerCollectControlVerified===false?{providerCollectControlVerified:false}:{}),
    rule: 'Correct color doubles the held award; incorrect color loses it. Collect is available before each attempt. The independently selected three-attempt limit automatically collects the final success.',
  };
  definition.rules.push(
    source.publicRule??'The official public rules describe X2: guess the color of a flashing card to double a winning award, or collect it.',
    'Choose holdWin before the spin to retain a winning award for red/black X2 or immediate collection. No additional stake is debited.',
    'This independent implementation uses equally likely red/black cards and at most three attempts. The final success collects automatically. These probabilities, attempt limit and pre-spin hold control are operator choices; provider equivalence is not established.',
  );
  definition.provenance = {...definition.provenance, publicGambleSource: source.url,
    gambleProbabilitySource: 'Independent fair-color draws; provider probabilities and limits unverified.'};
  return definition;
}
