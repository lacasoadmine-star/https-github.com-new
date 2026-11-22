import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createM10ReservationBridge, GAME_ID, SQL } from './bridge.mjs';

export const user = 'synthetic-player-a', otherUser = 'synthetic-player-b', house = 'synthetic-house';
export const args = (roundId = randomUUID(), amountMinor = 100n, userId = user) => ({ gameId: GAME_ID, roundId, userId, amountMinor });

// Transaction/constraint model only: this fixture does not execute PostgreSQL.
// It exercises the actual bridge and rolls back staged wallet/journal mutations.
export function fixture({ houseBalance = 10000n, enforcement = true } = {}) {
  let state = { wallets: new Map([[user,1000n],[otherUser,1000n],[house,houseBalance],['synthetic-other-house',5000n]]),
    events: new Map(), reservations: new Map(), transfers: new Map(), ledger: [], movements: new Map(), oldActive: new Map() };
  let tail = Promise.resolve(), failPoint = null, installed = enforcement, mapping = house;
  const held = (draft, walletId) => [...draft.reservations.values()].filter(r => r.house_wallet_id === walletId).reduce((sum,r) => sum+r.amount,0n);
  const transaction = async run => {
    const before = tail; let unlock; tail = new Promise(done => { unlock = done; }); await before;
    const draft = structuredClone(state);
    const client = { draft, locked: false, query: async (sql, p = []) => {
      if (sql === SQL.installation) return { rowCount:1, rows:[{ isolation:'read committed', wallet_floor:installed, reservation_funding:installed }] };
      assert.equal(client.locked,true,'original wallet locks must precede journal/ledger SQL');
      if (sql === SQL.houseHeld) return { rowCount:1, rows:[{ amount:held(draft,p[0]).toString() }] };
      if (sql === SQL.playerHeld) return { rowCount:1, rows:[{ amount:[...draft.reservations.values()].filter(r=>r.user_id===p[0]).reduce((sum,r)=>sum+r.amount,0n).toString() }] };
      if (sql === SQL.event) { const receipt=draft.events.get(p[0]); return { rowCount:receipt?1:0, rows:receipt?[{receipt:structuredClone(receipt)}]:[] }; }
      if (sql === SQL.reservation) {
        const row=draft.reservations.get(p[0]);
        return { rowCount:row?1:0, rows:row?[{...row,amount_minor:row.amount.toString()}]:[] };
      }
      if (sql === SQL.active) {
        const rows=[...draft.reservations.values()].filter(r=>r.user_id===p[0]&&r.amount>0n);
        return {rowCount:rows.length,rows:structuredClone(rows)};
      }
      if (sql === SQL.insertReservation) {
        const [round_id,user_id,house_wallet_id,value]=p,amount=BigInt(value);
        assert.equal(draft.reservations.has(round_id),false);
        if ([...draft.reservations.values()].some(r=>r.user_id===user_id&&r.amount>0n)) throw Error('M10_ONE_PENDING_WIN');
        if(held(draft,house_wallet_id)+amount>draft.wallets.get(house_wallet_id))throw Error('M10_HOUSE_CAPACITY_UNAVAILABLE');
        draft.reservations.set(round_id,{round_id,user_id,house_wallet_id,amount,closed_reason:null});
        return {rowCount:1,rows:[]};
      }
      if (sql === SQL.changeReservation) {
        const [roundId,userId,houseId,after,reason,beforeAmount]=p,row=draft.reservations.get(roundId);
        if(!row||row.user_id!==userId||row.house_wallet_id!==houseId||row.closed_reason!==null||row.amount!==BigInt(beforeAmount))return{rowCount:0,rows:[]};
        if(held(draft,houseId)-row.amount+BigInt(after)>draft.wallets.get(houseId))throw Error('M10_HOUSE_CAPACITY_UNAVAILABLE');
        row.amount=BigInt(after);row.closed_reason=reason;
        if(failPoint==='after-hold-change')throw Error('SYNTHETIC_FAILURE_AFTER_HOLD_CHANGE');
        return{rowCount:1,rows:[{round_id:roundId}]};
      }
      if (sql === SQL.insertEvent) {
        if(failPoint==='insert-event')throw Error('SYNTHETIC_EVENT_FAILURE');
        assert.equal(draft.events.has(p[0]),false);
        draft.events.set(p[0],JSON.parse(p[10]));return{rowCount:1,rows:[]};
      }
      if (sql === SQL.transfer) {
        const [from,to,value,transferId,transferKind,userId,roundId,kind]=p,amount=BigInt(value);
        const row={debited:0,credited:0,ledger_entries:0,recorded:0};
        if(!draft.wallets.has(from)||draft.wallets.get(from)<amount)return{rowCount:1,rows:[row]};
        if(draft.wallets.get(from)-amount<held(draft,from))throw Error('M10_RESERVED_HOUSE_FUNDS');
        draft.wallets.set(from,draft.wallets.get(from)-amount);row.debited=1;
        if(!draft.wallets.has(to))return{rowCount:1,rows:[row]};
        draft.wallets.set(to,draft.wallets.get(to)+amount);row.credited=1;
        assert.equal(draft.transfers.has(transferId),false);
        draft.transfers.set(transferId,{from,to,amount,transferKind,userId});
        draft.ledger.push({transferId,walletId:from,delta:-amount},{transferId,walletId:to,delta:amount});row.ledger_entries=2;
        if(failPoint==='after-paired-ledger')throw Error('SYNTHETIC_FAILURE_AFTER_PAIRED_LEDGER');
        const key=roundId+':'+kind;assert.equal(draft.movements.has(key),false);
        draft.movements.set(key,{transferId,roundId,userId,kind,amount,balanceAfter:draft.wallets.get(userId)});row.recorded=1;
        return{rowCount:1,rows:[row]};
      }
      throw Error('Unexpected fixed SQL');
    } };
    try { const result=await run(client);state=draft;return result; }
    finally { unlock(); }
  };
  const dependencies={
    lockWallets:async(client,uid)=>{client.locked=true;return[uid,mapping].sort().map(id=>({id,balance:client.draft.wallets.get(id).toString()}));},
    balance:async(client,id)=>client.draft.wallets.get(id).toString(),
    houseFor:()=>mapping,
    assertNoActive:async(client,uid)=>{if(client.draft.oldActive.has(uid))throw Error('OLD_ACTIVE_ROUND');},
    activeRound:async(client,uid)=>client.draft.oldActive.get(uid)??null,
    assertPlayerCapacity:async(_client,_uid,before,stake,maximum)=>{assert.equal(typeof before,'bigint');assert.equal(typeof stake,'bigint');assert.equal(typeof maximum,'bigint');},
  };
  const bridge=createM10ReservationBridge(dependencies);
  return { ...bridge, dependencies, transaction,
    snapshot:()=>structuredClone(state), failAt:value=>{failPoint=value;}, enforcement:value=>{installed=value;}, houseAssignment:value=>{mapping=value;},
    async acceptedWin(input,win){await transaction(async client=>{await bridge.wallet.debitStake(client,input);await bridge.wallet.reserveWin(client,{...input,amountMinor:win});await bridge.wallet.claimActiveRound(client,input.userId,GAME_ID,input.roundId);});},
    async legacyDebit(amount){await transaction(async client=>{await dependencies.lockWallets(client,otherUser);
      // Model the existing generic house debit's unconditional DB trigger.
      if(client.draft.wallets.get(house)-amount<held(client.draft,house))throw Error('M10_RESERVED_HOUSE_FUNDS');
      client.draft.wallets.set(house,client.draft.wallets.get(house)-amount);client.draft.wallets.set(otherUser,client.draft.wallets.get(otherUser)+amount);
    });},
    async oldActive(value){await transaction(async client=>{if(value)client.draft.oldActive.set(user,value);else client.draft.oldActive.delete(user);});},
  };
}
