// Public presentation evidence only. These records do not supply provider
// probabilities, reel strips, paylines or certified return percentages.
const publishedReelLayout=(rows,columns,source,paylines)=>Object.freeze({rows,columns,source,paylines,
  evidence:`The official public page specifies ${columns} reels and ${rows} rows${paylines?` with ${paylines} fixed paylines`:''}.`,
  limitations:Object.freeze(['The complete provider payline chart, symbol probabilities, bonus mechanics, artwork and certified RTP remain unverified.'])});
export const OBSERVED_LAYOUTS = Object.freeze({
  ind74_official_dragonscode:Object.freeze({rows:4,columns:5,paylines:50,multiplierPlacement:'top-arc',
    observedMultiplierValues:Object.freeze([1,2,5]),completeMultiplierLabelsVerified:false,
    source:'reports/current74-evidence-slots-secondary/ind74_official_dragonscode-initial.png',
    evidence:'The actual official DEMO screenshot shows5 reels and4 rows,20 symbol cells. Native canvas2170×1220. Exact title Help describes a50-payline slot. The top arc visibly shows1x,2x and5x.',
    limitations:Object.freeze(['The full provider payline chart and symbol prizes are not established.','Multiplier, Wild, Golden Egg, respin, buy feature and Gamble remain unimplemented by this regular-symbol fallback.','Geometry is observed; provider probabilities and complete audiovisual/feature equivalence are unverified.'])}),

  ind74_official_wheelofdestiny:Object.freeze({sectors:50,
    source:'references/wheel-of-destiny-display-20261111.json',
    evidence:'The public main-wheel display array has50 entries with7.2degree positions and is used to render the target matching the server result. The separate betting grid has nine fields, not nine wheel segments. Matched3x and unmatched losses were directly observed.',
    limitations:Object.freeze(['Uniform50 outcome tickets are independent operator probabilities, not inferred provider probabilities.','Nine multiplier fields and documented BONUS/DOUBLE transitions are implemented with independently authored uniform segment probabilities.','BONUS was not triggered in the twenty regular-only observed rounds; its rules and display tables are documented, while native feature outcomes and full artwork/audio/control parity remain unverified.'])}),

  ind74_official_plinkox:Object.freeze({rows:16,buckets:17,
    source:'reports/current74-evidence/plinkox-low-ready-desktop-dpr1.png',
    evidence:'The official non-Classic Plinko X LOW screen shows16 peg rows,17 buckets, pink1x/yellow5x/blue10x legend, VersionLOW/MEDIUM/HIGH and ball Amount1/5/10/25. Twenty LOW single-ball debits/results/credited balances were verified. Later read-only rendered-caption inspection verified Medium/High bucket tables without further wagers.',
    limitations:Object.freeze(['All three17-bucket tables are verified from rendered captions/screenshots. Only LOW single-ball outcomes were directly played; Medium/High outcomes remain unobserved.','Paths, color selection and atomic total-stake batch settlement are independent operator choices; native multi-ball accounting was not played.','Provider probabilities, exact artwork/audio, recovery and complete parity remain unverified.'])}),

  ind74_official_chickenhighway:Object.freeze({steps:25,modeStepCounts:Object.freeze({easy:25,medium:23,hard:19}),
    observedMultipliersBps:Object.freeze([10200]),
    source:'reports/current74-evidence-nonslots/ind74_official_chickenhighway-display-tables.json',
    evidence:'The official road presentation source specifies25 EASY,23 MEDIUM and19 HARD lanes and exact coefficient arrays. First EASY1.02x crossing/cashout was directly observed; later coefficients are display-source facts.',
    limitations:Object.freeze(['The directly played first EASY crossing does not prove all future lane outcomes or other difficulties.','Provider survival probabilities, full visual/audio parity, native autoplay and8second-disconnection cashout remain unverified or unimplemented.'])}),

  ind74_official_coinsofatlantis:Object.freeze({rows:4,columns:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_coinsofatlantis-initial.png',
    evidence:'The official DEMO initial screen directly shows five columns and four rows, including coin and wild symbols. The regular/+1/MINI/MAJOR respin subset follows separate English Help documents.',
    limitations:Object.freeze(['The exact provider line chart and count remain unverified.','MEGA/GRAND jackpot grouping, buy/ANTE features, provider probabilities and base/feature ordering remain unimplemented or unverified.'])}),
  ind74_official_multihotways:Object.freeze({rows:3,columns:3,ways:27,multiplierPlacement:'left-reel',
    observedMultiplierValues:Object.freeze([1,2,3,4,5]),completeMultiplierLabelsVerified:true,
    source:'reports/current74-evidence-slots-remaining/ind74_official_multihotways-journal.json',
    evidence:'Twenty completed official DEMO result grids contain nine symbols and rendered positions show3×3. Exact MultiHotWays Help documents27 Reel Ways Pay and a left1x–5x multiplier.',
    limitations:Object.freeze(['Provider LinePlay1 is a betting field, not a payline count.','Conditional same-symbol x2 and separate red/black X2 Gamble remain unimplemented.','The provider award basis, symbol prizes and probabilities remain unverified; no Wild substitution is inferred from a different title.'])}),
  ind74_official_multifruitschargingwilds:Object.freeze({rows:3,columns:3,paylines:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_multifruitschargingwilds-journal.json',
    evidence:'Twenty completed official DEMO result grids contain nine symbols and rendered positions show3×3. Exact MultiFruitsChargingWilds Help specifies five fixed active paylines.',
    limitations:Object.freeze(['Persistent charging Wilds across paid spins and saved state per bet are documented but not implemented.','The retained financial transaction must atomically save and restore that feature state.','Provider line chart, prizes, probabilities, ante bet and feature purchase remain unverified or unimplemented.'])}),
  ind74_official_gemscrownchargingwilds:Object.freeze({rows:3,columns:3,paylines:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_gemscrownchargingwilds-journal.json',
    evidence:'Twenty completed official DEMO result grids contain nine symbols and rendered positions show3×3. Exact GemsCrownChargingWilds Help specifies five fixed active paylines.',
    limitations:Object.freeze(['Persistent charging Wilds across paid spins and saved state per bet are documented but not implemented.','The retained financial transaction must atomically save and restore that feature state.','Provider line chart, prizes, probabilities, ante bet and feature purchase remain unverified or unimplemented.'])}),

  ind74_official_poweroftiger:Object.freeze({rows:3,columns:3,paylines:5,multiplierPlacement:'top-arc',
    observedMultiplierValues:Object.freeze([20]),completeMultiplierLabelsVerified:false,
    source:'reports/current74-evidence-slots-remaining/ind74_official_poweroftiger-journal.json',
    evidence:'The official DEMO shows a3-by-3 grid and a top20X sign. Five completed returned public results contain9symbols each. The public page lists5active paylines.',
    limitations:Object.freeze(['The20X sign alone does not establish a feature trigger or probability. The conditional multiplier and respin structure come from the separate official public rules.','The line chart, symbol prizes, probabilities, initial respin holds and base-plus-feature aggregation remain independent or unverified.'])}),
  ind74_official_multihotwildways:Object.freeze({rows:3,columns:3,ways:27,multiplierPlacement:'left-reel',
    observedMultiplierValues:Object.freeze([1,2,3,4,5]),completeMultiplierLabelsVerified:true,
    source:'reports/current74-evidence-slots-remaining/ind74_official_multihotwildways-journal.json',
    evidence:'The initial official DEMO screen shows3reels,3rows,27WAYS and a left multiplier reel. Twenty returned public result grids contain9symbols each; result factors1x,2x,3x,4x,5x were recorded.',
    limitations:Object.freeze(['Provider LinePlay1 is a betting field, not a payline count.','The provider symbol-ID mapping, award basis, probabilities and full bonus behavior remain unverified.27-way allocation and awards are independently authored.'])}),
  ind74_official_mineisland:Object.freeze({steps:10,
    observedMultipliersBps:Object.freeze([11000,12000,15000,20000,30000,50000,100000,200000,500000,1000000]),
    source:'reports/current74-evidence-nonslots/ind74_official_mineisland-initial.png',
    evidence:'The official MineIsland demo shows ten ascending platforms from 1.1x to 100x, an ocean, kangaroo and TNT barrels. A first PLAY attempt was observed to lose and return to PLAY.',
    limitations:Object.freeze(['The marketing page instead describes a rectangular tile/mines game; this conflict is unresolved.','Original-demo continuation controls, provider survival probabilities, rare features, exact artwork and audio remain unverified.'])}),
  ind74_official_mineisland2:Object.freeze({steps:10,
    observedMultipliersBps:Object.freeze([11000,12000,15000,20000,30000,50000,100000,200000,500000,1000000]),
    source:'reports/current74-evidence/mineisland2-initial.png',
    evidence:'The official MineIsland2 EASY demo shows ten ascending platforms from 1.1x to 100x. PLAY resolves a first jump; a successful first step can COLLECT 1.10 DMO from a 1.00 DMO stake.',
    limitations:Object.freeze(['Medium and hard multipliers, boost/portal mechanics and survival probabilities remain independently authored or unverified.'])}),
  ind74_official_dicejungle:Object.freeze({rows:3,columns:5,
    source:'https://www.smartsoftgaming.com/games/dice-jungle',
    evidence:'The official public page describes a 5x3 dice grid and a synchronized horizontal multiplier reel above it, with awards boosted by up to 5x.',
    limitations:Object.freeze(['The complete provider hold-and-spin rules, paytable, multiplier labels and probabilities remain unverified.'])}),
  ind74_official_popx:Object.freeze({rows:5,columns:6,
    source:'https://www.smartsoftgaming.com/games/popx',
    evidence:'The official public page specifies a 6-by-5 grid, eleven symbols, and matches of eight or more identical symbols anywhere. The official screenshot confirms six columns and five rows.',
    limitations:Object.freeze(['Conditional board probabilities, cycle timing, multiplier schedule and 100x cap are independently authored.','Shared multiplayer sessions and any provider bonus mechanics are not implemented.'])}),
  ind74_official_multihot5deluxe:publishedReelLayout(3,3,'https://www.smartsoftgaming.com/games/multi-hot-5-deluxe',5),
  ind74_official_safarisimba:publishedReelLayout(3,3,'https://www.smartsoftgaming.com/games/safari-simba-2',5),
  ind74_official_habeshafortune5:publishedReelLayout(3,3,'https://www.smartsoftgaming.com/games/habesha-fortune-5'),
  ind74_official_baoslot5x:publishedReelLayout(3,3,'https://www.smartsoftgaming.com/games/bao-slot-5x'),
  ind74_official_multihot20:publishedReelLayout(3,5,'https://www.smartsoftgaming.com/games/multi-hot-20'),
  ind74_official_multihot10:publishedReelLayout(3,5,'https://www.smartsoftgaming.com/games/multi-hot-10-2',10),
  ind74_official_multihot5superwilds:publishedReelLayout(3,5,'https://www.smartsoftgaming.com/games/multi-hot-5-super-wilds',5),
  ind74_official_burningice40:publishedReelLayout(3,5,'https://www.smartsoftgaming.com/games/burning-ice-40',40),
  ind74_official_burningice:publishedReelLayout(3,5,'https://www.smartsoftgaming.com/games/burning-ice-41',5),
  ind74_official_madslot:publishedReelLayout(3,5,'https://www.smartsoftgaming.com/games/mad-slot',20),
  ind74_official_multihot40: Object.freeze({
    rows: 4, columns: 5, paylines:40,multiplierPlacement: 'top-arc',
    observedMultiplierValues: Object.freeze([2, 4, 5]),
    completeMultiplierLabelsVerified: false,
    source: 'https://www.smartsoftgaming.com/games/multi-hot-40; official demo browser observation on 2026-11-11',
    evidence: 'Five columns and four visible rows; multiplier arc above the reels. Visible labels include 5x, 2x and 4x.',
    limitations: Object.freeze(['Full multiplier distribution and full label order are unverified.', 'The complete provider payline chart and reel strips are unverified.']),
  }),
  ind74_official_multihot100: Object.freeze({
    rows: 4, columns: 5, paylines:100,multiplierPlacement: 'left-reel',
    observedMultiplierValues: Object.freeze([1, 2, 3, 4, 5]),
    completeMultiplierLabelsVerified: true,
    source: 'references/multihot100-observed-20261111.json',
    evidence: 'Five columns and four rows. The observed help explicitly places the 1x–5x multiplier on the left side reel.',
    limitations: Object.freeze(['The provider multiplier probabilities and reel strips are unverified.', 'The full provider payline chart is unverified. X2 uses independent fair colors and an explicitly independent three-attempt limit.']),
  }),
  ind74_official_multihot5wild: Object.freeze({
    rows: 3, columns: 3, paylines:5,multiplierPlacement: 'left-reel',
    observedMultiplierValues: Object.freeze([1,2,3,4,5]), completeMultiplierLabelsVerified: true,
    source: 'https://www.smartsoftgaming.com/games/multi-hot-5-wild',
    evidence: 'The official public page specifies a 3-by-3 grid, five fixed paylines, wild substitution, three matching symbols and a left-side 1x–5x multiplier reel.',
    limitations: Object.freeze(['The observed own wild prize plus 5x permits a 500x independent base bound, while help advertises 375x; provider award restrictions are unverified.', 'The provider payline chart and probabilities are unverified. X2 uses independently fair colors, a pre-spin hold control and an independent three-attempt limit.']),
  }),
  ind74_official_multihot5burnwilds: Object.freeze({
    rows: 3, columns: 5, paylines:5,multiplierPlacement: 'independent-display',
    observedMultiplierValues: Object.freeze([1,2,3,4,5]), completeMultiplierLabelsVerified: true,
    source: 'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds',
    evidence: 'The official public page specifies three rows, five reels and five paylines. Wilds appear on reels 2–4, substitute in left-to-right wins, and expand vertically when used by a winning combination. The total win receives a 1x–5x multiplier.',
    limitations: Object.freeze(['Full provider paytable, probabilities and repeated expansion order remain unverified.', 'The independent model expands the wild columns used by initial winning lines, then evaluates again. X2 uses independently fair colors, a pre-spin hold control and an independent three-attempt limit.']),
  }),
  ind74_official_plinkoxclassic: Object.freeze({
    rows: 16, buckets: 17,
    source: 'references/plinkoxclassic-observed-20261111.json',
    evidence: 'Sixteen peg rows and seventeen buckets were observed in a completed official pink-ball demo round.',
    limitations: Object.freeze(['Marketing describes selectable stake factors; the observed demo instead presents a static pink/orange/fire 1x/5x/10x legend and a 10000x maximum.', 'Server color selection, its 995/4/1 weights and fair paths are independent operator choices. Provider selection semantics and probabilities remain unverified.']),
  }),
});

