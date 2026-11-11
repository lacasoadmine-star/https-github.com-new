// A small set of exact public Help rules. Existing line prizes and symbol
// frequencies remain independently authored; no provider distribution is inferred.
import {calculateSlotReturn} from './engines/slots.mjs';
import {configurePublicColorGamble} from './public-gamble.mjs';
import {configurePublicSlotFeatures} from './public-slot-features.mjs';

const HELP='references/official-slot-help-en-20261111.json';
const SPECS=Object.freeze({
  hotsamba:{version:3,page:'hot-samba',wheel:[1,2,3,4,5],placement:'left-reel'},
  baoslot5x:{version:4,page:'bao-slot-5x',wheel:[1,2,3,4,5],placement:'left-reel'},
  farmsfortune:{version:4,page:'farms-fortune-6n0s6',existingExpandingWild:true},
  draculasfortune:{version:3,page:'draculas-fortune-2',sameReelWild:true,label:'Dracula substitute'},
  dicejungle:{version:4,page:'dice-jungle',sameReelWild:true,label:'Dice Jungle substitute',placement:'top-horizontal'},
});

const gcd=(a,b)=>{while(b){const next=a%b;a=b;b=next;}return a;};
const fraction=(numerator,denominator,extra={})=>{
  const divisor=gcd(numerator,denominator);
  return {numerator:(numerator/divisor).toString(),denominator:(denominator/divisor).toString(),...extra};
};

// For a middle reel, any Wild anywhere on that reel substitutes throughout it.
// Each cell has 8*32 regular tickets and one Wild ticket. Conditional on no
// Wild, the payline's cell remains a uniform regular symbol. Linearity of
// expectation permits correlated paylines; no independent-line assumption is made.
export function sameReelWildReturn(definition){
  if(definition.cols!==5||definition.symbols.length!==8||definition.symbols.some(s=>s.weight!==1)||
      definition.rows!==3||definition.wildRule?.substitutionScope!=='same-reel'||
      definition.wildRule.regularSymbolWeight!==32||definition.wildRule.wildWeight!==1||
      JSON.stringify(definition.wildRule.columns)!=='[1,2,3]'||definition.multiplierValues){
    throw new TypeError('The exact independent three-middle-reel ticket model is required.');
  }
  const denominatorCell=257n**3n, noWild=256n**3n;
  const denominatorMatch=8n*denominatorCell;
  const matches=8n*denominatorCell-7n*noWild;
  const miss=denominatorMatch-matches;
  const numerator=definition.symbols.reduce((sum,s)=>sum+
    8n*matches**2n*miss*BigInt(s.pays[3])+
    7n*matches**3n*BigInt(s.pays[4])+matches**3n*BigInt(s.pays[5]),0n);
  return fraction(numerator,64n*denominatorMatch**3n,{bound:'exact',
    scope:'independent regular/substitute model before line flooring; missing provider multiplier and Scatter excluded'});
}

function independentReturnProof(d,spec){
  if(spec.sameReelWild)return sameReelWildReturn(d);
  if(d.cols===3){
    return fraction(d.symbols.reduce((sum,s)=>sum+BigInt(s.pays[3]),0n)*15n,
      BigInt(d.symbols.length)**3n*5n,{bound:'exact',scope:'independent uniform three-reel and1–5 model before line flooring'});
  }
  const regular=calculateSlotReturn(d);
  if(spec.existingExpandingWild){
    // Count only boards with no Wild in any of the nine eligible cells. Every
    // excluded board pays a nonnegative amount, so this is a strict lower bound.
    return fraction(BigInt(regular.numerator)*256n**9n,BigInt(regular.denominator)*257n**9n,
      {bound:'lower',scope:'no-Wild-board regular wins only; excludes every Wild-containing outcome'});
  }
  return fraction(BigInt(regular.numerator),BigInt(regular.denominator),
    {bound:'exact',scope:'independent uniform five-reel and1–5 model before line flooring'});
}

function blockUnreviewedDistribution(d,proof){
  const aboveStake=BigInt(proof.numerator)>BigInt(proof.denominator);
  d.releaseReview={realMoneyAdmissionBlocked:true,
    codes:[aboveStake?'INDEPENDENT_RETURN_ABOVE_STAKE':'INDEPENDENT_DISTRIBUTION_UNREVIEWED','PUBLIC_PAYTABLE_UNVERIFIED'],
    independentAnalyticReturn:proof,
    requiredAction:'Review and version the independent distribution and verify the title paytable and remaining public mechanics before real-money admission. Do not replace unknown probabilities with a provider RTP claim.'};
  d.implementationStatus='independent-model; real-money-admission-blocked; '+(aboveStake?'independent-return-above-stake':'distribution-review-required');
  d.rules.push('REAL-MONEY ADMISSION IS BLOCKED: this independent '+(proof.bound==='lower'?'return lower bound ':'return ')+
    proof.numerator+'/'+proof.denominator+(aboveStake?' exceeds the accepted stake. ': ' is not a reviewed release distribution. ')+
    'Public rule support and passing lifecycle tests do not establish provider probabilities or authorize financial release. Existing independently authored prizes and weights have not been silently changed.');
}

