// Cache-free host regressions. Checked-in manifests and local public receipt
// fixtures are real inputs; decoding and painting are injected test doubles.
// These tests do not claim browser rendering or any production wallet action.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ReferencePresentationHost,REFERENCE_PRESENTATION_IDS} from '../client/reference-presentation.mjs';

const ORIGIN='https://zplay.test';
const sha=value=>createHash('sha256').update(value).digest('hex');
const clone=value=>structuredClone(value);
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const configs=[...JSON.parse(await read('models/smartsoft-slots.public.json')),...JSON.parse(await read('remaining-public-configs.json'))];
const groupFor=id=>id.startsWith('multihot')||id.startsWith('burningice')||['safarisimba_native','habeshafortune5_native'].includes(id)?'smartsoft':['bookofmagic_native','vegasnights_native'].includes(id)?'remaining-slots':['towerx_native','towerrush_native','coinminer_native'].includes(id)?'arcade':'legends';
const pathFor=id=>'presentation/'+(groupFor(id)==='smartsoft'?'':groupFor(id)+'/')+'manifests/'+id+'.json';
const response=(source,status=200,url='')=>({ok:status>=200&&status<300,status,url,arrayBuffer:async()=>Uint8Array.from(Buffer.from(source)).buffer});
const context=()=>({canvas:{width:780,height:1688},clears:[],matrix:[2,0,0,2,0,0],stack:[],save(){this.stack.push([...this.matrix]);},restore(){this.matrix=this.stack.pop();},setTransform(...matrix){this.matrix=matrix;},clearRect(...box){this.clears.push({box,matrix:[...this.matrix]});}});

async function harness(id='multihot40_native',{manifestEdit,fetchHook,prepareHook,painterHook,storeHook}={}){
 const raw=await read(pathFor(id)),manifest=JSON.parse(raw);if(manifestEdit)manifestEdit(manifest);
 const source=manifestEdit?JSON.stringify(manifest):raw;
 const game={...clone(configs.find(game=>game.id===id)),referencePresentation:{manifestURL:'/native-library/expansion/r1/'+pathFor(id),manifestSha256:sha(source),assetBaseURL:'/native-library/reference-art/r1/'+groupFor(id)+'/assets/',modelVersion:configs.find(game=>game.id===id).version}};
 const h={game,manifest,source,requests:[],stores:[],paints:[],context:context(),prepareHook,fetchHook,painterHook,preparedCount:0,observers:[]};
 h.whenPrepared=count=>h.preparedCount>=count?Promise.resolve():new Promise(resolve=>h.observers.push({count,resolve}));
 const fetchImpl=async(url,options)=>{
  const request={url:String(url),options};h.requests.push(request);
  return h.fetchHook?h.fetchHook(request,h):response(h.source);
 };
 const storeFactory=(manifest,options)=>{
  const store={manifest,options,prepared:[],disposed:0,async prepare(scene){this.prepared.push(scene);const result=h.prepareHook?h.prepareHook(scene,this,h):new Map();h.preparedCount++;for(const observer of h.observers)if(h.preparedCount>=observer.count)observer.resolve();return result;},dispose(){this.disposed++;}};
  h.stores.push(store);if(storeHook)storeHook(store,h);return store;
 };
 const painter=(ctx,scene,manifest,images,viewport)=>{h.paints.push({ctx,scene,manifest,images,viewport,matrix:[...ctx.matrix]});if(h.painterHook)h.painterHook(ctx,scene,manifest,images,viewport);};
 h.host=new ReferencePresentationHost(h.context,{origin:ORIGIN,fetchImpl,storeFactory,painter});
 h.setResult=h.host.setGame(game);
 h.round=(extra={})=>({round_id:'isolated-round',game_id:id,model_version:game.version,version:0,status:'settled',stakeMinor:'100',payoutMinor:'321',grid:Array.from({length:game.columns||5},()=>Array(game.rows||3).fill(String(game.symbols[0]?.id??'0'))),wins:[],frames:[],...extra});
 h.state=(extra={})=>({connected:true,authenticated:true,sessionId:'isolated-session',game,balance:'123.45',currency:'ETB',error:false,pending:false,busy:false,round:null,...extra});
 h.draw=(state=h.state(),options={})=>h.host.draw(state,{frameIndex:null,selectedStake:'1.00',width:390,height:844,...options});
 return h;
}
const texts=scene=>scene.commands.filter(command=>command.type==='text').map(command=>command.text);