export function officialLayout(definition) {
  const d = definition, observed = OBSERVED_LAYOUTS[d.id];
  const common = {
    source: observed?.source ?? 'Independently authored model configuration; no complete official layout observation',
    geometryVerified: Boolean(observed),
    geometryStatus: observed ? 'observed-public-layout' : 'independent-layout-unverified-against-reference',
    fullReferenceParityVerified: false,
    observedFacts: observed ? [observed.evidence] : [],
    limitations: observed ? [...observed.limitations] : ['Official geometry, visual behaviour, audio and complete game mechanics remain unverified.'],
  };
  if (d.family === 'slots') {
    const values = Array.isArray(d.baseGameMultiplier?.values) ? [...d.baseGameMultiplier.values]
      : Array.isArray(d.multiplierValues) ? [...d.multiplierValues] : [];
    return {
      ...common, kind: 'reels', rows: d.rows, columns: d.cols ?? 5,
      paylines: d.ways ? null : d.paylines.length, paylinesVerified: false,
      ...(d.ways ? {ways:d.ways,waysCountVerified:observed?.ways===d.ways} : {}),
      paylineCountVerified:!d.ways&&(observed?.paylines===d.paylines.length||Boolean(d.provenance?.paylineCountSource)),
      multiplier: {
        placement: observed?.multiplierPlacement ?? (values.length ? 'independent-display' : 'none'),
        observedValues: [...(observed?.observedMultiplierValues ?? [])],
        implementedValues: values,
        calculationImplemented: values.length > 0,
        ...(d.baseGameMultiplier ? {condition:d.baseGameMultiplier.trigger} : {}),
        completeLabelsVerified: observed?.completeMultiplierLabelsVerified === true,
        providerProbabilitiesVerified: false,
      },
    };
  }
  if (d.family === 'plinko') return {...common, kind: 'pegboard', rows: d.rows,
    buckets: d.bucketMultipliersBps.length, implementedBallMultipliers: [...(d.ballMultipliers ?? [d.implementedBallMultiplier ?? 1])],
    ballMultiplierStakeMeaning: 'one-stake-with-server-award-multiplier',
    completeBallMechanicsVerified: false};
  if (d.family === 'ladder') return {...common, kind: 'ladder', steps: d.multipliersBps.length,
    stepCountVerified:observed?.steps===d.multipliersBps.length,
    ...(observed?.modeStepCounts?{stepCountScope:'default-easy',modeStepCounts:{...observed.modeStepCounts}}:{}),
    observedDefaultMultipliersBps:[...(observed?.observedMultipliersBps??[])],
    modes: [...(d.modes ?? ['easy'])], visualChoicesAffectProbabilities: false};
  if (d.family === 'mines') return {...common, kind: 'mine-board', rows: d.rows, columns: d.cols,
    cells: d.cells, mines: d.mines, maximumSafePicks: d.maxPicks};
  if (d.family === 'wheel') return {...common, kind: 'wheel', sectors: d.sectors.length,sectorCountVerified:observed?.sectors===d.sectors.length};
  if (d.family === 'dice') return {...common, kind: 'dice', outcomes: 100,
    minimumTarget: d.minTarget, maximumTarget: d.maxTarget};
  if(d.crashMechanic==='cascade')return {...common,kind:'cascade',rows:d.rows,columns:d.cols,
    symbols:d.symbols.length,minimumMatchingSymbols:d.minMatch,maximumMultiplierBps:d.maxMultiplierBps,
    synchronizedMultiplayerVerified:false};
  if (d.family === 'crash') return {...common, kind: 'crash', maximumMultiplierBps: d.maxMultiplierBps,
    synchronizedMultiplayerVerified: false};
  throw new Error('Unsupported official layout family: ' + d.family);
}

export function independentPaylines(columns, rows, count) {
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || !Number.isSafeInteger(count) ||
      columns < 1 || columns > 8 || rows < 1 || rows > 8 || count < rows || count > rows ** columns) {
    throw new Error('Invalid independent payline geometry.');
  }
  const lines = Array.from({length: rows}, (_, row) => Array(columns).fill(row));
  const used = new Set(lines.map(line => line.join(',')));
  for (let value = 0; lines.length < count; value++) {
    let n = value;
    const line = Array.from({length: columns}, () => { const row = n % rows; n = Math.floor(n / rows); return row; });
    const key = line.join(',');
    if (!used.has(key)) { used.add(key); lines.push(line); }
  }
  return lines;
}
