import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname,resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as smartsoft from './models/smartsoft-slots.mjs';
import * as remaining from './models/remaining-games.mjs';
import * as multihot40 from './models/multihot40-rules.mjs';
import {isMachineReleased} from './release-policy.mjs';
import {readInventory} from './presentation/build-static-assets.mjs';

const root=dirname(fileURLToPath(import.meta.url));
const prefix='/native-library/expansion/r1/';
const referenceArtPrefix='/native-library/reference-art/r1/';
const referenceGroups=[
 {name:'smartsoft',directory:'presentation',index:'renderer-manifest.json'},
 {name:'remaining-slots',directory:'presentation/remaining-slots',index:'index.json'},
 {name:'arcade',directory:'presentation/arcade',index:'index.json'},
 {name:'legends',directory:'presentation/legends',index:'index.json'}
];
async function configs(module,file){
 const found=module.publicConfigs||module.publicGames||module.smartsoftPublicConfigs||module.remainingPublicConfigs||module.gameConfigs||module.configs;
 return Array.isArray(found)?found:JSON.parse(await readFile(resolve(root,file),'utf8'));
}
const GAMES=[...await configs(smartsoft,'smartsoft-public-configs.json'),...await configs(remaining,'remaining-public-configs.json')]
 .map(game=>game.id===multihot40.ID?multihot40.publicConfig:game)
 .map(game=>({...game,launchable:isMachineReleased(game)}));
