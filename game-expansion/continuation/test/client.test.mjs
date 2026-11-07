import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ExpansionSession,moneyMinor,formatMoney,fromMinor,getRoundActions,bindPlayerEvents} from '../client/session.mjs';
import {MachineScene,gridGeometry,frameList,presentationFrame,featureLabel,themeKind,providedRules,confirmedTowerAmounts,finalGridWins} from '../client/scene.mjs';
const ID='coinminer_native',SID='session-a',RID='11111111-1111-4111-8111-111111111111',QID='22222222-2222-4222-8222-222222222222';
const definition={id:ID,name:'Coin Miner',version:'v2',launchable:true,type:'mines',actions:['pick','cashout'],minStake:'0.10',maxStake:'100.00'};
const round=(extra={})=>({game_id:ID,round_id:RID,model_version:'v2',version:0,status:'active',stakeMinor:'10',currentCashoutMinor:'10',picks:[],actions:['pick','cashout'],...extra});
const state=(extra={})=>({game:definition,game_id:ID,authenticated:true,sessionId:SID,accepting:true,balance:'1000.00',currency:'ETB',server_now:1000,round:null,other_active_game:null,...extra});
const receipt=(extra={})=>state({status:'SUCCESS',request_id:QID,round:round(),balance:'999.90',...extra});
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>structuredClone(data)});
function memory(){const entries=new Map();return {entries,getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function client(fetchImpl,extra={}){const c=new ExpansionSession({gameId:ID,storage:memory(),fetchImpl,uuid:()=>QID,now:()=>1000,pause:async()=>{},...extra});c.setGame(definition);return c;}
const pendingKey='zplay-expansion:pending:v1:'+ID+':'+SID;
function savedIntent(){return {body:JSON.stringify({request_id:QID,type:'start',game_id:ID,model_version:'v2',stake:'0.10',options:{}}),requestId:QID,sessionId:SID,gameId:ID,type:'start',roundId:null,createdAt:1000};}

test('money is formatted as integer-backed strings without large-balance precision loss',()=>{
 assert.equal(formatMoney('99999999999999.99'),'99,999,999,999,999.99');assert.equal(moneyMinor('99999999999999.99'),9999999999999999n);assert.equal(fromMinor('123456789012345678'),'1,234,567,890,123,456.78');assert.equal(formatMoney(1000),'—');assert.equal(fromMinor(-10),'—');assert.equal(moneyMinor('0.100'),null);
});
test('signed-out initial and 401 states cannot place a wager and show no fake balance',async()=>{
 let posts=0;const c=client(async(_url,options)=>{posts+=options.method==='POST'?1:0;return reply({error:'UNAUTHORIZED'},401);});assert.equal(c.canStart(),false);await c.refresh();assert.equal(c.state.authenticated,false);assert.equal(c.state.balance,null);assert.equal(await c.start('0.10'),false);assert.equal(posts,0);
});
test('successful start freezes exact request, sends session header, and uses server wallet',async()=>{
 const calls=[];const store=memory();const c=client(async(url,options)=>{calls.push({url,...options});if(options.method==='POST'){assert.equal(store.entries.size,1);return reply(receipt());}return reply(state());},{storage:store});await c.refresh();assert.equal(await c.start('0.10',{mines:3}),true);const request=calls.find(call=>call.method==='POST');assert.deepEqual(JSON.parse(request.body),{request_id:QID,type:'start',game_id:ID,model_version:'v2',stake:'0.10',options:{mines:3}});assert.equal(request.headers['X-Zplay-Library-Session'],SID);assert.equal(c.state.balance,'999.90');assert.equal(store.entries.size,0);assert.equal(c.canStart(),false);
});
test('ambiguous transport failures retry the identical bytes, ID and original session',async()=>{
 const posts=[];const c=client(async(_url,options)=>{if(options.method!=='POST')return reply(state());posts.push(options);if(posts.length<3)throw Error('lost reply');return reply(receipt());});await c.refresh();assert.equal(await c.start('0.10'),true);assert.equal(posts.length,3);assert.equal(new Set(posts.map(call=>call.body)).size,1);assert.equal(new Set(posts.map(call=>call.headers['X-Zplay-Library-Session'])).size,1);
});
test('uncertain request is persisted, blocks new stakes and is retained after read-only refresh',async()=>{
 const store=memory();let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST'){posts++;throw Error('offline');}return reply(state());},{storage:store});await c.refresh();assert.equal(await c.start('0.10'),false);assert.equal(posts,3);assert.ok(store.getItem(pendingKey));assert.equal(c.canStart(),false);await c.refresh();assert.equal(c.state.pending,true);assert.equal(c.canStart(),false);assert.equal(await c.start('0.20'),false);assert.equal(posts,3);
});
test('reload restores the original pending bytes for the same game and session',async()=>{
 const store=memory(),saved=savedIntent();store.setItem(pendingKey,JSON.stringify(saved));let posted;const c=client(async(_url,options)=>{if(options.method==='POST'){posted=options.body;return reply(receipt({replayed:true}));}return reply(state({round:round(),balance:'999.90'}));},{storage:store});await c.refresh();assert.equal(c.pending.body,saved.body);assert.equal(await c.retry(),true);assert.equal(posted,saved.body);assert.equal(store.entries.size,0);
});
test('different game cannot restore another game pending request',async()=>{
 const store=memory();store.setItem(pendingKey,JSON.stringify(savedIntent()));const c=new ExpansionSession({gameId:'towerx_native',storage:store,fetchImpl:async()=>reply(state({game:{...definition,id:'towerx_native'},game_id:'towerx_native'}))});await c.refresh();assert.equal(c.pending,null);assert.equal(store.entries.size,1);
});
test('identity change during explicit retry never posts the old account intent',async()=>{
 const store=memory();store.setItem(pendingKey,JSON.stringify(savedIntent()));let reads=0,posts=0;const c=client(async(_url,options)=>{if(options.method==='POST')posts++;return reply(state({sessionId:++reads===1?SID:'session-b',balance:'12.34'}));},{storage:store});await c.refresh();assert.ok(c.pending);assert.equal(await c.retry(),false);assert.equal(posts,0);assert.equal(c.state.sessionId,'session-b');assert.equal(c.state.balance,'12.34');assert.ok(store.getItem(pendingKey));
});
test('auth rejection after a lost reply preserves the original account pending record',async()=>{
 const store=memory();let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST'){if(++posts===1)throw Error('reply lost');return reply({error:'LIBRARY_SESSION_CHANGED'},403);}return reply(state());},{storage:store});await c.refresh();await c.start('0.10');assert.equal(c.state.authenticated,false);assert.equal(c.state.balance,null);assert.ok(store.getItem(pendingKey));
});
test('late state read cannot overwrite a newer wager receipt',async()=>{
 const late=deferred();let reads=0;const c=client(async(_url,options)=>options.method==='POST'?reply(receipt()):++reads===1?reply(state()):late.promise);await c.refresh();const oldRead=c.refresh();await c.start('0.10');late.resolve(reply(state({balance:'1000.00'})));await oldRead;assert.equal(c.state.balance,'999.90');assert.equal(c.state.round.round_id,RID);
});
test('out-of-order reads apply only the latest requested state',async()=>{
 const a=deferred(),b=deferred();let reads=0;const c=client(async()=>++reads===1?a.promise:b.promise);const first=c.refresh(),second=c.refresh();b.resolve(reply(state({balance:'12.00'})));await second;a.resolve(reply(state({balance:'1000.00'})));await first;assert.equal(c.state.balance,'12.00');
});
test('disconnect invalidates outstanding read so stale authentication cannot return',async()=>{
 const late=deferred(),c=client(async()=>late.promise);const p=c.refresh();c.disconnect('Signed out');late.resolve(reply(state()));await p;assert.equal(c.state.authenticated,false);assert.equal(c.state.balance,null);assert.equal(c.state.sessionId,'');
});
test('historical replay receipt never restores historical balance or round',async()=>{
 let reads=0;const newer=round({version:8,status:'settled',payoutMinor:'60',actions:[]});const seen=[];const c=client(async(_url,options)=>options.method==='POST'?reply(receipt({replayed:true,balance:'100.00',current_balance:'500.00',round:round({version:0})})):reply(state(++reads===1?{}:{balance:'900.60',round:newer})),{onChange:s=>seen.push(s.balance)});await c.refresh();assert.equal(await c.start('0.10'),true);assert.equal(c.state.balance,'900.60');assert.equal(c.state.round.version,8);assert.ok(!seen.includes('100.00'));assert.ok(!seen.includes('500.00'));
});
test('replay requires a fresh successful read; failure keeps exact pending intent and blocks start',async()=>{
 let reads=0,allowRead=false;const c=client(async(_url,options)=>{if(options.method==='POST')return reply(receipt({replayed:true}));if(++reads>1&&!allowRead)throw Error('fresh state offline');return reply(state({round:null,balance:'998.00'}));});await c.refresh();assert.equal(await c.start('0.10'),false);assert.equal(c.state.confirming,true);assert.ok(c.pending);assert.equal(c.canStart(),false);allowRead=true;await c.refresh();assert.ok(c.pending);assert.equal(c.canStart(),false);assert.equal(await c.retry(),true);assert.equal(c.state.balance,'998.00');assert.equal(c.pending,null);
});
test('accepted round actions remain enabled when new rounds are paused and use stored model version',async()=>{
 let sent;const c=client(async(_url,options)=>{if(options.method==='POST'){sent=JSON.parse(options.body);return reply(receipt({accepting:false,round:round({model_version:'old-v1',version:4,status:'settled',payoutMinor:'20',actions:[]})}));}return reply(state({accepting:false,round:round({model_version:'old-v1',version:3})}));});await c.refresh();assert.equal(c.canStart(),false);assert.equal(c.canAct('cashout'),true);assert.equal(await c.act('cashout'),true);assert.equal(sent.model_version,'old-v1');assert.equal(sent.expected_version,3);assert.equal(sent.round_id,RID);
});
test('version rejection refreshes the round and never silently resubmits a new action',async()=>{
 let posts=0,reads=0;const c=client(async(_url,options)=>{if(options.method==='POST'){posts++;return reply({error:'ROUND_VERSION_CHANGED'},409);}return reply(state({round:round({version:++reads===1?1:2})}));});await c.refresh();assert.equal(await c.act('pick',{index:2}),false);assert.equal(posts,1);assert.equal(c.state.round.version,2);assert.equal(c.pending,null);
});
test('storage denial prevents POST before financial intent leaves the browser',async()=>{
 let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST')posts++;return reply(state());},{storage:{getItem:()=>null,setItem:()=>{throw Error('denied');},removeItem:()=>{}}});await c.refresh();assert.equal(await c.start('0.10'),false);assert.equal(posts,0);assert.match(c.state.message,/save this action safely/);
});
test('corrupt persisted intent cannot be cleared by ordinary successful refresh',async()=>{
 const store=memory();store.setItem(pendingKey,'{broken');const c=client(async()=>reply(state()),{storage:store});await c.refresh();assert.equal(c.state.recoveryBlocked,true);assert.equal(c.canStart(),false);await c.refresh();assert.equal(c.state.recoveryBlocked,true);assert.equal(c.canStart(),false);assert.equal(c.canAct('cashout'),false);assert.equal(store.getItem(pendingKey),'{broken');
});
test('malformed settled payout is not applied and remains retryable',async()=>{
 let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST'){posts++;return reply(receipt({round:round({status:'settled',payoutMinor:'NaN'})}));}return reply(state());});await c.refresh();assert.equal(await c.start('0.10'),false);assert.equal(c.state.balance,'1000.00');assert.equal(c.state.round,null);assert.ok(c.pending);assert.equal(posts,1);
});
test('receipt with another session or ID remains unresolved, never applied',async()=>{
 let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST'){posts++;return reply(receipt({sessionId:'wrong-account',balance:'123.45'}));}return reply(state());});await c.refresh();assert.equal(await c.start('0.10'),false);assert.equal(posts,3);assert.equal(c.state.balance,'1000.00');assert.ok(c.pending);
});
test('duplicate input while request is in flight cannot place another wager',async()=>{
 const pending=deferred();let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST'){posts++;return pending.promise;}return reply(state());});await c.refresh();const a=c.start('0.10');assert.equal(await c.start('0.20'),false);assert.equal(await c.retry(),false);pending.resolve(reply(receipt()));await a;assert.equal(posts,1);
});
test('insufficient funds and out-of-range stakes are rejected without a financial call',async()=>{
 let posts=0;const c=client(async(_url,options)=>{if(options.method==='POST')posts++;return reply(state({balance:'0.09'}));});await c.refresh();assert.equal(await c.start('0.10'),false);assert.equal(await c.start('0.00'),false);assert.equal(await c.start('100.01'),false);assert.equal(posts,0);
});
test('an active game elsewhere blocks starts here',async()=>{
 const c=client(async()=>reply(state({other_active_game:'jetx_native'})));await c.refresh();assert.equal(c.canStart(),false);assert.match(c.state.message,/other active game/);
});
test('server publicConfig and structured model are retained alongside authoritative stake limits',async()=>{
 const c=client(async()=>reply(state({game:{...definition,math:'descriptive engine text',publicConfig:{symbols:[{id:'a'}]},model:{evaluation:'cluster'}}})));await c.refresh();assert.deepEqual(c.state.game.math,{evaluation:'cluster'});assert.deepEqual(c.state.game.symbols,[{id:'a'}]);assert.equal(c.state.game.minStake,'0.10');
});
test('actions are strictly taken from declared round or game actions',()=>{
 assert.deepEqual(getRoundActions(round({actions:['pick']}),definition),['pick']);assert.deepEqual(getRoundActions(round({status:'settled'}),definition),[]);assert.deepEqual(getRoundActions(round({actions:[{id:'cashout'}]}),definition),['cashout']);
});
test('presentation reads server frames, including cumulative Tower X building frames',()=>{
 const r={floors:[{multiplier:3},{multiplier:50}],frames:[{kind:'building',floor:{multiplier:3},multiplier:3},{kind:'building',floor:{multiplier:50},multiplier:50}],payoutMinor:'53'};
 assert.equal(frameList(r).length,2);assert.equal(presentationFrame(r,0).floors.length,1);assert.equal(presentationFrame(r,0).currentBuildingMultiplier,3);assert.equal(presentationFrame(r,1).floors.length,2);assert.equal(presentationFrame(r,1).sequenceLast,true);assert.equal(r.payoutMinor,'53');assert.equal(featureLabel({type:'expanding_wild',multiplier:3}),'expanding wild ×3');
});
test('mobile and desktop scene geometry stays within canvas for every supported grid',()=>{
 for(const width of [338,362,402,680])for(const [columns,rows,family]of [[3,3,'slots'],[5,3,'slots'],[5,4,'slots'],[6,5,'slots'],[5,5,'mines']]){const height=family==='mines'?400:340,g=gridGeometry(width,height,columns,rows,family);assert.ok(g.x>=0&&g.y>=0);assert.ok(g.x+g.w<=width);assert.ok(g.y+g.h<=height);assert.ok(g.cellW>0&&g.cellH>0);}
});
test('all available public configs execute Canvas rendering without financial or network hooks',async()=>{
 const remaining=JSON.parse(await readFile(new URL('../remaining-public-configs.json',import.meta.url),'utf8')),first=await import('../models/smartsoft-slots.mjs');const configs=[...remaining,...first.publicGames];assert.equal(configs.length,23);const gradient={addColorStop(){}};const context=new Proxy({}, {get(target,key){if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>gradient;return target[key]??(()=>{});},set(target,key,value){target[key]=value;return true;}});
 const canvas={getContext:()=>context,getBoundingClientRect:()=>({width:362,height:400})};const scene=new MachineScene(canvas);scene.resize();
 for(const config of configs){scene.setGame(config);scene.draw(0,{});scene.draw(1200,{busy:true});const grid=Array.from({length:config.columns||5},()=>Array.from({length:config.rows||3},()=>config.symbols?.[0]?.id||'coin'));scene.draw(1800,{round:{family:config.type,status:'settled',grid,wins:[],payoutMinor:'0',picks:[{index:1,safe:true},{index:4,safe:false}],floors:[{level:1,multiplier:2}],totalBuildingMultiplier:2}});assert.ok(themeKind(config));}
});

// Bounds must be read from the authenticated state before any start is enabled.
test('missing authenticated model or stake bounds cannot enable a new start',async()=>{
 const c=client(async()=>reply(state({game:{...definition,minStake:undefined,maxStake:undefined}})));await c.refresh();assert.equal(c.canStart(),false);
 const d=client(async()=>reply(state({game:{...definition,version:undefined}})));await d.refresh();assert.equal(d.state.connected,false);assert.equal(d.canStart(),false);
});

test('actual presence events clear identity, preserve pending storage, and ready refreshes identity',async()=>{
 for(const eventName of ['zplay:logout','zplay:session-expired','zplay:session-changing']){
  const store=memory();store.setItem(pendingKey,JSON.stringify(savedIntent()));let reads=0;const c=client(async()=>{reads++;return reply(state());},{storage:store});await c.refresh();const target=new EventTarget(),unbind=bindPlayerEvents(target,c);target.dispatchEvent(new Event(eventName));assert.equal(c.state.authenticated,false,eventName);assert.equal(c.state.balance,null,eventName);assert.ok(store.getItem(pendingKey));target.dispatchEvent(new Event('zplay:session-ready'));await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,2);assert.equal(c.state.authenticated,true);assert.ok(c.pending);assert.equal(c.canStart(),false);unbind();
 }
});
test('provided per-game rules are retained verbatim for the help dialog',()=>{
 const rules=['Five paylines stay fixed.','Automatic respins take no additional stake.'];assert.deepEqual(providedRules({rules}),rules);assert.deepEqual(providedRules({rules:[...rules,null,{},'']}),rules);
});
test('Tower X overall multiplier uses the confirmed total payout and stake, not base-unit sum',()=>{
 assert.equal(confirmedTowerAmounts({stakeMinor:'10000',payoutMinor:'500000',totalBuildingMultiplier:5000,baseUnitsPerStake:100}).totalMultiplier,'50.00');
 assert.equal(confirmedTowerAmounts({stakeMinor:'10',payoutMinor:'2',totalBuildingMultiplier:25,baseUnitsPerStake:100}).totalMultiplier,'0.20');
});
test('Tower Rush banked and at-risk displays derive only from confirmed money fields',()=>{
 assert.deepEqual(confirmedTowerAmounts({stakeMinor:'100',currentCashoutMinor:'125',lockedPayoutMinor:'62'}),{banked:'0.62',atRisk:'0.63',totalMultiplier:'—'});assert.equal(confirmedTowerAmounts({currentCashoutMinor:'12',lockedPayoutMinor:'13'}).atRisk,'—');
});
test('final and skipped result grids highlight only their own frame while retaining total payout',()=>{
 const first={symbol:'a',cells:[[0,0]],payoutMinor:'10',frame:0},last={symbol:'b',cells:[[1,0]],payoutMinor:'20',frame:1};
 const result={grid:[['b'],['b']],payoutMinor:'30',wins:[first,last],frames:[{grid:[['a'],['a']],wins:[first]},{grid:[['b'],['b']],wins:[last]}]};
 assert.deepEqual(finalGridWins(result),[last]);assert.equal(result.payoutMinor,'30');assert.deepEqual(finalGridWins({...result,grid:[['c'],['c']],omittedFrames:1}),[]);
});
