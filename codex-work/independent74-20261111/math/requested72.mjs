import scope from '../scope/requested74.json' with {type:'json'};
import {listGameDefinitions as prototypes} from './index.mjs';
import {startSlot,publicSlot,calculateSlotReturn} from './engines/slots.mjs';
import {startCrash,advanceCrash,collectCrash,publicCrash,syncCrash} from './engines/crash.mjs';
import {startLadder,advanceLadder,collectLadder,publicLadder} from './engines/ladder.mjs';
import {startMines,advanceMines,collectMines,publicMines,mineMultiplier} from './engines/mines.mjs';
import {startInstant,publicInstant} from './engines/instant.mjs';
import {startTable,advanceTable,publicTable,kenoMultiplier} from './engines/table-games.mjs';
import {startTargetCrash,publicTargetCrash} from './engines/target-crash.mjs';
import {error,stake,payout} from './engines/shared.mjs';

const normalize=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const hash=s=>[...s].reduce((n,c)=>(Math.imul(n,16777619)^c.charCodeAt(0))>>>0,2166136261);
const source=prototypes();
const base=family=>structuredClone(source.find(g=>g.family===family&&(family!=='ladder'||Array.isArray(g.multipliersBps))));
const tables=new Set(['roulette','baccarat','blackjack','sicbo','keno']);
function family(name){
 if(name==='Speed Crash')return 'target-crash';
 if(/Lobby$/.test(name))return 'lobby';
 if(/Roulette/.test(name))return 'roulette';
 if(name==='Baccarat')return 'baccarat';if(name==='Blackjack')return 'blackjack';if(name==='Sic Bo')return 'sicbo';if(name==='Keno')return 'keno';
 if(/Coin Miner|^Mines$/.test(name))return 'mines';if(/Tower/.test(name))return 'ladder';
 if(/Plinko/i.test(name))return 'plinko';if(/Crazy Time/.test(name))return 'wheel';
 if(/JetX|Crash|Football X|Cricket X|SpinX|Armada|Racing/i.test(name))return 'crash';if(name==='Balloon')return 'ladder';
 return 'slots';
}
const TABLE_RULES={
 roulette:['A uniformly sampled pocket resolves one published bet. Straight pays 36× total, even-money bets 2×, dozen/column bets 3×. Zero and double zero lose even-money bets.'],
 baccarat:['Fresh eight-deck shoe each round; standard third-card tableau. Player pays 2× total, Banker 1.95× including 5% commission on profit, Tie 9×. Player/Banker bets push on a tie.'],
 blackjack:['Fresh six-deck shoe each round; dealer stands on soft 17. Hit or Stand only; no split, double or insurance. Natural blackjack pays 2.5× total, ordinary wins 2×, pushes 1×.'],
 sicbo:['Three independent six-sided dice. Small 4–10 and Big 11–17 exclude triples and pay 2× total. Any triple pays 31×; a selected triple 181×; a selected face pays 2×/3×/4× for one/two/three occurrences.'],
 keno:['Select 1–5 distinct numbers from 1–40. Ten numbers are drawn without replacement. This original jackpot-only variant pays only if all selected numbers appear. Multiplier basis points floor(9500 × C(40,n)/C(10,n)).']
};
function definition(entry){
 const name=entry.name,id='ind74_'+normalize(name),f=family(name);
 if(f==='lobby')return{id,title:name,catalogName:name,family:f,mathVersion:'requested-lobby-r1',implementationStatus:'navigation-only',rules:['Navigation only; no bets or wallet mutations.'],paytable:[]};
 const matched=source.find(g=>normalize(g.catalogName)===normalize(name)||g.id===id);
 const d=matched&&matched.family===f?structuredClone(matched):tables.has(f)||f==='target-crash'?{}:base(f);
 Object.assign(d,{id,title:name+' — Independent',catalogName:name,family:f,mathVersion:'requested72-'+normalize(name)+'-r1',implementationStatus:'independent-math-prototype; client-and-live-ledger-unverified'});
 d.theme={name:name+' original edition',colors:['#102432','#'+(hash(name)&0xffffff).toString(16).padStart(6,'0'),'#f5cd79']};
 d.provenance={requestedBy:'Latest user list',officialDemoFullyVerified:false,designed:'Original independent rules, probabilities and artwork parameters; no certified provider equivalence is claimed.'};
 d.limits={minBetMinor:'100',maxBetMinor:'4000000',betStepMinor:'100',maxWinMinor:'0'};
 if(f==='slots'){
  const count=Number(/(?:^|\s)(10|20|30|40|50|81|100)$/.exec(name)?.[1]??20);
  const rows=name==='Multi Hot 100'?4:3;d.rows=rows;
  const lines=Array.from({length:rows},(_,r)=>Array(5).fill(r));
  for(let i=0;lines.length<count;i++){let n=i;const line=Array.from({length:5},()=>{const r=n%rows;n=Math.floor(n/rows);return r;});if(!lines.some(x=>x.every((r,k)=>r===line[k])))lines.push(line);}
  d.paylines=lines;d.proratedStake=true;
  d.symbols=d.symbols.map((s,i)=>{const shift=hash(name+':'+i)%7-3;return{...s,id:normalize(name)+'-'+i,label:name+' symbol '+(i+1),pays:{3:s.pays[3]+shift,4:s.pays[4]-2*shift,5:s.pays[5]-42*shift}};});
  if(name==='Multi Hot 100'){
   d.mathVersion='requested72-multihot100-r2';d.multiplierValues=[1,2,3,4,5];
   d.symbols=[['seven','Seven','7',20,200,500],['bell','Bell','🔔',15,100,200],['grape','Grapes','🍇',10,50,100],['watermelon','Watermelon','🍉',10,50,100],['lemon','Lemon','🍋',5,10,50],['plum','Plum','🟣',5,10,50],['orange','Orange','🍊',5,10,50],['cherry','Cherry','🍒',5,10,50]].map(([id,label,glyph,a,b,c])=>({id:'multihot100-'+id,label,glyph,weight:1,pays:{3:a,4:b,5:c}}));
   d.provenance.observed='2026-11-11: official live demo SPIN, 5×4 grid, 1→2 DMO help paytable, multiplier 1–5, controls and help text observed. Displayed provider RTP 96.66% is not the independent model RTP.';
  }
  d.rules=['Original five-reel, '+rows+'-row slot with '+count+' independently configured paylines and eight equally likely symbols.','Only the longest left-to-right match of 3, 4 or 5 identical symbols pays on each line.','Each line payout floors(stake × symbol prize / number of lines); line payouts add. Fractional line stakes never create fractional wallet money.','No provider wilds, scatters or free-spin equivalence is asserted.'];
  if(d.multiplierValues)d.rules.push('Symbol awards and the 1×–5× multiplier labels follow the observed demo help. This independent model chooses each multiplier uniformly; provider reel strips, multiplier probabilities and the full payline chart remain unverified. X2 gamble is not implemented in this test edition.');
  d.paytable=d.symbols.map(s=>({label:s.label,...s.pays}));
  d.nominalReturn={...calculateSlotReturn(d),rounding:'Before per-line minor-unit flooring; actual return depends on the stake.'};
 }else if(name==='Coin Miner'){
  Object.assign(d,{cells:25,rows:5,cols:5,mines:1,maxPicks:24,configurableMines:true,returnBps:9400,roundMultiplierToBps:100,mathVersion:'requested72-coinminer-risk-r2'});
  d.rules=['Choose 1–24 mines before starting a round on the 5×5 board. Each remaining tile contains a coin.','Reveal unused tiles, then collect after at least one safe reveal. A mine ends the round with zero return; revealing all safe tiles collects automatically.','The independent base prize is 0.94 × C(25,k)/C(25−mines,k), rounded to the nearest 0.01× before payout minor-unit flooring. Rounding changes actual return by stake and risk setting.','Observed public demo at stake 2 EUR and one mine offers 1.96 EUR for the first safe reveal. The full provider prize table, RNG, TreasureBoost and audio have not been verified.'];
  d.nominalReturn={description:'Independently selected 94% before multiplier and money rounding; provider equivalence is not claimed.'};
  d.provenance.publisher='Gaming Corps';d.provenance.sourceUrl='https://gamingcorps.com/game/coin-miner/';d.provenance.observed='2026-11-11: publisher-linked play-for-fun demo, 5×5 board, one mine, 2 EUR stake, balance 1000→998 and first safe-tile offer 1.96 observed.';
 }else if(f==='target-crash'){
  Object.assign(d,{minTargetBps:10500,maxTargetBps:100000000,defaultTargetBps:20000,returnBps:9500,mathVersion:'requested72-speedcrash-target-r2'});
  d.rules=['Set your target before the round, from 1.05× to 10,000×. The accepted stake and target cannot change during the round.','A successful round returns stake × selected target; a failed round returns zero. There is no manual in-flight Collect action.','The independent model uses a uniform integer ticket from 0 to target basis points − 1; tickets below 9,500 win. The theoretical return before integer minor-unit rounding is 95%.','Target mechanics and limits follow the public publisher page. Provider RNG, graphics, audio and RTP equivalence have not been verified.'];
  d.nominalReturn={numerator:'95',denominator:'100',rounding:'Before payout minor-unit flooring.'};
  d.paytable=[{label:'Target reached',description:'Selected target × accepted stake'},{label:'Target missed',multiplierBps:0}];
  d.provenance.publisher='Hacksaw Gaming';d.provenance.sourceUrl='https://www.hacksawgaming.com/games/speed-crash';d.provenance.observed='Publisher page verified 2026-11-11; target 1.05–10000×. Demo gameplay not yet verified.';
 }else if(tables.has(f)){
  d.rules=TABLE_RULES[f];d.paytable=[];
  if(f==='roulette'){d.pockets=name==='American Roulette'?38:37;d.nominalReturn={numerator:'36',denominator:String(d.pockets)};d.paytable=[{label:'Straight',multiplierBps:360000},{label:'Even-money',multiplierBps:20000},{label:'Dozen/column',multiplierBps:30000}];}
  if(f==='blackjack'){d.nominalReturn={description:'Strategy dependent; this implementation has not been certified.'};d.paytable=[{label:'Natural',multiplierBps:25000},{label:'Win',multiplierBps:20000},{label:'Push',multiplierBps:10000}];}
  if(f==='baccarat'){d.nominalReturn={description:'Depends on selected bet; not certified for this implementation.'};d.paytable=[{label:'Player',multiplierBps:20000},{label:'Banker',multiplierBps:19500},{label:'Tie',multiplierBps:90000}];}
  if(f==='sicbo'){d.nominalReturn={numerator:'210',denominator:'216',bet:'Small or Big'};d.paytable=[{label:'Small/Big',multiplierBps:20000},{label:'Any triple',multiplierBps:310000},{label:'Selected triple',multiplierBps:1810000}];}
  if(f==='keno'){d.nominalReturn={description:'At most 95%, before integer prize flooring.'};d.paytable=Array.from({length:5},(_,i)=>({label:'All '+(i+1)+' selected numbers',multiplierBps:kenoMultiplier(i+1)}));}
 }
 let bps=f==='target-crash'?d.maxTargetBps:f==='slots'?Math.max(...d.symbols.flatMap(s=>Object.values(s.pays)))*Math.max(...(d.multiplierValues||[1]))*10000:f==='crash'?d.maxMultiplierBps:f==='ladder'?d.multipliersBps.at(-1):f==='mines'?mineMultiplier(d,d.maxPicks):f==='plinko'?Math.max(...d.bucketMultipliersBps):f==='wheel'?Math.max(...d.sectors.map(s=>s.multiplierBps)):f==='roulette'?360000:f==='blackjack'?25000:f==='baccarat'?90000:f==='sicbo'?1810000:kenoMultiplier(5);
 if(d.configurableMines)bps=Math.max(...Array.from({length:24},(_,i)=>mineMultiplier({...d,mines:i+1},24-i)));
 d.maximumMultiplierBps=bps;d.limits.maxWinMinor=payout(d.limits.maxBetMinor,bps);
 return d;
}
const definitions=scope.entries.filter(e=>!e.protected).map(definition);
export const listGameDefinitions=()=>structuredClone(definitions);
export const getGameDefinition=id=>structuredClone(definitions.find(d=>d.id===id)??null);
function get(id){const d=definitions.find(d=>d.id===id);if(!d||d.family==='lobby')error('GAME_NOT_WAGERABLE','Select a requested wager game.');return d;}
function configuredMines(d,options={}){if(!d.configurableMines)return d;const mines=options.mineCount??d.mines;if(!Number.isInteger(mines)||mines<1||mines>24)error('INVALID_OPTIONS','Choose from 1 through 24 mines.');return{...d,mines,maxPicks:25-mines};}
function checked(round){const d=get(round?.gameId);if(d.mathVersion!==round.mathVersion)error('INVALID_ROUND','Round model version mismatch.');return configuredMines(d,{mineCount:round.mineCount});}
export function startRound({gameId,betMinor,options={},rng,now}={}){
 let d=get(gameId);const allowed=d.configurableMines?['mineCount']:d.family==='target-crash'?['targetBps']:d.family==='roulette'||d.family==='sicbo'?['choice','number']:['blackjack','baccarat'].includes(d.family)?['choice']:d.family==='keno'?['numbers']:[];
 if(!options||Array.isArray(options)||typeof options!=='object'||Object.keys(options).some(k=>!allowed.includes(k)))error('INVALID_OPTIONS','Only published game choices are accepted.');
 if(d.configurableMines){d=configuredMines(d,options);return{...startMines(d,{betMinor,rng}),mineCount:d.mines};}
 if(d.family==='target-crash')return startTargetCrash(d,{betMinor,options,rng});if(d.family==='slots')return startSlot(d,{betMinor,rng});if(d.family==='crash')return startCrash(d,{betMinor,rng,now});if(d.family==='ladder')return startLadder(d,{betMinor,rng});if(d.family==='mines')return startMines(d,{betMinor,rng});if(tables.has(d.family))return startTable(d,{betMinor,options,rng});return startInstant(d,{betMinor,options,rng});
}
export function advanceRound(round,options={},now,rng){const d=checked(round);if(d.family==='crash')return advanceCrash(d,round,options,now);if(d.family==='ladder')return advanceLadder(d,round,options);if(d.family==='mines')return advanceMines(d,round,options);if(d.family==='blackjack')return advanceTable(d,round,options,rng);error('ROUND_FINISHED','This game has settled.');}
export function collectRound(round,options={},now,rng){const d=checked(round);if(d.family==='crash')return collectCrash(d,round,options,now);if(d.family==='ladder')return collectLadder(d,round);if(d.family==='mines')return collectMines(d,round);if(d.family==='blackjack')return advanceTable(d,round,{choice:'stand'},rng);error('ROUND_FINISHED','This game has settled.');}
export function publicRound(round,now){const d=checked(round);if(d.family==='target-crash')return publicTargetCrash(round);if(d.family==='slots')return publicSlot(round);if(d.family==='crash')return publicCrash(d,round,now);if(d.family==='ladder')return publicLadder(d,round);if(d.family==='mines')return publicMines(d,round);if(tables.has(d.family))return publicTable(round);return publicInstant(round);}
export function reconcileRound(round,now){const d=checked(round);return d.family==='crash'&&round.status==='active'?syncCrash(d,round,now):round;}
export function maximumPayoutMinor({gameId,betMinor,options={}}={}){const d=configuredMines(get(gameId),options);return payout(stake(betMinor,d.limits),d.configurableMines?mineMultiplier(d,d.maxPicks):d.maximumMultiplierBps);}