const requested=JSON.parse(await readFile(resolve(root,'requested-list.json'),'utf8')).requested;
if(new Set(GAMES.map(game=>game.id)).size!==GAMES.length)throw Error('DUPLICATE_GAME_CONFIG');
if(GAMES.length!==requested.length||requested.some(game=>!GAMES.some(config=>config.id===game.id)))throw Error('REQUESTED_GAME_CONFIG_MISMATCH');
for(const game of GAMES){
 if(!/^[a-z0-9_]+$/.test(game.id)||!game.name||typeof game.launchable!=='boolean')throw Error('INVALID_GAME_CONFIG');
 const definition=multihot40.definitions?.[game.id]||smartsoft.definitions?.[game.id]||remaining.definitions?.[game.id]||remaining.remainingGames?.definitions?.[game.id];
 if(game.launchable&&(!definition||definition.launchable!==true||definition.version!==game.version))throw Error('CONFIG_MODEL_VERSION_MISMATCH:'+game.id);
}
const referenceInventory=await readInventory();
const ASSETS={},referencePresentations={};
const REFERENCE_ART_FILES=Object.fromEntries(Object.entries(referenceInventory.files).map(([path,{sha256,bytes,mime}])=>[path,{sha256,bytes,mime}]));
for(const group of referenceGroups){
 const index=JSON.parse(await readFile(resolve(root,group.directory,group.index),'utf8'));
 if(index.productionLaunchEnabled!==false)throw Error('PRESENTATION_GATE_CHANGED:'+group.name);
 for(const [id,entry]of Object.entries(index.games)){
  if(!/^manifests\/[a-z0-9_]+\.json$/.test(entry.file))throw Error('INVALID_PRESENTATION_PATH');
  const name=group.directory+'/'+entry.file,source=await readFile(resolve(root,name),'utf8'),manifest=JSON.parse(source);
  if(manifest.id!==id||manifest.productionLaunchEnabled!==false)throw Error('PRESENTATION_ID_OR_GATE_CHANGED:'+id);
  ASSETS[name]=source;
  const pinned=referenceInventory.groups[group.name]?.games[id];
  if(!pinned||pinned.manifestSha256!==createHash('sha256').update(source).digest('hex'))throw Error('PRESENTATION_SOURCE_CHANGED:'+id);
  const mapped=group.name!=='remaining-slots'||entry.capabilities?.mappedGameplaySymbols===true;
  if(mapped){
   const game=GAMES.find(game=>game.id===id);if(!game)throw Error('UNREQUESTED_PRESENTATION:'+id);
   if(manifest.modelVersion&&manifest.modelVersion!==game.version)throw Error('PRESENTATION_MODEL_VERSION_MISMATCH:'+id);
   referencePresentations[id]={manifestURL:prefix+name,manifestSha256:createHash('sha256').update(source).digest('hex'),assetBaseURL:referenceArtPrefix+group.name+'/assets/',modelVersion:game.version};
   game.referencePresentation=referencePresentations[id];
  }
 }
}
if(Object.keys(referencePresentations).length!==18)throw Error('REFERENCE_PRESENTATION_COUNT_CHANGED');
for(const name of ['presentation/atlas.mjs','presentation/machine-renderer.mjs','presentation/remaining-slots/renderer.mjs','presentation/arcade/arcade-renderer.mjs','presentation/legends/renderer.mjs','presentation/multihot40-motion.mjs','presentation/multihot40-skeleton.mjs'])ASSETS[name]=await readFile(resolve(root,name),'utf8');
async function collect(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=resolve(directory,entry.name);
  if(entry.isDirectory()){await collect(path);continue;}
  const name=relative(resolve(root,'client'),path).replaceAll('\\','/');
  if(!/\.(?:html|css|js|mjs|svg|json)$/.test(name))continue;
  let text=await readFile(path,'utf8');
  if(name.endsWith('.html'))text=text.replaceAll('href="./','href="'+prefix).replaceAll('src="./','src="'+prefix);
  if(name.endsWith('.mjs'))text=text.replaceAll("'../presentation/","'./presentation/").replaceAll('"../presentation/','"./presentation/');
  ASSETS[name]=text;
 }
}
await collect(resolve(root,'client'));
if(!ASSETS['index.html'])throw Error('CLIENT_INDEX_MISSING');
ASSETS['games.json']=JSON.stringify(GAMES.filter(game=>game.launchable));
const lobby=await readFile(resolve(root,'../games/balloon/lobby.mjs'),'utf8');
ASSETS['lobby.mjs']=lobby;
ASSETS['catalog.mjs']=`import {mergeNativeGames as originalMerge,homeGames,confirmNativeFavourite} from '/native-library/balloon/v1/catalog.mjs';\nexport {homeGames,confirmNativeFavourite};\nexport const RELEASE='zplay-expansion-20261108-r1';\nconst additions=${JSON.stringify(GAMES.filter(game=>game.launchable).map(game=>({id:game.id,title:game.name,art:'/assets/zplay-'+game.id+'.svg',category:['slots','cascade'].includes(game.type)?'Slots':'Arcade',provider:'ZPLAY',nativeMachine:true,nativeId:game.id,launch:'/games/'+game.id,source:'expansion-20261108-r1'})))};\nconst ids=new Set(additions.map(game=>game.id));\nexport function mergeNativeGames(existing,config){const prior=originalMerge(existing,config);return [...additions.filter(game=>{const row=config?.games?.find(item=>item.id===game.id);return row&&row.available!==false&&row.enabled!==false;}).map(game=>({...game,available:true})),...prior.filter(game=>!ids.has(game.id))];}\n`;
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const color=value=>/^#[a-f0-9]{3,8}$/i.test(value||'')?value:'#3aeba0';
function cover(game){
 const accent=color(game.theme?.accent),bg=color(game.theme?.bg),secondary=color(game.theme?.secondary);
 const title=game.name.replace(/([a-z])([A-Z])/g,'$1 $2');
 const words=title.split(' '),lines=[];for(const word of words){if(!lines.length||lines.at(-1).length+word.length>16)lines.push(word);else lines[lines.length-1]+=' '+word;}
 const icon=['mines'].includes(game.type)?'◆':['tower','towerx','tower-rush'].includes(game.type)?'▰':['cascade'].includes(game.type)?'✦':'777';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520"><defs><radialGradient id="bg"><stop stop-color="${secondary}"/><stop offset="1" stop-color="${bg}"/></radialGradient><linearGradient id="gold" x2="0" y2="1"><stop stop-color="#fff5b0"/><stop offset=".5" stop-color="#ffcd46"/><stop offset="1" stop-color="#a35d0a"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="9"/></filter></defs><rect width="400" height="520" fill="url(#bg)"/><path d="M0 420L400 60M-80 420L400-20M0 500L480 60" stroke="${accent}" opacity=".13" stroke-width="36"/><circle cx="200" cy="240" r="124" fill="none" stroke="${accent}" stroke-width="10" filter="url(#glow)"/><circle cx="200" cy="240" r="119" fill="#051321" fill-opacity=".52" stroke="${accent}" stroke-width="2"/><path d="M28 30H372V490H28Z" fill="none" stroke="${accent}" stroke-opacity=".4"/><text x="200" y="65" text-anchor="middle" fill="#fff" opacity=".8" font-family="Arial,sans-serif" font-size="15" letter-spacing="6">ZPLAY</text><text x="200" y="280" text-anchor="middle" fill="url(#gold)" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="${icon==='777'?110:140}">${icon}</text>${lines.map((line,index)=>`<text x="200" y="${395+index*36}" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-weight="800" font-size="29">${esc(line)}</text>`).join('')}<circle cx="55" cy="160" r="4" fill="${accent}"/><circle cx="350" cy="330" r="5" fill="#ffe37c"/></svg>`;
}
for(const game of GAMES)ASSETS['covers/'+game.id+'.svg']=cover(game);
await writeFile(resolve(root,'client-assets.mjs'),'export const GAMES='+JSON.stringify(GAMES)+';\nexport const ASSETS='+JSON.stringify(ASSETS)+';\nexport const REFERENCE_ART_FILES='+JSON.stringify(REFERENCE_ART_FILES)+';\n');
await mkdir(resolve(root,'evidence'),{recursive:true});
const hashes=Object.fromEntries(Object.entries(ASSETS).map(([name,value])=>[name,{bytes:Buffer.byteLength(value),sha256:createHash('sha256').update(value).digest('hex')}]));
await writeFile(resolve(root,'evidence/client-assets.json'),JSON.stringify({games:GAMES.map(({id,name,version,launchable})=>({id,name,version,launchable})),assets:hashes,referencePresentations,referenceBinaryFiles:Object.keys(REFERENCE_ART_FILES).length},null,2)+'\n');
console.log(JSON.stringify({games:GAMES.length,published:GAMES.filter(game=>game.launchable).length,assets:Object.keys(ASSETS).length,referencePresentations:Object.keys(referencePresentations).length,referenceBinaryFiles:Object.keys(REFERENCE_ART_FILES).length}));
