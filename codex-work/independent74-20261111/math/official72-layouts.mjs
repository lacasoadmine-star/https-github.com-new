// Public presentation evidence only. These records do not supply provider
// probabilities, reel strips, paylines or certified return percentages.
const publishedReelLayout=(rows,columns,source,paylines)=>Object.freeze({rows,columns,source,paylines,
  evidence:`The official public page specifies ${columns} reels and ${rows} rows${paylines?` with ${paylines} fixed paylines`:''}.`,
  limitations:Object.freeze(['The complete provider payline chart, symbol probabilities, bonus mechanics, artwork and certified RTP remain unverified.'])});
export const OBSERVED_LAYOUTS = Object.freeze({
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
    limitations: Object.freeze(['The observed own wild prize plus 5x permits a 500x independent bound, while help advertises 375x; provider award restrictions are unverified.', 'The provider payline chart and probabilities are unverified. X2 is not yet implemented for this title.']),
  }),
  ind74_official_multihot5burnwilds: Object.freeze({
    rows: 3, columns: 5, paylines:5,multiplierPlacement: 'independent-display',
    observedMultiplierValues: Object.freeze([1,2,3,4,5]), completeMultiplierLabelsVerified: true,
    source: 'https://www.smartsoftgaming.com/games/multi-hot-5-burn-wilds',
    evidence: 'The official public page specifies three rows, five reels and five paylines. Wilds appear on reels 2–4, substitute in left-to-right wins, and expand vertically when used by a winning combination. The total win receives a 1x–5x multiplier.',
    limitations: Object.freeze(['Full provider paytable, probabilities and repeated expansion order remain unverified.', 'The independent model expands the wild columns used by initial winning lines, then evaluates again. X2 is not yet implemented for this title.']),
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
    const values = Array.isArray(d.multiplierValues) ? [...d.multiplierValues] : [];
    return {
      ...common, kind: 'reels', rows: d.rows, columns: d.cols ?? 5,
      paylines: d.paylines.length, paylinesVerified: false,
      paylineCountVerified:observed?.paylines===d.paylines.length||Boolean(d.provenance?.paylineCountSource),
      multiplier: {
        placement: observed?.multiplierPlacement ?? (values.length ? 'independent-display' : 'none'),
        observedValues: [...(observed?.observedMultiplierValues ?? [])],
        implementedValues: values,
        calculationImplemented: values.length > 0,
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
    modes: [...(d.modes ?? ['easy'])], visualChoicesAffectProbabilities: false};
  if (d.family === 'mines') return {...common, kind: 'mine-board', rows: d.rows, columns: d.cols,
    cells: d.cells, mines: d.mines, maximumSafePicks: d.maxPicks};
  if (d.family === 'wheel') return {...common, kind: 'wheel', sectors: d.sectors.length};
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