test('the selector contains exactly18 mapped presentations and refuses unresolved/help-only games',async()=>{
 assert.equal(REFERENCE_PRESENTATION_IDS.length,18);assert.equal(new Set(REFERENCE_PRESENTATION_IDS).size,18);assert(Object.isFrozen(REFERENCE_PRESENTATION_IDS));
 const h=await harness();
 for(const id of ['moonstone_native','samurai_native','magicgarden_native','darkhorus_native','assassins_native','arbitrary_native']){
  const result=h.host.setGame({...h.game,id});assert.equal(result.status,'unsupported',id);
  assert.equal((await h.draw()).status,'unsupported',id);
 }
 assert.equal(h.requests.length,0);assert.equal(h.stores.length,0);assert.equal(h.paints.length,0);
});

test('verified manifests are fetched read-only and pinned before parsing or creating a store',async()=>{
 const h=await harness();h.fetchHook=()=>response('invalid JSON with an incorrect SHA');
 const result=await h.draw();assert.equal(result.status,'error');assert.equal(result.reason,'manifest_hash_mismatch');assert.equal(h.stores.length,0);assert.equal(h.paints.length,0);
 const {url,options}=h.requests[0];assert.equal(url,ORIGIN+h.game.referencePresentation.manifestURL);
 assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert(options.signal instanceof AbortSignal);
 h.fetchHook=()=>response(h.source);h.host.invalidate('retry');assert.equal((await h.draw()).status,'painted');assert.equal(h.requests.length,2);
 assert.equal(h.stores[0].manifest.modelVersion,h.game.version);
});

test('same-origin descriptor validation rejects external URLs, credentials, fragments and version drift',async()=>{
 const h=await harness();
 for(const replacement of [{manifestURL:'https://other.test/game.json'},{assetBaseURL:'https://other.test/assets/'},{manifestURL:'https://user:pass@zplay.test/game.json'},{manifestURL:'/game.json#token'},{assetBaseURL:'/assets/?session=secret'},{assetBaseURL:'/assets'},{manifestSha256:'not-a-hash'},{modelVersion:'wrong-version'}]){
  assert.equal(h.host.setGame({...h.game,referencePresentation:{...h.game.referencePresentation,...replacement}}).status,'error');
 }
 assert.equal(h.requests.length,0);
 const invalid=new ReferencePresentationHost(h.context,{origin:'file:///tmp/review'});assert.equal(invalid.setGame(h.game).status,'error');
});

test('a correct hash cannot authorize another game, model version, executable asset or open gate',async()=>{
 const changes=[m=>{m.id='different_native';},m=>{m.modelVersion='other-model';},m=>{m.productionLaunchEnabled=true;},m=>{m.financialActions=true;},m=>{m.grid.columns=99;},m=>{const [file,entry]=Object.entries(m.files)[0];m.files[entry.sha256+'.js']=entry;delete m.files[file];},m=>{m.frames[Object.keys(m.frames)[0]].file='../../script.js';}];
 for(const manifestEdit of changes){const h=await harness('multihot40_native',{manifestEdit});const result=await h.draw();assert.equal(result.status,'error');assert.equal(h.paints.length,0);assert.equal(h.stores.length,0);}
});

test('the asset fetch wrapper cannot request provider hosts, API routes or unlocked filenames',async()=>{
 const h=await harness();h.prepareHook=async(scene,store)=>{
  for(const url of ['https://provider.test/runtime.js',ORIGIN+'/api/expansion/action',store.options.baseURL+'0'.repeat(64)+'.png'])await assert.rejects(store.options.fetchImpl(url));
  const file=Object.keys(store.manifest.files)[0];await assert.rejects(store.options.fetchImpl(new URL(file,store.options.baseURL),{method:'POST'}));
  return new Map();
 };
 assert.equal((await h.draw()).status,'painted');assert.equal(h.requests.length,1);assert(h.requests.every(item=>item.options.method==='GET'));
});

