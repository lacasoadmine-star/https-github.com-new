// Fresh official catalogue selects identity and reference URLs only. Every
// probability model below is ours, and has no dependency on provider servers.
import scope from '../scope/official74.json' with {type:'json'};
import {listGameDefinitions as originalModels} from './index.mjs';
import {getGameDefinition as revisedModel} from './requested72.mjs';
import freshPlinko from './fresh-plinkoxclassic.mjs';
import {startSlot,publicSlot,calculateSlotReturn} from './engines/slots.mjs';
import {startCrash,advanceCrash,collectCrash,publicCrash,syncCrash} from './engines/crash.mjs';
import {startLadder,advanceLadder,collectLadder,publicLadder} from './engines/ladder.mjs';
import {startMines,advanceMines,collectMines,publicMines,mineMultiplier} from './engines/mines.mjs';
import {startInstant,publicInstant} from './engines/instant.mjs';
import {error,stake,payout} from './engines/shared.mjs';
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const models=originalModels();
export const GAME_ID='ind74_official_mineisland2';
const definitions=scope.entries.filter(e=>!e.protected).map(entry=>{
 const model=entry.name==='Plinko X Classic'?freshPlinko:entry.name==='Multi Hot 100'?revisedModel('ind74_multihot100'):models.find(g=>norm(g.catalogName)===norm(entry.name));
 if(!model)throw Error('Missing independent model for official title: '+entry.name);
 const d=structuredClone(model);d.id=entry.gameId;d.catalogName=entry.name;d.title=entry.name+' — Independent';d.mathVersion='official72-'+norm(entry.name)+'-r1';
 d.officialReference={publisher:'SmartSoft Gaming',page:entry.officialUrl,demo:entry.demoUrl,catalogVerifiedOn:scope.fetchedOn,fullGameplayVerified:false};
 d.implementationStatus='independent-test-points-prototype; official-parity-and-production-ledger-unverified';
 d.limits={minBetMinor:'100',maxBetMinor:'4000000',betStepMinor:'100',maxWinMinor:'0'};
 if(d.family==='slots'){d.proratedStake=true;d.nominalReturn={...calculateSlotReturn(d),rounding:'Before per-line minor-unit flooring.'};}
 if(d.id===GAME_ID){d.multipliersBps=d.paytable.find(t=>t.mode==='easy').rows.map(r=>r.multiplierBps);d.returnBps=9600;}
 const bps=d.family==='slots'?Math.max(...d.symbols.flatMap(s=>Object.values(s.pays)))*Math.max(...(d.multiplierValues||[1]))*10000:d.family==='crash'?d.maxMultiplierBps:d.id===GAME_ID?Math.max(...d.paytable.flatMap(t=>t.rows.map(r=>r.multiplierBps))):d.family==='ladder'?d.multipliersBps.at(-1):d.family==='mines'?mineMultiplier(d,d.maxPicks):d.family==='plinko'?Math.max(...d.bucketMultipliersBps):d.family==='wheel'?Math.max(...d.sectors.map(s=>s.multiplierBps)):Math.floor(d.returnBps*100/d.minTarget);
 d.maximumMultiplierBps=bps;d.limits.maxWinMinor=payout(d.limits.maxBetMinor,bps);
 return d;
});
export const listGameDefinitions=()=>structuredClone(definitions);
export const getGameDefinition=id=>structuredClone(definitions.find(d=>d.id===id)??null);
function get(id,mode){let d=definitions.find(d=>d.id===id);if(!d)error('INVALID_GAME','This official-catalogue entry is not enabled for new account play.');if(id===GAME_ID){mode??='easy';const table=d.paytable.find(t=>t.mode===mode);if(!table)error('INVALID_MODE','Choose a supported mode.');d={...d,multipliersBps:table.rows.map(r=>r.multiplierBps)};}return d;}
function checked(r){const d=get(r?.gameId,r?.mode);if(d.mathVersion!==r.mathVersion)error('INVALID_ROUND','Round model version mismatch.');return d;}
export function startRound({gameId,betMinor,options={},rng,now}={}){
 const d=get(gameId,options?.mode),allowed=gameId===GAME_ID?['mode']:d.family==='dice'?['target']:[];
 if(!options||Array.isArray(options)||typeof options!=='object'||Object.keys(options).some(k=>!allowed.includes(k)))error('INVALID_OPTIONS','Only supported game choices are accepted.');
 if(d.family==='slots')return startSlot(d,{betMinor,rng});if(d.family==='crash')return startCrash(d,{betMinor,rng,now});if(d.family==='ladder')return{...startLadder(d,{betMinor,rng}),...(gameId===GAME_ID?{mode:options.mode??'easy'}:{})};if(d.family==='mines')return startMines(d,{betMinor,rng});return startInstant(d,{betMinor,options,rng});
}
export function advanceRound(r,o={},now){const d=checked(r);if(d.family==='crash')return advanceCrash(d,r,o,now);if(d.family==='ladder')return advanceLadder(d,r,o);if(d.family==='mines')return advanceMines(d,r,o);error('ROUND_FINISHED','This round has settled.');}
export function collectRound(r,o={},now){const d=checked(r);if(d.family==='crash')return collectCrash(d,r,o,now);if(d.family==='ladder')return collectLadder(d,r);if(d.family==='mines')return collectMines(d,r);error('ROUND_FINISHED','This round has settled.');}
export function publicRound(r,now){const d=checked(r);if(d.family==='slots')return publicSlot(r);if(d.family==='crash')return publicCrash(d,r,now);if(d.family==='ladder')return publicLadder(d,r);if(d.family==='mines')return publicMines(d,r);return publicInstant(r);}
export function reconcileRound(r,now){const d=checked(r);return d.family==='crash'&&r.status==='active'?syncCrash(d,r,now):r;}
export function maximumPayoutMinor({gameId,betMinor,options={}}={}){const d=get(gameId,options.mode);return payout(stake(betMinor,d.limits),d.maximumMultiplierBps);}
