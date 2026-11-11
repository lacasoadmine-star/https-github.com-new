// The saved public Chicken Help documents a selected round count and cash-out
// step, with a restart after settlement. Outcomes and money stay on the server.
import {canStartRound,roundNeedsRecovery} from './machine74-controls.mjs';
import {hasChickenPresence} from './chicken74-presence.mjs';

export const CHICKEN_AUTO_MAX_ROUNDS=100; // Operator UI bound; not a provider preset.
const MONEY=/^(?:0|[1-9][0-9]{0,12})\.[0-9]{2}$/;

export function hasChickenAutoplay(definition){
  return hasChickenPresence(definition)&&Array.isArray(definition.modes)&&
    definition.modes.every(mode=>definition.paytable?.some(table=>table.mode===mode&&table.rows?.length));
}

export function chickenAutoplaySteps(definition,mode){
  if(!hasChickenAutoplay(definition)||!definition.modes.includes(mode))throw new TypeError('Chicken cash-out steps are unavailable.');
  const rows=definition.paytable.find(table=>table.mode===mode).rows;
  if(rows.some((row,index)=>row.step!==index+1||!Number.isSafeInteger(row.multiplierBps)||row.multiplierBps<=0))throw new TypeError('Published Chicken cash-out steps are required.');
  return rows.map(({step,multiplierBps})=>({step,multiplierBps}));
}

export function chickenAutoplayPlan(definition,{stake,mode,rounds,targetStep}){
  const steps=chickenAutoplaySteps(definition,mode);
  if(typeof stake!=='string'||!MONEY.test(stake)||BigInt(stake.replace('.',''))<=0n)throw new TypeError('Geli sharad sax ah.');
  if(!Number.isSafeInteger(rounds)||rounds<1||rounds>CHICKEN_AUTO_MAX_ROUNDS)throw new TypeError('Dooro 1 ilaa '+CHICKEN_AUTO_MAX_ROUNDS+' wareeg oo AUTO ah.');
  if(!Number.isSafeInteger(targetStep)||!steps.some(row=>row.step===targetStep))throw new TypeError('Dooro tallaabada CASHOUT-ka.');
  return Object.freeze({gameId:definition.id,stake,stakeMinor:stake.replace('.','').replace(/^0+(?=\d)/,''),mode,rounds,targetStep,maxSteps:steps.length});
}

function receiptMatches(round,plan,roundId){
  return round?.game_id===plan.gameId&&round.round_id===roundId&&round.mode===plan.mode&&
    round.stakeMinor===plan.stakeMinor&&!round.previous_model&&!round.recovery_required;
}

// read() supplies only current controller/public state. request() uses the
// existing idempotent transport. A failed/ambiguous action is never retried here.
export async function runChickenAutoplay({definition,plan,read,request,wait,onProgress=()=>{}}){
  plan=chickenAutoplayPlan(definition,plan);
  const initial=read(),guard=initial.snapshot?.sessionGuard,version=initial.snapshot?.game?.version;
  let completed=0,roundId=null,pause=false;
  const finish=reason=>({reason,completed,requested:plan.rounds});
  for(;;){
    const live=read(),snapshot=live.snapshot,round=snapshot?.round;
    // Count only a matching server-confirmed settlement, including a result
    // already accepted when the user pressed STOP. It never authorizes a repeat.
    if(roundId&&receiptMatches(round,plan,roundId)&&round.status==='settled'){
      completed++;roundId=null;onProgress({completed,requested:plan.rounds});
      if(round.settlementReason==='CONNECTION_TIMEOUT_CASHOUT')return finish('connection-timeout');
    }
    if(!live.running||live.disposed||live.hidden)return finish('cancelled');
    if(live.gameId!==plan.gameId||!guard||snapshot?.sessionGuard!==guard||snapshot?.game?.version!==version)return finish('state-changed');
    if(live.needsRefresh||roundNeedsRecovery(snapshot))return finish('refresh-required');
    if(completed>=plan.rounds)return finish('completed');
    // A heartbeat in progress is serialized with financial actions. Once it
    // finishes, a surviving pending request stops this run rather than replaying.
    if(live.busy){await wait('busy');continue;}
    if(live.pending)return finish('request-unconfirmed');
    if(pause){pause=false;await wait('pace');continue;}
    let action;
    if(roundId===null){
      if(!canStartRound(snapshot))return finish('start-unavailable');
      if(!MONEY.test(snapshot.balance??''))return finish('balance-unverified');
      if(BigInt(snapshot.balance.replace('.',''))<BigInt(plan.stakeMinor))return finish('insufficient-balance');
      action='start';
    }else{
      if(!receiptMatches(round,plan,roundId)||round.status!=='active'||!Number.isSafeInteger(round.step)||round.step<1||round.step>plan.maxSteps)return finish('state-changed');
      action=round.step>=plan.targetStep?'collect':'reveal';
      if(!round.allowedActions?.includes(action))return finish('action-unavailable');
    }
    const previousRoundId=round?.round_id;
    if(!await request(action,{},plan))return finish('request-unconfirmed');
    if(action==='start'){
      const accepted=read().snapshot?.round;
      if(!accepted?.round_id||accepted.round_id===previousRoundId||!receiptMatches(accepted,plan,accepted.round_id)||!['active','settled'].includes(accepted.status))return finish('state-changed');
      roundId=accepted.round_id;
    }
    pause=true;
  }
}
