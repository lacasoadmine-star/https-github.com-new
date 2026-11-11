// Public presentation evidence, including a verified line chart where stated.
// These records do not supply reel strips, probabilities or certified RTP.
const publishedReelLayout=(rows,columns,source,paylines)=>Object.freeze({rows,columns,source,paylines,
  evidence:`The official public page specifies ${columns} reels and ${rows} rows${paylines?` with ${paylines} fixed paylines`:''}.`,
  limitations:Object.freeze(['The complete provider payline chart, symbol probabilities, bonus mechanics, artwork and certified RTP remain unverified.'])});
export const OBSERVED_LAYOUTS = Object.freeze({
  ind74_official_mariachicoins:Object.freeze({rows:3,columns:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_mariachicoins-initial.png; references/official-slot-help-en-20261111.json:help.slots.mariachicoins',
    evidence:'The saved official DEMO screenshot shows5columns and3rows, collector/coin presentation and a four-jackpot panel. Exact Help documents edge collectors, middle coins and3resettable Hold&Win respins.',
    limitations:Object.freeze(['The complete provider line chart and regular-symbol prizes remain unverified.','Collector timing, final coin-plus-collector aggregation and pre-expansion trigger order are explicitly independent interpretations.','A rendered1.00DMO Buy Respin quote at0.05DMO is observed, but universal price scaling and enriched-spin behavior are not proven; purchase remains unavailable.'])}),
  ind74_official_bookofbonanza:Object.freeze({rows:4,columns:6,paylines:40,
    source:'reports/priority10-reference-20261111/book-ready-geometry.jpg; reports/priority10-reference-20261111/book-forty-paylines.jpg; reports/priority10-reference-20261111/book-paytable-upper.jpg; reports/priority10-reference-20261111/book-paytable-lower.jpg; reports/current74-evidence-slots-secondary/ind74_official_bookofbonanza-official-help-en.json',
    evidence:'Fresh official DEMO screenshots confirm6columns,4rows,40numbered paylines and ten regular categories with2-to6-match prizes. Exact title Help documents Book Wild/Scatter,10free spins,+10retrigger and selected-symbol expansion when its paying reel count is present.',
    limitations:Object.freeze(['Help describes expansion covering3positions while the observed base has4rows. The3-cell contiguous window remains an explicitly independent interpretation.','Provider probabilities and complete bonus geometry remain unverified. A100x Buy quote is observed, but purchase/B+ progress/Risk lifecycles are unimplemented.'])}),
  ind74_official_geniesbonanza:Object.freeze({rows:5,columns:6,paylines:0,
    source:'reports/current74-evidence-slots-remaining/ind74_official_geniesbonanza-initial.png; reports/priority10-reference-20261111/genie-paytable.jpg; tests/evidence/official-demo-observations-frontend-five20261111.json; references/official-slot-help-en-20261111.json:help.slots.geniesbonanza',
    evidence:'The official screenshot shows6columns and5rows; completed result records cross-check30symbols. Exact Help specifies count-anywhere tumbles,10free spins,+5retrigger and bonus-only multipliers.',
    limitations:Object.freeze(['Fresh rendered Help verifies8–9/10–11/12+regular prizes and4+Scatter5x. Carpet frequencies, probabilities and scatter/multiplier ordering remain independent or unverified.','B+25%surcharge,100-Scatter progress and paid Risk mechanics remain unimplemented and their options are rejected.'])}),
  ind74_official_sugarfiesta:Object.freeze({rows:3,columns:3,paylines:3,multiplierPlacement:'left-reel',
    observedMultiplierValues:Object.freeze([1,2,3,4,5]),completeMultiplierLabelsVerified:true,
    source:'reports/priority10-reference-20261111/sugarfiesta-ready-geometry.jpg; reports/priority10-reference-20261111/sugarfiesta-paytable.jpg; reports/current74-evidence-slots-secondary/ind74_official_sugarfiesta-official-help-en.json',
    evidence:'Fresh official DEMO screenshots confirm3columns and3rows, nine regular symbol categories and the left multiplier selector. The public page specifies3lines; exact case-sensitive SugarFiesta Help specifies1x–5x and X2.',
    limitations:Object.freeze(['The displayed paytable is normalized into independent line prizes; provider125x maximum coupling with the displayed awards remains unresolved.','Provider probabilities, complete label ordering and full audiovisual behavior remain unverified.'])}),
  ind74_official_gatesofmerlyn:Object.freeze({rows:5,columns:6,paylines:0,
    source:'reports/current74-evidence-slots-remaining/ind74_official_gatesofmerlyn-initial.png; reports/priority10-reference-20261111/gates-paytable-upper.jpg; reports/priority10-reference-20261111/gates-paytable-lower.jpg; references/official-slot-help-en-20261111.json:help.slots.gatesofmerlyn',
    evidence:'The saved official DEMO screenshot shows6columns and5rows. Exact title Help says equal symbols pay anywhere, with no paylines, tumbling wins, multiplier symbols, MAGIC and triggered or purchased free spins.',
    limitations:Object.freeze(['Fresh rendered paytables verify8–9/10–11/12+regular awards and4/5/6+Scatter awards. Provider probabilities remain unverified.','MAGIC targeting, scatter/multiplier ordering, cap settlement and processing guarantee are explicitly independent interpretations.','Rendered references do not establish complete artwork/audio or certified provider mathematics.'])}),
  ind74_official_dragonscode:Object.freeze({rows:4,columns:5,paylines:50,multiplierPlacement:'top-arc',
    observedMultiplierValues:Object.freeze([1,2,5]),completeMultiplierLabelsVerified:false,
    source:'reports/current74-evidence-slots-secondary/ind74_official_dragonscode-initial.png',
    evidence:'The actual official DEMO screenshot shows5 reels and4 rows,20 symbol cells. Native canvas2170×1220. Exact title Help describes a50-payline slot. The top arc visibly shows1x,2x and5x.',
    limitations:Object.freeze(['The full provider payline chart and symbol prizes are not established.','Wild, Golden Egg, respin and buy feature remain unimplemented. The1x–5x regular multiplier and X2 use independent probabilities and a disclosed three-attempt gamble limit.','Geometry is observed; provider probabilities and complete audiovisual/feature equivalence are unverified.'])}),
  ind74_official_jinglebellbonanza:Object.freeze({rows:3,columns:5,multiplierPlacement:'top-arc',
    observedMultiplierValues:Object.freeze([1,2,5]),completeMultiplierLabelsVerified:false,
    source:'reports/current74-evidence-slots-remaining/ind74_official_jinglebellbonanza-initial.png',
    evidence:'The official DEMO screenshot shows5columns and3rows with a multiplier arc above the board,5x selected at the center,1x on the left and2x on the right.',
    limitations:Object.freeze(['The complete arc label order, provider probabilities, scatter awards and full bonus behavior remain unverified.','The regular wild expansion,1x–5x multiplier and optional X2 lifecycle use independently authored probabilities.'])}),

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
    limitations:Object.freeze(['The directly played first EASY crossing does not prove all future lane outcomes or other difficulties.','Provider survival probabilities, exact native autoplay presentation and full visual/audio parity remain unverified.','The authenticated server presence lease implements cashout after more than8seconds without accepted contact. This independent connection protocol and its recovery limits are described in connectionPolicy.'])}),

  ind74_official_coinsofatlantis:Object.freeze({rows:4,columns:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_coinsofatlantis-initial.png',
    evidence:'The official DEMO initial screen shows5columns and4rows. Exact Help documents regular/+1/MINI/MAJOR coins, MEGA pairs, GRAND triples, full-boardX2, ANTE+50% and60xBuy Respin.',
    limitations:Object.freeze(['The exact provider line chart and count remain unverified.','Additional jackpot groups beyond the first pair/triple, provider probabilities, base/feature ordering and purchase maximum coupling are independently interpreted and remain unverified.','The public2500x maximum is an explicit operator round cap; no provider reel restrictions are inferred.'])}),
  ind74_official_multihotways:Object.freeze({rows:3,columns:3,ways:27,multiplierPlacement:'left-reel',
    observedMultiplierValues:Object.freeze([1,2,3,4,5]),completeMultiplierLabelsVerified:true,
    source:'reports/current74-evidence-slots-remaining/ind74_official_multihotways-journal.json',
    evidence:'Twenty completed official DEMO result grids contain nine symbols and rendered positions show3×3. Exact MultiHotWays Help documents27 Reel Ways Pay and a left1x–5x multiplier.',
    limitations:Object.freeze(['Provider LinePlay1 is a betting field, not a payline count.','Conditional same-symbol x2 remains unimplemented. Separate red/black X2 uses independent fair colors and a disclosed three-attempt limit.','The provider award basis, symbol prizes and probabilities remain unverified; no Wild substitution is inferred from a different title.'])}),
  ind74_official_multifruitschargingwilds:Object.freeze({rows:3,columns:3,paylines:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_multifruitschargingwilds-journal.json',
    evidence:'Twenty completed official DEMO result grids contain nine symbols and rendered positions show3×3. Exact MultiFruitsChargingWilds Help specifies five fixed active paylines.',
    limitations:Object.freeze(['Carry requires trusted atomic state from the retained wallet transaction; no browser or process-local carry is accepted.','Provider line chart, prizes, normal multi-Wild aggregation and first-landing charge timing remain unverified.','ANTE5/10 uses documented costs and initial Wild guarantees with independent symbol draws and a disclosed base-stake award basis.'])}),
  ind74_official_gemscrownchargingwilds:Object.freeze({rows:3,columns:3,paylines:5,
    source:'reports/current74-evidence-slots-remaining/ind74_official_gemscrownchargingwilds-journal.json',
    evidence:'Twenty completed official DEMO result grids contain nine symbols and rendered positions show3×3. Exact GemsCrownChargingWilds Help specifies five fixed active paylines.',
    limitations:Object.freeze(['Carry requires trusted atomic state from the retained wallet transaction; no browser or process-local carry is accepted.','Provider line chart, prizes, normal multi-Wild aggregation and first-landing charge timing remain unverified.','This title Help does not document ANTE5/10. Only ordinary saved charging Wilds are implemented; another title is not used as proof of its purchase controls.'])}),

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
  ind74_official_multihot20:Object.freeze({rows:3,columns:5,paylines:20,multiplierPlacement:'top-arc',
    observedMultiplierValues:Object.freeze([2,4,5]),completeMultiplierLabelsVerified:false,
    source:'reports/current74-evidence-slots/ind74_official_multihot20-initial.png',
    evidence:'The official DEMO screenshot shows5columns and3rows with a top semicircular multiplier arc: selected2x,5x to the left and4x to the right. Exact title Help separately documents values1x through5x.',
    limitations:Object.freeze(['Help describes a left-side reel, while the observed desktop display places the multiplier above the board.','The complete arc label order, provider probabilities and payline chart remain unverified.'])}),
  ind74_official_multihot10:Object.freeze({rows:3,columns:5,paylines:10,multiplierPlacement:'top-arc',
    observedMultiplierValues:Object.freeze([2,4,5]),completeMultiplierLabelsVerified:false,
    source:'reports/current74-evidence-slots-remaining/ind74_official_multihot10-initial.png',
    evidence:'The official DEMO screenshot shows5columns and3rows with a top semicircular multiplier arc: selected2x,5x to the left and4x to the right. Exact title Help separately documents values1x through5x.',
    limitations:Object.freeze(['Help describes a left-side reel, while the observed desktop display places the multiplier above the board.','The complete arc label order, provider probabilities and payline chart remain unverified.'])}),
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
    rows: 3, columns: 5, paylines:5,multiplierPlacement: 'top-arc',
    observedMultiplierValues: Object.freeze([1,2,3,4,5]), completeMultiplierLabelsVerified: true,
    source: 'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds; reports/current74-evidence-slots/ind74_official_multihot5burnwilds-initial.png',
    evidence: 'The official public page specifies three rows, five reels and five paylines. The saved official DEMO screenshot confirms the multiplier on a top semicircular arc. Wilds appear on reels 2–4, substitute in left-to-right wins, and expand vertically when used by a winning combination. The total win receives a 1x–5x multiplier.',
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
    if(d.chargingFeature)return{...common,kind:'reels',rows:d.rows,columns:d.cols,paylines:d.paylines.length,
      paylinesVerified:false,paylineCountVerified:observed?.paylines===d.paylines.length,
      persistentWilds:true,carryScope:[...d.chargingFeature.persistentScope],
      multiplier:{placement:'on-wild',observedValues:[],implementedValues:[],calculationImplemented:true,
        scope:'per-winning-line',dynamicPayoutBound:true,completeLabelsVerified:false,providerProbabilitiesVerified:false}};
    if(d.slotMechanic==='tumble')return{...common,kind:'cascade-grid',rows:d.rows,columns:d.cols,
      paylines:0,paylineCountVerified:true,paylinesVerified:true,minimumMatchingSymbols:d.tumbleFeature.minimumMatch,
      minimumMatchingSymbolsVerified:d.tumbleFeature.minimumMatchVerified,
      multiplier:{placement:'on-grid',observedValues:[...d.tumbleFeature.multiplierValues],
        implementedValues:[...d.tumbleFeature.multiplierValues],calculationImplemented:true,
        completeLabelsVerified:true,providerProbabilitiesVerified:false},
      maximumMultiplierBps:d.maximumMultiplierBps,maximumBoards:d.tumbleFeature.processingSafety.maximumBoards};
    const values = Array.isArray(d.baseGameMultiplier?.values) ? [...d.baseGameMultiplier.values]
      : Array.isArray(d.multiplierValues) ? [...d.multiplierValues] : [];
    return {
      ...common, kind: 'reels', rows: d.rows, columns: d.cols ?? 5,
      paylines: d.ways ? null : d.paylines.length, paylinesVerified: d.bookFeature?.paylinesVerified===true,
      ...(d.ways ? {ways:d.ways,waysCountVerified:observed?.ways===d.ways} : {}),
      paylineCountVerified:!d.ways&&(observed?.paylines===d.paylines.length||Boolean(d.provenance?.paylineCountSource)),
      multiplier: {
        placement: observed?.multiplierPlacement ?? d.documentedMultiplier?.placement ?? (values.length ? 'independent-display' : 'none'),
        observedValues: [...(observed?.observedMultiplierValues ?? [])],
        implementedValues: values,
        calculationImplemented: values.length > 0,
        ...(d.baseGameMultiplier ? {condition:d.baseGameMultiplier.trigger} : {}),
        completeLabelsVerified: observed?.completeMultiplierLabelsVerified === true||d.documentedMultiplier?.completeValuesVerified===true,
        ...(d.documentedMultiplier?{
          documentedValues:[...d.documentedMultiplier.values],
          documentationSource:d.documentedMultiplier.evidenceFile+':'+d.documentedMultiplier.captionKey,
          selectionTiming:d.documentedMultiplier.selectionTiming,
        }:{}),
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
