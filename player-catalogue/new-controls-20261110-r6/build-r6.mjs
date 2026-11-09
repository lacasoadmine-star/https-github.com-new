import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ASSETS as ice} from '../ice-controls-r5/remaining20-ice-controls-assets-r5.mjs';
import {OVERLAY as first} from '/workspace/scratch/14a9686e6662/remaining20-r4-review4/library/remaining20-review4-assets.mjs';
import {OVERLAY as seven} from '/workspace/scratch/14a9686e6662/remaining20-r5-seven-client/library/remaining20-r5-seven-assets.mjs';
import {patchAutoplayControlAudio} from '../new-ui-followup/patch-autoplay-audio.mjs';
import {games} from '../new-bet-followup/catalog.mjs';
import {NEW_GAME_IDS} from '../new-zoom-followup/new-game-zoom-policy-r1.mjs';
import assert from 'node:assert/strict';

const root=new URL('./',import.meta.url),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const PREFIX='/native-library/remaining20/20261110-new-controls-r6/',LIBRARY_PREFIX='/v2/remaining20/client/new-controls-r6/';
const FAMILIES=[
 {key:'ice',ids:['burningice10_native','burningice40_native'],previous:'/native-library/remaining20/20261110-ice-controls-r5/'},
 {key:'habesha',ids:['habeshafortune5_native'],previous:'/native-library/remaining20/20261109-r4-review4/'},
 {key:'modern',ids:['multihotwildways_native','multihot5wild_native'],previous:'/native-library/remaining20/20261109-r5-seven-review1/'},
 {key:'deluxe',ids:['multihotdeluxe_native'],previous:'/native-library/remaining20/20261109-deluxe-strip-r1/'},
].map(family=>({...family,paths:family.ids.map(id=>'/demo/games/'+id)}));
const LEGACY_PATHS=['burningice_native','burningice10_native','burningice40_native'].map(id=>'/demo/games/'+id);
assert.deepEqual([...NEW_GAME_IDS].sort(),games.map(g=>g.id).sort());
assert.equal(sha(first['app.mjs'].body),'de374492a238001411dc5f5ea54fb6ed809706e8ca91fe6816521e798c36ed9c');
assert.equal(sha(seven['app.mjs'].body),'241f9eeb65215eefe6f83b84916d1ed765c71a42d1248ad4332160974215170b');
assert.equal(sha(ice['presentation/smartsoft-native-presentation.mjs'].body),'c31be60a9563d0c0a4ba7868f1b710044ccbffd6bf436ae819ea7c5c04640bf1');
const audio=await fs.readFile(new URL('../new-ui-followup/client/autoplay-control-audio.mjs',root),'utf8');
const css=await fs.readFile(new URL('../new-ui-followup/legacy-auto-currency-r2.css',root),'utf8');
const startupCss=await fs.readFile(new URL('../startup-followup/ice-startup-layout.css',root),'utf8');
assert.equal(sha(audio),'e9d6da1167f3d41ac0c3ef85585216e2b186a841f36878f85ab64c90277458a1');
assert.equal(sha(css),'a9c902142625dbe463fc0b8990e59c0a6bf706d74dc77ce193fadf4dfb13b983');
assert.equal(sha(startupCss),'82b4fac0406c838d45582d3e321d193202236e3322360e355d5fcb1804e79f50');
const fixed=await fs.readFile(new URL('../ice-artwork-followup/presentation/smartsoft-native-presentation.mjs',root),'utf8');
assert.equal(sha(fixed),'026fbba3dfe9b99f352f89d3d4e01d9e457d5d845c1720f6ef05840c9c6f2994');
const before="const dynamic=Object.keys(this.manifest.frames).filter(frame=>/^(Box\\/Line\\/|Lines\\/)|LogoIce/.test(frame)).map(frame=>({type:'sprite',frame}));";
const after="const thawFrame=['burningice10_native','burningice40_native'].includes(this.manifest.id)?this.manifest.board?.frame:null;\n  // A terminal all-frozen receipt initially prepares only active column pages.\n  // The draw-only thaw switches to the normal page; Ice40 stores that in a\n  // separate image, so include it even when no normal column is in the scene.\n  const dynamic=Object.keys(this.manifest.frames).filter(frame=>frame===thawFrame||/^(Box\\/Line\\/|Lines\\/)|LogoIce/.test(frame)).map(frame=>({type:'sprite',frame}));";
function currentCatalog(source,prior){
 const needle="gameFetch('"+prior+"games.json'";
 if(source.split(needle).length!==2)throw Error('CURRENT_APP_CATALOG_ANCHOR_CHANGED');
 return source.replace(needle,"gameFetch(new URL('./games.json',import.meta.url).href");
}
function composeAssets(ice,first,seven,settings,patchAudio,currentCatalog){
 const {before,after,audio,css,startupCss,records}=settings;
 const prior=ice['presentation/smartsoft-native-presentation.mjs'].body;
 if(prior.split(before).length!==2)throw Error('CURRENT_ICE_PREPARE_ANCHOR_CHANGED');
 const changedIce=prior.replace(before,after);
 const firstApp=currentCatalog(patchAudio(first['app.mjs'].body),'/native-library/remaining20/20261109-r4/');
 const modernApp=currentCatalog(patchAudio(seven['app.mjs'].body),'/native-library/remaining20/20261109-r5-seven/');
 const iceRecord={...records['ice/presentation/smartsoft-native-presentation.mjs'],body:changedIce};
 const firstRecord={...records['habesha/app.mjs'],body:firstApp},modernRecord={...records['modern/app.mjs'],body:modernApp};
 const helper={...records['habesha/autoplay-control-audio.mjs'],body:audio};
 return {'ice/presentation/smartsoft-native-presentation.mjs':iceRecord,
  'habesha/app.mjs':firstRecord,'modern/app.mjs':modernRecord,'deluxe/app.mjs':modernRecord,
  'habesha/autoplay-control-audio.mjs':helper,'modern/autoplay-control-audio.mjs':helper,'deluxe/autoplay-control-audio.mjs':helper,
  'shared/legacy-auto-currency.css':{...records['shared/legacy-auto-currency.css'],body:css},
  'shared/ice-startup-layout.css':{...records['shared/ice-startup-layout.css'],body:startupCss}};
}
const metadata=(body,type)=>({type,bytes:Buffer.byteLength(body),sha256:sha(body),encoding:'utf8'});
const bodies={
 'ice/presentation/smartsoft-native-presentation.mjs':fixed,
 'habesha/app.mjs':currentCatalog(patchAutoplayControlAudio(first['app.mjs'].body),'/native-library/remaining20/20261109-r4/'),
 'modern/app.mjs':currentCatalog(patchAutoplayControlAudio(seven['app.mjs'].body),'/native-library/remaining20/20261109-r5-seven/'),
 'deluxe/app.mjs':currentCatalog(patchAutoplayControlAudio(seven['app.mjs'].body),'/native-library/remaining20/20261109-r5-seven/'),
 'habesha/autoplay-control-audio.mjs':audio,'modern/autoplay-control-audio.mjs':audio,'deluxe/autoplay-control-audio.mjs':audio,
 'shared/legacy-auto-currency.css':css,
 'shared/ice-startup-layout.css':startupCss,
};
const records=Object.fromEntries(Object.entries(bodies).map(([name,body])=>[name,metadata(body,name.endsWith('.css')?'text/css; charset=utf-8':'application/javascript; charset=utf-8')]));
const settings={before,after,audio,css,startupCss,records},actual=composeAssets(ice,first,seven,settings,patchAutoplayControlAudio,currentCatalog);
for(const[name,body]of Object.entries(bodies))assert.deepEqual(actual[name],{...records[name],body});
const moduleText="import {ASSETS as ice} from './remaining20-ice-controls-assets-r5.mjs';\nimport {OVERLAY as first} from './remaining20-review4-assets.mjs';\nimport {OVERLAY as seven} from './remaining20-r5-seven-assets.mjs';\nconst patchAudio="+patchAutoplayControlAudio.toString()+";\nconst currentCatalog="+currentCatalog.toString()+";\nconst composeAssets="+composeAssets.toString()+";\nexport const ASSETS=composeAssets(ice,first,seven,"+JSON.stringify(settings)+",patchAudio,currentCatalog);\n";
await fs.writeFile(new URL('remaining20-new-controls-assets-r6.mjs',root),moduleText);
await fs.writeFile(new URL('remaining20-new-controls-index-r6.mjs',root),'export const PREFIX='+JSON.stringify(PREFIX)+';\nexport const LIBRARY_PREFIX='+JSON.stringify(LIBRARY_PREFIX)+';\nexport const FAMILIES='+JSON.stringify(FAMILIES)+';\nexport const LEGACY_PATHS='+JSON.stringify(LEGACY_PATHS)+';\nexport const ASSET_NAMES='+JSON.stringify(Object.keys(actual))+';\n');
for(const[name,body]of Object.entries(bodies)){
 const output=new URL('client/'+name,root);await fs.mkdir(new URL('.',output),{recursive:true});await fs.writeFile(output,body);
}
const zoomNames=['new-game-zoom-policy-r1.mjs','new-game-zoom-assets-r1.mjs','new-game-zoom-worker-r1.mjs'];
const zoomHashes=['d70d163dde12c229f8cd63d1ba5e1639717688b5f308af74051ea4cf59e77bcf','88cb07807be7cda62a40ab15950d2e889374db6a3bbcd1270f7b3d5f1e066043','15db6544822baadc6272cc12b31345f25015d2ed4bb7c483ea3de438a7d5fab0'];
for(let i=0;i<zoomNames.length;i++){const bytes=await fs.readFile(new URL('../new-zoom-followup/'+zoomNames[i],root));assert.equal(sha(bytes),zoomHashes[i]);await fs.writeFile(new URL(zoomNames[i],root),bytes);}
const startupModule='ice-startup-layout-r1.mjs',startupBytes=await fs.readFile(new URL('../startup-followup/'+startupModule,root));
assert.equal(sha(startupBytes),'7fe9fafad3f76320dc7fe3f88554584b0bc60cb14312433f1d322b58c5ff4b4b');await fs.writeFile(new URL(startupModule,root),startupBytes);
const dependencies=[
 '../ice-controls-r5/remaining20-ice-controls-assets-r5.mjs',
 '../controls-recovered/remaining20-ice-controls-assets-r4.mjs',
 '/workspace/scratch/14a9686e6662/remaining20-r4-review4/library/remaining20-review4-assets.mjs',
 '/workspace/scratch/14a9686e6662/remaining20-r5-seven-client/library/remaining20-r5-seven-assets.mjs',
];
const localOnly=[];
for(const source of dependencies){const from=source.startsWith('/')?pathToFileURL(source):new URL(source,root),name=from.pathname.split('/').at(-1),bytes=await fs.readFile(from);await fs.writeFile(new URL(name,root),bytes);localOnly.push({name,sha256:sha(bytes),bytes:bytes.length});}
const requiredPlayerModules=[];
for(const name of ['remaining20-ice-controls-player-entry-r5.mjs','remaining20-ice-controls-worker-r5.mjs','remaining20-ice-controls-index-r5.mjs']){
 const bytes=await fs.readFile(new URL('../ice-controls-r5/'+name,root));await fs.writeFile(new URL(name,root),bytes);requiredPlayerModules.push({name,file:fileURLToPath(new URL(name,root)),bytes:bytes.length,sha256:sha(bytes)});
}
const names={player:['remaining20-new-controls-player-entry-r6.mjs','remaining20-new-controls-worker-r6.mjs','remaining20-new-controls-index-r6.mjs',...zoomNames,startupModule],library:['remaining20-new-controls-library-entry-r6.mjs','remaining20-new-controls-library-r6.mjs','remaining20-new-controls-assets-r6.mjs']};
const modules={};
for(const[worker,list]of Object.entries(names))modules[worker]=await Promise.all(list.map(async name=>{const bytes=await fs.readFile(new URL(name,root));return{name,file:fileURLToPath(new URL(name,root)),bytes:bytes.length,sha256:sha(bytes),content_type:'application/javascript+module'};}));
const manifest={schemaVersion:1,prefix:PREFIX,libraryPrefix:LIBRARY_PREFIX,scope:NEW_GAME_IDS,families:FAMILIES,legacyCssPaths:LEGACY_PATHS,assets:records,modules,requiredPlayerModules,localOnlyRetainedCopies:localOnly,
 entry:{player:names.player[0],library:names.library[0]},financialChanges:false,cashGateChanges:false,modelChanges:false,newBindings:[],newSecrets:[],
 changes:['Prepare normal Ice column image before terminal thaw, including all-frozen restored receipts','Keep validated r5 pair menu, collect audio and terminal thaw','Prevent multi-touch page zoom on exactly ten catalogue-r3 demo routes','Fit legacy AUTO CREDITS currency text','Original idle AUTO-open and explicit AUTO-stop audio on four supported modern titles','Align existing pair startup cover beneath Player header and CREDITS banner'],
 releaseNotes:['Player346 currently active; add the three exact required r5 Player modules before importing its r5 entry','Library26 already retains the exact r5 and earlier asset module dependencies','Existing immutable client prefixes are never overwritten','Catalog URL in changed apps resolves from import.meta.url; its response and manifests delegate to the matching retained family','Deluxe keeps its dedicated initial-grid overlay; MultiHot5 and FoxyHot20 excluded'],preparedOnly:true};
await fs.writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({assets:Object.keys(actual).length,playerBytes:modules.player.reduce((sum,item)=>sum+item.bytes,0),libraryBytes:modules.library.reduce((sum,item)=>sum+item.bytes,0),requiredPlayerModules:requiredPlayerModules.length,preparedOnly:true}));

function pathToFileURL(path){return new URL('file://'+path);}
