import test from 'node:test';import assert from 'node:assert/strict';import {canStartSafariAuto,playableSafariBets} from './auto-start-policy.mjs';
const base={phase:'ready',account:{game:{betLevels:['1.00','2.00']}},visible:true,focused:true,pending:false,busy:false,activeAuto:false,bet:'1.00',count:25};
test('AUTO selection only starts from an explicitly valid existing account',()=>{assert.equal(canStartSafariAuto(base),true);});
test('reject hidden/blurred or pending Safari auto before START PLAY',()=>{for(const update of [{visible:false},{focused:false},{pending:true},{busy:true},{activeAuto:true},{phase:'uncertain'},{account:null},{bet:'3.00'},{count:0},{count:1001}])assert.equal(canStartSafariAuto({...base,...update}),false,JSON.stringify(update));});

test('BET selector takes account-approved amounts but enforces the existing Worker 1 ETB minimum',()=>{
 const account={game:{betLevels:['0.05','0.99','1.00','2.00','40000.00']}};
 assert.deepEqual(playableSafariBets(account),['1.00','2.00','40000.00']);
 assert.deepEqual(playableSafariBets({game:{betLevels:[]}}),[]);
 assert.deepEqual(playableSafariBets(null),[]);
 assert.equal(canStartSafariAuto({...base,account,bet:'0.99'}),false);
 assert.equal(canStartSafariAuto({...base,account,bet:'1.00'}),true);
});
test('malformed, negative or non-account BET values cannot start Safari AUTO',()=>{
 const account={game:{betLevels:['1.00','0.20','-2.00','1e2','2.001','n/a','02.00','2.00']}};
 assert.deepEqual(playableSafariBets(account),['1.00','2.00']);
 for(const bet of ['0.20','-2.00','1e2','2.001','n/a','02.00','9.00'])
  assert.equal(canStartSafariAuto({...base,account,bet}),false,bet);
});
