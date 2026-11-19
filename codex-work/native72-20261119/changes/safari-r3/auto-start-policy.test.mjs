import test from 'node:test';import assert from 'node:assert/strict';import {canStartSafariAuto} from './auto-start-policy.mjs';
const base={phase:'ready',account:{game:{betLevels:['1.00','2.00']}},visible:true,focused:true,pending:false,busy:false,activeAuto:false,bet:'1.00',count:25};
test('AUTO selection only starts from an explicitly valid existing account',()=>{assert.equal(canStartSafariAuto(base),true);});
test('reject hidden/blurred or pending Safari auto before START PLAY',()=>{for(const update of [{visible:false},{focused:false},{pending:true},{busy:true},{activeAuto:true},{phase:'uncertain'},{account:null},{bet:'3.00'},{count:0},{count:1001}])assert.equal(canStartSafariAuto({...base,...update}),false,JSON.stringify(update));});