export function configureDocumentedBasicSlot(d,expectedId){
  const suffix=expectedId?.slice('ind74_official_'.length),spec=SPECS[suffix];
  if(!spec||d?.id!==expectedId||d.family!=='slots'||!Array.isArray(d.symbols)||!Array.isArray(d.paylines)){
    throw new TypeError('This configurator requires its exact documented independent title.');
  }
  const source='https://www.smartsoftgaming.com/games/'+spec.page;
  const multiplierCaption='help.slots.'+suffix+'.multiplier.reel.description';
  if(spec.existingExpandingWild){
    configurePublicSlotFeatures(d);
    d.rules=d.rules.filter(rule=>!rule.includes('advertised scatter bonuses, bonus purchase and gamble'));
    d.rules.push('Scatter awards remain unavailable until their title-specific prizes are verified. The retained one-pass winning-Wild expansion is an independent interpretation; Help also describes same-reel substitution.');
  }else{
    d.rules=[
      `This independent ${d.cols}-reel, ${d.rows}-row model retains ${d.paylines.length} authored paylines and its authored regular-symbol prizes. The complete provider line chart and paytable are not verified.`,
      'Winning line awards add. Each award is the total accepted stake times the symbol prize divided by the number of active lines, rounded down in minor units. No feature adds a second debit.',
    ];
  }
  if(spec.wheel){
    d.multiplierValues=[...spec.wheel];
    d.documentedMultiplier={placement:spec.placement,values:[...spec.wheel],completeValuesVerified:true,
      source,evidenceFile:HELP,captionKey:multiplierCaption,selectionTiming:'operator-before-symbol-grid'};
    d.multiplierSelectionTiming='before-symbol-grid';
    d.rules.push('The exact title Help documents a left-side multiplier with values1x,2x,3x,4x,5x. This independent implementation draws the multiplier before its regular-symbol grid and applies it once to all winning line awards. Uniform factor selection and this draw ordering are operator choices, not provider probabilities.');
  }else{
    d.documentedMultiplier={placement:spec.placement??'unverified',values:[],completeValuesVerified:false,
      source,evidenceFile:HELP,captionKey:multiplierCaption,selectionTiming:'before-symbol-grid',
      calculationImplemented:spec.existingExpandingWild===true};
    if(spec.existingExpandingWild){
      d.multiplierSelectionTiming='before-symbol-grid';
      d.rules.push('Exact Help selects the win multiplier before the reels start. The retained independent1–5 factor is now drawn before symbol cells and applied once to all line awards. This title-specific caption does not verify the numeric pool; the existing1–5 pool and uniform weights remain operator choices.');
    }else{
      delete d.multiplierValues;
      d.rules.push('Exact Help selects a win multiplier before the reels start, but its numeric pool is not verified. This partial model applies no extra multiplier and draws none. The missing numeric feature remains unavailable;1–5 values are not copied from another title.');
    }
  }
  if(spec.sameReelWild){
    d.wildSymbol={id:suffix+'-wild',label:spec.label,glyph:'W'};
    d.wildRule={columns:[1,2,3],substitutesRegularSymbols:true,substitutionScope:'same-reel',
      expandOnLanding:true,expandWhenWinning:false,excludesScatter:true,
      expansionEvaluation:'all-landed-substitute-columns-before-line-evaluation',
      regularSymbolWeight:32,wildWeight:1,probabilityModel:'independent-per-cell-tickets',
      providerProbabilitiesVerified:false,source,evidenceFile:HELP,captionKey:'help.slots.'+suffix+'.objects.main'};
    d.rules.push('Exact title Help restricts the substitute symbol to reels2,3,4 and says it substitutes for regular symbols on the same reel, excluding Scatter. This implementation replaces the regular cells on every reel containing a landed substitute before evaluating lines; it does not require an initial win.',
      'Each eligible cell has32 tickets for each of the eight regular symbols and one substitute ticket. Other reels contain uniform regular symbols. These probabilities and regular-symbol prizes are independent operator choices.',
      'Scatter awards and their title-specific numeric prizes remain unimplemented. No Scatter is generated with an invented cash award; a preserved nonregular cell can never be changed into a paying substitute.');
    d.provenance={...d.provenance,publicSubstituteSource:HELP+':'+d.wildRule.captionKey};
  }
  configurePublicColorGamble(d);
  d.mathVersion='official72-'+suffix+'-r'+spec.version;
  d.provenance={...d.provenance,publicMultiplierSource:HELP+':'+multiplierCaption,
    designed:'Exact public multiplier/substitute/X2 subset with independently authored line chart, prizes, symbol weights, factor/card probabilities and finite gamble limit.'};
  blockUnreviewedDistribution(d,independentReturnProof(d,spec));
  return d;
}
