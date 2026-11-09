import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {deployed} from '../new-bet-followup/load-deployed-models.mjs';
import {ASSETS as r5Assets} from '../ice-controls-r5/remaining20-ice-controls-assets-r5.mjs';
import {RETAINED_ASSETS} from '../ice-controls-r5/load-retained-assets.mjs';

const ROOT='/workspace/scratch/14a9686e6662/remaining20-r5-seven-review1/public/presentation/';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidate=await fs.readFile(new URL('./presentation/smartsoft-native-presentation.mjs',import.meta.url),'utf8');
const r5=r5Assets['presentation/smartsoft-native-presentation.mjs'].body;
assert.equal(sha(r5),r5Assets['presentation/smartsoft-native-presentation.mjs'].sha256);
const view=new URL('../ice-controls-r5/client/presentation/smartsoft-remaining7-view.mjs',import.meta.url).href;
async function nativeModule(body,version){
 const source=body.replace(/from\s+(['"])(\.\/[^'"]+)\1/g,(_,quote,relative)=>'from '+quote+(relative==='./smartsoft-remaining7-view.mjs'&&version!=='r4'?view:new URL(relative,pathToFileURL(ROOT)).href)+quote);
 return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
const variants={
 r4:await nativeModule(RETAINED_ASSETS['presentation/smartsoft-native-presentation.mjs'].body,'r4'),
 r5:await nativeModule(r5,'r5'),
 fixed:await nativeModule(candidate,'fixed'),
};
const {createPresentationScene,paintScene}=await import(pathToFileURL(ROOT+'machine-renderer.mjs'));
const manifest=JSON.parse(r5Assets['presentation/manifests/burningice40_native.json'].body);
const seed='1d5f9f2c1ade62f8249859a792f358d6c0de9f01f48f66c0fc55c5dbfff7aeaa',roundId='76bcf1d5-59a9-49ea-805e-231ad003fe63';
const original=deployed.auditModels.evaluateDraftRound(manifest.id,{stakeMinor:'200',autoCollect:true},deployed.seededRandom(seed,roundId+':0'),1794240000000).state;
assert.equal(original.payoutMinor,'3200');assert.deepEqual(JSON.parse(JSON.stringify(original.feature.frozenReels)),[0,1,2,3,4]);
assert.equal(original.frames[0].payoutMinor,'1400');assert.equal(original.frames[1].payoutMinor,'1800');
const originalReceipt=JSON.stringify(original),evidence=[];
function sceneFor(index,{pending=false}={}){
 const visible=index===null?original:original.frames[index];
 return createPresentationScene(manifest,{round:{...original,round_id:roundId,game_id:manifest.id,grid:visible.grid,feature:visible.feature,wins:visible.wins},grid:visible.grid,wins:visible.wins,feature:visible.feature,finalFrame:index===null||index===original.frames.length-1,frameWinMinor:visible.payoutMinor,pending,stake:'2.00',currency:'CREDITS',authenticated:true,confirmed:true,balance:'100008.00'},{interactive:true});
}
const symbolCommands=Object.values(manifest.symbols).flatMap(symbol=>[symbol.frame,symbol.blurFrame].filter(frame=>manifest.frames[frame]).map(frame=>({type:'sprite',frame})));
for(const[version,api]of Object.entries(variants))for(const[index,pending]of [[0,true],[1,true],[1,false],[null,false]]){
 const scene=sceneFor(index,{pending});
 // This focused offline test uses the actual store.prepare method, then the
 // actual moving scene and painter. Only image decoding/native art are replaced
 // with labeled sentinels; no model, receipt, command or prepare path is mocked.
 const store=new api.SmartSoftAssetStore(manifest,{baseURL:'https://offline.invalid/'});
 const loaded=[];store.loadImage=async file=>{assert(manifest.files[file]);loaded.push(file);return {file,width:4096,height:4096};};
 store.prepareNative=async()=>store.art;
 const images=await store.prepare({...scene,commands:[...scene.commands,...symbolCommands,...(scene.additionalAssetFrames||[]).map(frame=>({type:'sprite',frame}))]});
 const drawn=api.smartSoftMovingScene(scene,manifest,null,{images});
 const missing=[...new Set(drawn.commands.filter(c=>c.type==='sprite'&&!images.has(manifest.frames[c.frame].file)).map(c=>manifest.frames[c.frame].file))];
 let failure=null,calls=0;
 const context=new Proxy({globalAlpha:1,drawImage(image){assert(image,'Canvas drawImage received an absent prepared image');calls++;}}, {get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});
 try{paintScene(context,drawn,manifest,images);}catch(error){failure=error.message;}
 const expectedFailure=version==='r5'&&!pending&&index!==0;
 if(expectedFailure){assert.deepEqual(missing,['8c906c071e74d03a8fcab779a593ca06700eade6d42dec500dd8471eda9ab0b2.png']);assert.match(failure,/absent prepared image/);}
 else{assert.deepEqual(missing,[]);assert.equal(failure,null);assert(calls>0);}
 if(version==='fixed')assert(images.has(manifest.frames[manifest.board.frame].file));
 evidence.push({version,frame:index,pending,expectedFailure,missingImageFiles:missing,paintSucceeded:failure===null,drawCalls:calls,loadedPages:new Set(loaded).size});
 store.dispose();assert.equal(JSON.stringify(original),originalReceipt);
}
// The only production change is an extra prepared frame for the two existing
// terminal-thaw titles. No render, model, financial or route behavior changes.
const oldLine="const dynamic=Object.keys(this.manifest.frames).filter(frame=>/^(Box\\/Line\\/|Lines\\/)|LogoIce/.test(frame)).map(frame=>({type:'sprite',frame}));";
const replacement="const thawFrame=['burningice10_native','burningice40_native'].includes(this.manifest.id)?this.manifest.board?.frame:null;\n  // A terminal all-frozen receipt initially prepares only active column pages.\n  // The draw-only thaw switches to the normal page; Ice40 stores that in a\n  // separate image, so include it even when no normal column is in the scene.\n  const dynamic=Object.keys(this.manifest.frames).filter(frame=>frame===thawFrame||/^(Box\\/Line\\/|Lines\\/)|LogoIce/.test(frame)).map(frame=>({type:'sprite',frame}));";
assert.equal(candidate,r5.replace(oldLine,replacement));
const report={passed:true,scope:'Offline reproduction of real revealed CREDITS receipt; actual prepare/render/painter code with image-decode sentinels. No browser or network claim.',realWalletActions:0,networkCalls:0,modelChanged:false,receiptChanged:false,r4Unaffected:true,r5RegressionReproduced:true,fixed:true,sourceSha256:sha(r5),candidateSha256:sha(candidate),fixture:{gameId:manifest.id,roundId,stakeMinor:'200',payoutMinor:'3200',frames:2,terminalFrozenColumns:[0,1,2,3,4],receiptSha256:sha(originalReceipt)},evidence};
await fs.writeFile(new URL('./verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:evidence.length,r5RegressionReproduced:true,fixed:true,candidateSha256:report.candidateSha256}));
