import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { COMPONENT, GAME_ID, createM10ReservationBridge } from './bridge.mjs';
import { fixture, args, user, otherUser, house } from './test-support.mjs';

test('import/construction creates no wallet and absent enforcement rejects before ledger mutation',async()=>{
  const h=fixture({enforcement:false}),before=h.snapshot();
  assert.equal(COMPONENT.mounted,false);assert.equal(COMPONENT.productionEnabled,false);assert.equal(COMPONENT.createsWallet,false);
  await assert.rejects(()=>h.transaction(c=>h.wallet.debitStake(c,args())),/M10_ENFORCED_RESERVATION_MIGRATION_REQUIRED/);
  assert.deepEqual(h.snapshot(),before);
});
test('SPIN debits once in the existing paired ledger and holds its win without creating another wallet',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);
  const s=h.snapshot();assert.equal(s.wallets.size,4);assert.equal(s.wallets.get(user),900n);assert.equal(s.wallets.get(house),10100n);
  assert.equal(s.reservations.get(a.roundId).amount,300n);assert.equal(s.transfers.size,1);assert.equal(s.ledger.length,2);
  assert.equal(s.ledger.reduce((sum,row)=>sum+row.delta,0n),0n);
  await h.transaction(async c=>{assert.equal(await h.wallet.houseBalance(c,user),9800n);assert.equal(await h.wallet.reserveBalance(c,user),300n);});
});
test('TAKE releases the exact hold then credits one WIN with a durable replay receipt',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);
  const collect={...a,amountMinor:300n,collectionId:randomUUID()};
  const first=await h.transaction(c=>h.wallet.creditReservedWin(c,collect));
  const replay=await h.transaction(c=>h.wallet.creditReservedWin(c,collect));
  assert.deepEqual(replay,first);
  const s=h.snapshot();assert.equal(s.wallets.get(user),1200n);assert.equal(s.wallets.get(house),9800n);
  assert.equal(s.reservations.get(a.roundId).amount,0n);assert.equal(s.transfers.size,2);assert.equal(s.ledger.length,4);
  await h.transaction(async c=>{assert.equal(await h.wallet.houseBalance(c,user),9800n);assert.equal(await h.wallet.reserveBalance(c,user),0n);await h.wallet.releaseActiveRound(c,user,GAME_ID,a.roundId);});
});
test('twenty concurrent collection attempts commit one WIN using the same transaction/client seam',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);
  const collect={...a,amountMinor:300n,collectionId:randomUUID()};
  const results=await Promise.all(Array.from({length:20},()=>h.transaction(c=>h.wallet.creditReservedWin(c,collect))));
  assert.ok(results.every(r=>r.transferId===results[0].transferId));assert.equal(h.snapshot().transfers.size,2);
  assert.equal(h.snapshot().wallets.get(user),1200n);
});
test('failure after hold release or paired-ledger write rolls back the entire collection',async()=>{
  for(const point of ['after-hold-change','after-paired-ledger','insert-event']){
    const h=fixture(),a=args();await h.acceptedWin(a,300n);const before=h.snapshot();h.failAt(point);
    await assert.rejects(()=>h.transaction(c=>h.wallet.creditReservedWin(c,{...a,amountMinor:300n,collectionId:randomUUID()})),/SYNTHETIC/);
    assert.deepEqual(h.snapshot(),before);
  }
});
test('initial reservation-event failure rolls back the earlier BET too',async()=>{
  const h=fixture(),before=h.snapshot();h.failAt('insert-event');await assert.rejects(()=>h.acceptedWin(args(),300n),/SYNTHETIC/);
  assert.deepEqual(h.snapshot(),before);
});
test('an exactly funded house can collect, while an unrelated old debit cannot spend the held amount',async()=>{
  const h=fixture({houseBalance:200n}),a=args();await h.acceptedWin(a,300n);
  await assert.rejects(()=>h.legacyDebit(1n),/M10_RESERVED_HOUSE_FUNDS/);
  await h.transaction(c=>h.wallet.creditReservedWin(c,{...a,amountMinor:300n,collectionId:randomUUID()}));
  assert.equal(h.snapshot().wallets.get(house),0n);assert.equal(h.snapshot().wallets.get(user),1200n);
});
test('the available house amount includes other players holds and rejects overcommit',async()=>{
  const h=fixture({houseBalance:1000n}),a=args();await h.acceptedWin(a,900n);const before=h.snapshot();
  const b=args(undefined,100n,otherUser);
  await assert.rejects(()=>h.acceptedWin(b,400n),/M10_HOUSE_CAPACITY_UNAVAILABLE/);assert.deepEqual(h.snapshot(),before);
  await h.acceptedWin(b,300n);
  await h.transaction(async c=>{assert.equal(await h.wallet.houseBalance(c,user),0n);assert.equal(await h.wallet.reserveBalance(c,otherUser),300n);});
});
test('X2 increase/release changes only protected liability, not player cash or transfer history',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);const actionId=randomUUID();
  await h.transaction(c=>h.wallet.reserveWin(c,{...a,amountMinor:300n,actionId}));
  await h.transaction(c=>h.wallet.reserveWin(c,{...a,amountMinor:300n,actionId}));
  assert.equal(h.snapshot().reservations.get(a.roundId).amount,600n);assert.equal(h.snapshot().wallets.get(user),900n);assert.equal(h.snapshot().transfers.size,1);
  await h.transaction(c=>h.wallet.releaseReservedWin(c,{...a,amountMinor:600n,actionId:randomUUID()}));
  assert.equal(h.snapshot().reservations.get(a.roundId).amount,0n);assert.equal(h.snapshot().transfers.size,1);
  await h.transaction(async c=>{assert.equal(await h.wallet.houseBalance(c,user),10100n);await h.wallet.assertNoActiveRound(c,user);});
});
test('a second collection identity or altered accepted action amount cannot create another transfer',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);
  const collect={...a,amountMinor:300n,collectionId:randomUUID()};await h.transaction(c=>h.wallet.creditReservedWin(c,collect));const before=h.snapshot();
  for(const changed of [{...collect,collectionId:randomUUID()},{...collect,amountMinor:301n}]){
    await assert.rejects(()=>h.transaction(c=>h.wallet.creditReservedWin(c,changed)),/IDEMPOTENCY_PARAMETER_CONFLICT/);
    assert.deepEqual(h.snapshot(),before);
  }
});
test('owner, exact pending amount and persisted funding house remain binding',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);const before=h.snapshot();
  for(const changed of [{userId:otherUser},{amountMinor:200n},{amountMinor:301n}]){
    await assert.rejects(()=>h.transaction(c=>h.wallet.creditReservedWin(c,{...a,amountMinor:300n,collectionId:randomUUID(),...changed})),/M10_(RESERVATION_OWNER_MISMATCH|PENDING_WIN_AMOUNT_CHANGED)/);
    assert.deepEqual(h.snapshot(),before);
  }
  h.houseAssignment('synthetic-other-house');
  await assert.rejects(()=>h.transaction(c=>h.wallet.creditReservedWin(c,{...a,amountMinor:300n,collectionId:randomUUID()})),/M10_RESERVATION_HOUSE_CHANGED/);
  assert.deepEqual(h.snapshot(),before);
});
test('legacy capacity reads use available funds in both balance and copied lock-return rows',async()=>{
  const h=fixture(),a=args();await h.acceptedWin(a,300n);
  await h.transaction(async c=>{
    const raw=await h.dependencies.lockWallets(c,user),visible=await h.legacyDependencies.lockWallets(c,user);
    assert.equal(raw.find(r=>r.id===house).balance,'10100');assert.equal(visible.find(r=>r.id===house).balance,'9800');
    assert.equal(await h.legacyDependencies.balance(c,house),9800n);assert.equal(await h.legacyDependencies.balance(c,user),900n);
    await assert.rejects(()=>h.legacyDependencies.assertNoActive(c,user),/FINISH_ACTIVE_ROUND/);
  });
  assert.throws(()=>createM10ReservationBridge(h.legacyDependencies),/M10_RAW_HOST_CALLBACKS_REQUIRED/);
});
test('existing active-round and player-capacity callbacks remain part of the integration',async()=>{
  const h=fixture(),old={gameId:'synthetic-existing-game',roundId:randomUUID()};await h.oldActive(old);
  await h.transaction(async c=>{
    assert.deepEqual(await h.wallet.activeRound(c,user),old);
    await assert.rejects(()=>h.wallet.assertNoActiveRound(c,user),/OLD_ACTIVE_ROUND/);
    await h.wallet.assertPlayerCapacity(c,user,1000n,100n,300n);
  });
});
test('unsupported game IDs, fractional/coerced amounts and out-of-range integers fail before transfer',async()=>{
  const h=fixture(),before=h.snapshot(),a=args();
  for(const change of [{gameId:'old-game'},{amountMinor:0n},{amountMinor:1.5},{amountMinor:'100'},{amountMinor:9223372036854775808n}]){
    await assert.rejects(()=>h.transaction(c=>h.wallet.debitStake(c,{...a,...change})),/M10_(RESERVATION_ACTION_INVALID|LEDGER_MINOR_INVALID)/);
  }
  assert.deepEqual(h.snapshot(),before);
});