test('a normal static paint retains all review gates and the logical DPR transform',async()=>{
 const h=await harness();const state=h.state({round:h.round()});const before=clone(state);
 const first=await h.draw(state);assert.equal(first.status,'painted');assert.equal(first.reused,false);assert.equal(first.financialActions,false);assert.equal(first.scene.financialActions,false);assert.equal(first.scene.productionLaunchEnabled,false);
 assert.deepEqual(h.paints[0].matrix,[2,0,0,2,0,0]);assert.deepEqual(h.context.matrix,[2,0,0,2,0,0]);assert.deepEqual(h.context.clears[0],{box:[0,0,780,1688],matrix:[1,0,0,1,0,0]});assert.deepEqual(state,before);
 const second=await h.draw(state);assert.equal(second.status,'painted');assert.equal(second.reused,true);assert.equal(h.requests.length,1);assert.equal(h.stores[0].prepared.length,1);assert.equal(h.paints.length,2);
 assert.equal(h.host.setGame({...h.game}).status,'ready');assert.equal(h.stores[0].disposed,0);
 assert(texts(first.scene).includes('123.45'));assert(texts(first.scene).includes('3.21 ETB'));
});

test('missing authentication, offline state, errors and absent session identity clear synchronously',async()=>{
 for(const change of [{authenticated:false},{connected:false},{error:true},{sessionId:''}]){
  const h=await harness();await h.draw(h.state({round:h.round()}));const clears=h.context.clears.length,painted=h.paints.length;
  const pending=h.draw(h.state({round:h.round(),...change}));assert(h.context.clears.length>clears);assert.equal(h.stores[0].disposed,1);
  assert.equal((await pending).status,'unconfirmed');assert.equal(h.paints.length,painted);assert.equal(h.host.getCoinGeometry(),null);
 }
});

test('wrong game/model versions and malformed monetary fields never draw a receipt',async()=>{
 const h=await harness();
 for(const change of [{game_id:'vegasnights_native'},{gameId:'another_native'},{model_version:'old-version'},{modelVersion:'other-version'},{version:-1},{stakeMinor:100},{stakeMinor:'1.00'},{payoutMinor:'1.1'},{status:'active',payoutMinor:'100'},{currentCashoutMinor:0}]){
  const result=await h.draw(h.state({round:h.round(change)}));assert.equal(result.status,'error');
 }
 for(const change of [{game:{...h.game,version:'future'}},{balance:100},{balance:'1,000.00'},{currency:'DMO'}])assert.equal((await h.draw(h.state(change))).status,'error');
 assert.equal(h.requests.length,0);assert.equal(h.paints.length,0);
});

test('logout during manifest loading aborts the request and a late response cannot prepare or paint',async()=>{
 const wait=defer(),h=await harness('multihot40_native',{fetchHook:()=>wait.promise});const drawing=h.draw(h.state({round:h.round()}));
 assert.equal(h.requests.length,1);const logout=h.draw(h.state({authenticated:false}));assert.equal(h.requests[0].options.signal.aborted,true);
 wait.resolve(response(h.source));assert.equal((await logout).status,'unconfirmed');assert.equal((await drawing).status,'stale');assert.equal(h.stores.length,0);assert.equal(h.paints.length,0);
});

test('out-of-order image loading across sessions only paints the most recent account state',async()=>{
 const waits=[],h=await harness('multihot40_native',{prepareHook:()=>{const wait=defer();waits.push(wait);return wait.promise;}});
 const first=h.draw(h.state({balance:'123.45',round:h.round()}));await h.whenPrepared(1);assert.equal(waits.length,1);
 const next=h.draw(h.state({sessionId:'new-session',balance:'9.00',round:h.round({round_id:'new-round'})}));await h.whenPrepared(2);assert.equal(waits.length,2);
 waits[1].resolve(new Map());assert.equal((await next).status,'painted');waits[0].resolve(new Map());assert.equal((await first).status,'stale');
 assert.equal(h.paints.length,1);assert(texts(h.paints[0].scene).includes('9.00'));assert(!texts(h.paints[0].scene).includes('123.45'));
});

