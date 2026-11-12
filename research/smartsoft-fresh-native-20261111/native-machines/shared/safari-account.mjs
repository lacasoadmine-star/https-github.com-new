// Adapter to the existing authenticated ledger. Every balance is server supplied.
import {FreshAccountClient,validateReceipt,minor,GAME_ID,MODEL_VERSION} from './safari-account-client.mjs';
const SYMBOLS=['j','q','k','a','zebra','elephant','tiger','lion','smartsoft'];
export class SafariAccount {
 constructor({game,onChange=()=>{},...options}){this.game=game;this.onChange=onChange;this.client=new FreshAccountClient(options);this.ack=null;this.state={game,connected:false,authenticated:false,balance:null,round:null,pending:!!this.client.pending,recoveryBlocked:false,error:null};}
 emit(){this.onChange(this.state);}
 receive(){const s=this.client.snapshot;if(!s)return;const latest=s.round,signature=latest?s.sessionGuard+':'+latest.result.roundId+':'+latest.gamble.attempt:null;let acknowledged=this.ack===signature;try{acknowledged||=sessionStorage.getItem('zplay.safari-simba.collected.v1')===signature;}catch{}
  let round=null;if(latest){const r=latest.result,g=latest.gamble,active=!acknowledged&&minor(g.stake)>0;round={round_id:r.roundId,game_id:GAME_ID,model_version:MODEL_VERSION,version:g.attempt,status:active?'active':'settled',amountMinor:String(minor(g.stake)),payoutMinor:String(minor(g.stake)),stakeMinor:String(minor(r.bet)),grid:Array.from({length:3},(_,col)=>r.grid.map(row=>String(SYMBOLS.indexOf(row[col])))),feature:{multiplier:r.wheelMultiplier,expandedColumns:r.expandedColumns??[]},wins:r.winLines,actions:active?['collect',...(g.available?['gamble']:[])]:[],lastGamble:g.lastResult?{won:g.lastResult.won,color:g.lastResult.revealed.toLowerCase()}:null};}
  this.state={...this.state,game:{...this.game,stakeValues:s.game.betLevels},connected:true,authenticated:true,balance:s.balance,round,pending:!!this.client.pending,recoveryBlocked:!!s.blockedByActiveGame,otherActiveGame:s.blockedByActiveGame,error:null};this.emit();
 }
 async refresh(){try{await this.client.refresh();this.receive();return this.state;}catch(e){this.state={...this.state,connected:e.status===401,authenticated:false,pending:!!this.client.pending,error:e.status===401?null:e.code};this.emit();return null;}}
 async perform(fn){try{const result=await fn();if(this.client.needsRefresh)await this.client.refresh();this.receive();return !!result;}catch(e){this.state={...this.state,pending:!!this.client.pending,error:e.code??'ACCOUNT_UNAVAILABLE'};this.emit();return false;}}
 start(stake){return this.perform(()=>this.client.start(minor(stake)));}
 gamble(color){return this.perform(()=>this.client.gamble(color.toUpperCase()));}
 retry(){return this.perform(()=>this.client.retry());}
 async collect(){if(this.state.pending||!this.client.snapshot?.round)return false;const s=this.client.snapshot;this.ack=s.sessionGuard+':'+s.round.result.roundId+':'+s.round.gamble.attempt;try{sessionStorage.setItem('zplay.safari-simba.collected.v1',this.ack);}catch{}this.receive();return true;}
 async history(){const data=await this.client.request('rounds');if(!Array.isArray(data.items))throw Error('INVALID_HISTORY');return data.items.filter(r=>r.game_code===GAME_ID&&r.result_json?.mathVersion===MODEL_VERSION).map(r=>{validateReceipt(r.result_json);return{createdAt:r.created_at,round:{payoutMinor:String(minor(r.total_win))}};});}
}
