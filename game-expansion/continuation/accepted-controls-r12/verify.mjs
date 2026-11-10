import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {restoreAcceptedControls} from './accepted-controls.mjs';
import {installAcceptedControls} from './remaining20-accepted-controls-worker-r12.mjs';
import {installAcceptedControlsLibrary} from './remaining20-accepted-controls-library-r12.mjs';
import {PREFIX,GROUPS,PAGES} from './remaining20-accepted-controls-index-r12.mjs';
import {ASSETS} from './remaining20-accepted-controls-assets-r12.mjs';
const entries=Object.keys(PAGES).filter(page=>page.startsWith('/demo/games/')).map(page=>({page,id:page.split('/').at(-1)}));
let checks=0;
for(const entry of entries){
 const group=PAGES[entry.page],code=ASSETS[group+'/app.mjs'].body;
 const start=code.indexOf('function drawState(state){'),end=code.indexOf('\n if(key!==seenRound){',start);assert.ok(start>=0&&end>start);
 const harness=()=>{
  const ui={stake:{options:['1.00','2.00','40000.00'].map(value=>({value})),value:'1.00'},mines:{options:['1','2','3','5','24'].map(value=>({value})),value:'3'},historyContent:{replaceChildren(){}}};
  const c=vm.createContext({restoreAcceptedControls,pendingCoinPick:null,currentState:null,game:{id:entry.id,version:'current'},ui,costRenders:0,configure(g){c.game=g;},renderCost(){c.costRenders++;}});
  vm.runInContext(code.slice(start,end)+'\n}',c);
  const state={connected:true,authenticated:true,sessionId:'isolated',game:{id:entry.id,version:'current'},round:{game_id:entry.id,model_version:'current',round_id:'accepted',version:1,status:'active',stakeMinor:'200',mines:5}};
  return {c,state,draw:()=>c.drawState(state)};
 };
 for(const [stake,expected]of[['100','1.00'],['200','2.00'],['4000000','40000.00']]){
  const h=harness();h.state.round.stakeMinor=stake;h.draw();assert.equal(h.c.ui.stake.value,expected);assert.equal(h.c.ui.mines.value,entry.id==='coinminer_native'?'5':'3');
  const count=h.c.costRenders;h.draw();assert.equal(h.c.costRenders,count);checks++;
 }
 for(const mutate of [s=>s.connected=false,s=>s.authenticated=false,s=>s.error=true,s=>s.round.game_id='other',s=>s.round.model_version='other',s=>s.round.status='settled',s=>s.round.stakeMinor='1e2',s=>s.round.stakeMinor='200.5',s=>s.round.stakeMinor='300']){
  const h=harness();mutate(h.state);h.draw();assert.equal(h.c.ui.stake.value,'1.00');assert.equal(h.c.ui.mines.value,'3');assert.equal(h.c.costRenders,0);checks++;
 }
}
let forwarded;
const previous={scheduled(){return 'retained';},async fetch(request){const p=new URL(request.url).pathname,group=PAGES[p];return group?new Response('<script src="'+GROUPS[group].old+'app.mjs"></script>',{headers:{'content-type':'text/html','set-cookie':'preserved=1'}}):Response.json({url:request.url,headers:Object.fromEntries(request.headers),body:request.method==='POST'?await request.text():null});}};
const lib=installAcceptedControlsLibrary(previous),worker=installAcceptedControls(previous),env={PORTAL:'player',EXPANSION100:{fetch:r=>{forwarded=r;return lib.fetch(r,{},{});}}};
for(const[path,group]of Object.entries(PAGES)){
 const r=await worker.fetch(new Request('https://player.test'+path),env,{});assert.ok((await r.text()).includes(PREFIX+group+'/app.mjs'));assert.equal(r.headers.get('set-cookie'),'preserved=1');
 const app=await worker.fetch(new Request('https://player.test'+PREFIX+group+'/app.mjs?secret=drop',{headers:{cookie:'private',authorization:'private'}}),env,{});assert.equal(app.status,200);assert.ok((await app.text()).includes('restoreAcceptedControls(state,game,ui)'));assert.equal(forwarded.headers.has('cookie'),false);assert.equal(forwarded.headers.has('authorization'),false);assert.equal(new URL(forwarded.url).search,'');
 const fall=await(await worker.fetch(new Request('https://player.test'+PREFIX+group+'/demo-mode.mjs'),env,{})).json();assert.equal(fall.url,'https://player.test'+GROUPS[group].old+'demo-mode.mjs');checks++;
}
for(const path of ['/','/games/multi_hot_5_video','/games/foxyhot20_native','/games/jetx_native','/games/balloon_native','/games/multihot40_native','/api/remaining20/action']){
 const request=new Request('https://player.test'+path,{method:'POST',body:'unchanged',headers:{authorization:'retained'}}),r=await(await worker.fetch(request,env,{})).json();assert.equal(r.url,request.url);assert.equal(r.body,'unchanged');assert.equal(r.headers.authorization,'retained');checks++;
}
assert.equal(worker.scheduled(),'retained');
console.log(JSON.stringify({checks,games:entries.length,betValues:['1.00','2.00','40000.00'],existingFinancialTransportUntouched:true}));