test('a changed round version supersedes a slower decode of an older receipt',async()=>{
 const waits=[],h=await harness('multihot40_native',{prepareHook:()=>{const wait=defer();waits.push(wait);return wait.promise;}});
 const first=h.draw(h.state({round:h.round({payoutMinor:'123'})}));await h.whenPrepared(1);
 const next=h.draw(h.state({round:h.round({version:1,payoutMinor:'456'})}));await h.whenPrepared(2);waits[1].resolve(new Map());await next;waits[0].resolve(new Map());
 assert.equal((await first).status,'stale');assert.equal(h.paints.length,1);assert(texts(h.paints[0].scene).includes('4.56 ETB'));assert(!texts(h.paints[0].scene).includes('1.23 ETB'));
});

test('stale frames and stale viewport sizes cannot overwrite a later presentation',async()=>{
 const waits=[],h=await harness('multihot40_native',{prepareHook:()=>{const wait=defer();waits.push(wait);return wait.promise;}});
 const state=h.state({round:h.round({frames:[{grid:Array.from({length:5},()=>Array(4).fill('0')),wins:[]},{grid:Array.from({length:5},()=>Array(4).fill('1')),wins:[]}]})});
 const first=h.draw(state,{frameIndex:0});await h.whenPrepared(1);const second=h.draw(state,{frameIndex:1,width:430,height:800});await h.whenPrepared(2);
 waits[1].resolve(new Map());const result=await second;waits[0].resolve(new Map());assert.equal((await first).status,'stale');assert.equal(h.paints.length,1);assert.deepEqual(h.paints[0].viewport,{width:430,height:800});
 const symbolFrames=result.scene.commands.filter(command=>command.type==='sprite'&&command.frame===h.manifest.symbols['1'].frame);assert.equal(symbolFrames.length,20);
});

test('resize alone and explicit invalidation cancel an in-flight paint',async()=>{
 for(const mode of ['resize','retry']){
  const wait=defer(),h=await harness('multihot40_native',{prepareHook:()=>wait.promise});const first=h.draw();await h.whenPrepared(1);
  if(mode==='resize')h.host.resize(400,850);else h.host.invalidate('retry');
  wait.resolve(new Map());assert.equal((await first).status,'stale');assert.equal(h.paints.length,0);
  if(mode==='retry')assert(h.stores[0].disposed>=1);
 }
});

test('switching games or model bindings retires old resources without a late image paint',async()=>{
 for(const mode of ['game','model']){
  const wait=defer(),h=await harness('multihot40_native',{prepareHook:()=>wait.promise});const first=h.draw();await h.whenPrepared(1);
  const other=mode==='game'?(await harness('multihot100_native')).game:{...h.game,version:'new-model',referencePresentation:{...h.game.referencePresentation,modelVersion:'new-model'}};
  assert.equal(h.host.setGame(other).status,'configured');assert(h.stores[0].disposed>=1);wait.resolve(new Map());assert.equal((await first).status,'stale');assert.equal(h.paints.length,0);
 }
});

test('disposing during image loading is permanent and later decoded resources are disposed',async()=>{
 const wait=defer(),h=await harness('multihot40_native',{prepareHook:()=>wait.promise});const first=h.draw();await h.whenPrepared(1);
 assert.equal(h.host.dispose().status,'disposed');wait.resolve(new Map());assert.equal((await first).status,'stale');assert(h.stores[0].disposed>=2);assert.equal(h.paints.length,0);
 assert.equal(h.host.setGame(h.game).status,'disposed');assert.equal((await h.draw()).status,'disposed');assert.equal(h.host.resize(390,844).status,'disposed');
});

test('same pending view shares one preparation and image failure resolves to an error without a paint',async()=>{
 const wait=defer(),h=await harness('multihot40_native',{prepareHook:()=>wait.promise});const state=h.state();const first=h.draw(state),second=h.draw(state);assert.equal(first,second);await h.whenPrepared(1);assert.equal(h.stores[0].prepared.length,1);
 wait.reject(Error('isolated decode failure'));assert.equal((await first).status,'error');assert.equal((await second).status,'error');assert.equal(h.paints.length,0);
 h.prepareHook=null;h.host.invalidate('retry');assert.equal((await h.draw()).status,'painted');assert.equal(h.requests.length,2);
});

test('the snapshot is copied before decoding and later caller mutation does not affect the painted receipt',async()=>{
 const wait=defer(),h=await harness('multihot40_native',{prepareHook:()=>wait.promise});const state=h.state({round:h.round()});const drawing=h.draw(state);await h.whenPrepared(1);
 state.balance='0.00';state.round.payoutMinor='999999';state.round.grid[0][0]='7';wait.resolve(new Map());const result=await drawing;
 assert.equal(result.status,'painted');assert(texts(result.scene).includes('123.45'));assert(texts(result.scene).includes('3.21 ETB'));assert(!texts(result.scene).includes('9999.99 ETB'));
});

test('Book provider9 aliases every selected frame without mutating the model receipt',async()=>{
 const h=await harness('bookofmagic_native'),grid=Array.from({length:5},()=>Array(3).fill('princess'));
 const round=h.round({grid,frames:[{grid:clone(grid),wins:[{symbol:'princess',cells:[[0,0],[1,0],[2,0]],payoutMinor:'100'}]},{grid:clone(grid),wins:[]}],wins:[{symbol:'princess',cells:[[0,0]],frame:0,payoutMinor:'100'}]});
 const state=h.state({round}),before=clone(state);
 for(const frameIndex of [0,1,null]){const result=await h.draw(state,{frameIndex});assert.equal(result.status,'painted');assert.equal(result.scene.commands.filter(command=>command.type==='sprite'&&command.frame===h.manifest.symbols.sorceress.frame).length,15);}
 assert.deepEqual(state,before);assert(state.round.grid.every(column=>column.every(id=>id==='princess')));
 const wrong=await harness('bookofmagic_native',{manifestEdit:m=>{m.symbols.sorceress.providerId=8;}});assert.equal((await wrong.draw()).reason,'book_symbol_alias_not_verified');
});

test('a visible frame never borrows a final-round grid, win outline or multiplier',async()=>{
 const h=await harness('multihot40_native'),grid=Array.from({length:5},()=>Array(4).fill('0'));
 const round=h.round({grid,feature:{multiplier:5},wins:[{cells:[[0,0],[1,0],[2,0]],frame:1}],frames:[{grid:clone(grid),wins:[],feature:{multiplier:1}},{grid:clone(grid),wins:[{cells:[[0,0],[1,0],[2,0]],frame:1}],feature:{multiplier:5}}]});
 const early=await h.draw(h.state({round}),{frameIndex:0});assert.equal(early.status,'painted');assert.equal(early.scene.commands.filter(command=>command.type==='outline').length,0);
 const expected=Math.PI*h.manifest.multiplier.angleNumerators[1]/h.manifest.multiplier.angleDenominator;assert(early.scene.commands.filter(command=>command.rotation).every(command=>command.rotation===expected));
 const bad=await h.draw(h.state({round}),{frameIndex:99});assert.equal(bad.status,'error');assert.equal(bad.reason,'invalid_frame_index');
 const empty=clone(round);empty.frames[0]={wins:[]};const blank=await h.draw(h.state({round:empty}),{frameIndex:0});assert.equal(blank.status,'painted');assert.equal(blank.scene.commands.filter(command=>command.type==='sprite'&&command.frame===h.manifest.symbols['0'].frame).length,0);
});

test('Vegas selects the free-spin background only for an explicitly confirmed free-spin frame',async()=>{
 const h=await harness('vegasnights_native'),grid=Array.from({length:5},()=>Array(3).fill('vegas3'));
 const round=h.round({grid,frames:[{kind:'free-spin',grid:clone(grid),wins:[]},{kind:'extra-wild-respin',grid:clone(grid),wins:[]}]});
 const free=await h.draw(h.state({round}),{frameIndex:0}),extra=await h.draw(h.state({round}),{frameIndex:1});
 assert(free.scene.commands.some(command=>command.frame===h.manifest.background.freeSpinsFrame));
 assert(extra.scene.commands.some(command=>command.frame===h.manifest.background.frame));
 assert(!extra.scene.commands.some(command=>command.frame===h.manifest.background.freeSpinsFrame));
});

test('Coin geometry fits the original board at phone and desktop sizes and excludes every gutter',async()=>{
 const h=await harness('coinminer_native');assert.equal(h.host.getCoinGeometry(),null);assert.equal((await h.draw()).status,'painted');
 for(const [width,height]of [[360,640],[390,844],[1363,900]]){
  const geometry=h.host.getCoinGeometry(width,height);assert.equal(geometry.cells.length,25);assert.equal(geometry.width,geometry.cellWidth*5+geometry.columnGap*4);
  for(const cell of geometry.cells)assert.equal(h.host.coinCellAt(cell.x+cell.width/2,cell.y+cell.height/2,width,height),cell.index);
  const first=geometry.cells[0];assert.equal(h.host.coinCellAt(first.x+first.width+geometry.columnGap/2,first.y+first.height/2,width,height),null);assert.equal(h.host.coinCellAt(first.x+first.width/2,first.y+first.height+geometry.rowGap/2,width,height),null);
  assert.equal(h.host.coinCellAt(geometry.x-1,geometry.y,width,height),null);
 }
 h.host.invalidate('signout');assert.equal(h.host.getCoinGeometry(),null);assert.equal(h.host.coinCellAt(40,200),null);
});

test('TowerX frame prefixes cannot reveal later buildings or the final payout',async()=>{
 const h=await harness('towerx_native'),floors=[{level:1,type:'suburb',multiplier:4},{level:2,type:'city',multiplier:8},{level:3,type:'neon',multiplier:400}];
 const round=h.round({floors,totalBuildingMultiplier:412,payoutMinor:'4120',frames:floors.map(floor=>({kind:'building',floor}))});
 const prefix=await h.draw(h.state({round}),{frameIndex:0});assert.equal(prefix.status,'painted');assert.equal(prefix.scene.visibleFloorCount,1);assert.equal(prefix.scene.settledResultShown,false);assert(!texts(prefix.scene).includes('41.20'));
 const complete=await h.draw(h.state({round}));assert.equal(complete.scene.visibleFloorCount,3);assert.equal(complete.scene.settledResultShown,true);assert(texts(complete.scene).includes('41.20'));
});

test('Legends only shows progress and symbols from the selected confirmed frame',async()=>{
 const h=await harness('olympianlegends_native'),grid=symbol=>Array.from({length:6},()=>Array(5).fill(symbol));
 const round=h.round({grid:grid('majorBlue'),progress:110,frames:[{grid:grid('majorYellow'),wins:[],progress:20,god:'Apollo'},{grid:grid('majorBlue'),wins:[],progress:110,god:'Zeus'}]});
 const early=await h.draw(h.state({round}),{frameIndex:0});assert.equal(early.status,'painted');assert(texts(early.scene).includes('PROGRESS 20'));assert(!texts(early.scene).includes('PROGRESS 110'));assert.equal(early.scene.commands.filter(command=>command.type==='sprite'&&command.frame===h.manifest.symbols.majorYellow.frame).length,30);
 assert.equal((await h.draw(h.state({round:h.round({model_version:'another-model'})}))).status,'error');
});

test('malformed/cyclic snapshots, invalid dimensions and a painter exception all resolve without an unhandled rejection',async()=>{
 const h=await harness();const round=h.round();round.loop=round;
 for(const call of [()=>h.draw(h.state({round})),()=>h.draw(h.state(),{width:NaN}),()=>h.draw(h.state(),{height:0}),()=>h.draw(h.state(),{frameIndex:.5}),()=>h.draw(h.state(),{selectedStake:'-1.00'})])assert.equal((await call()).status,'error');
 h.painterHook=()=>{throw Error('isolated painter failure');};assert.equal((await h.draw()).status,'error');
});
