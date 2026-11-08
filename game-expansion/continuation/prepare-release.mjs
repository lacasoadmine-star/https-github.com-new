import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {GAMES as ALL_GAMES,ASSETS as ALL_ASSETS,REFERENCE_ART_FILES as ALL_ART} from './client-assets.mjs';

// Publish only the completed individual machine. Other machines retain their
// source and release state without shipping unfinished clients or artwork.
const root=dirname(fileURLToPath(import.meta.url)),ID='multihot40_native';
const names=['multihot40.html','multihot40.css','multihot40-app.mjs','multihot40-presentation.mjs','session.mjs','autoplay.mjs','spin-hold.mjs','login-return.mjs',
 'presentation/atlas.mjs','presentation/machine-renderer.mjs','presentation/multihot40-motion.mjs','presentation/multihot40-skeleton.mjs',
 'presentation/manifests/multihot40_native.json','games.json','catalog.mjs','lobby.mjs','covers/multihot40_native.svg'];
const ASSETS=Object.fromEntries(names.map(name=>{if(typeof ALL_ASSETS[name]!=='string')throw Error('RELEASE_ASSET_MISSING:'+name);return[name,ALL_ASSETS[name]];}));
ASSETS['lobby.mjs']="import './login-return.mjs';\n"+ASSETS['lobby.mjs'];
try{ASSETS['covers/'+ID+'.svg']=await readFile(resolve(root,'client/covers/'+ID+'.svg'),'utf8');}catch{throw Error('INDIVIDUAL_GAME_COVER_REQUIRED');}
const GAMES=ALL_GAMES.map(game=>game.id===ID?game:{id:game.id,name:game.name,type:game.type,version:game.version,launchable:false});
if(GAMES.some(game=>game.id!==ID&&game.launchable))throw Error('UNREVIEWED_GAME_IN_RELEASE');
ASSETS['games.json']=JSON.stringify(GAMES.filter(game=>game.launchable));
const manifest=JSON.parse(ASSETS['presentation/manifests/'+ID+'.json']);
const REFERENCE_ART_FILES=Object.fromEntries(Object.keys(manifest.files).map(file=>{
 const path='/native-library/reference-art/r1/smartsoft/assets/'+file,record=ALL_ART[path];
 if(!record||record.sha256!==manifest.files[file].sha256)throw Error('RELEASE_ART_MISSING:'+file);return[path,record];
}));
const files={
 'expansion-client-assets-20261108.mjs':'export const GAMES='+JSON.stringify(GAMES)+';\nexport const ASSETS='+JSON.stringify(ASSETS)+';\nexport const REFERENCE_ART_FILES='+JSON.stringify(REFERENCE_ART_FILES)+';\n',
 'expansion-worker-20261108.mjs':(await readFile(resolve(root,'worker.mjs'),'utf8')).replace("'./client-assets.mjs'","'./expansion-client-assets-20261108.mjs'").replace("'../games/balloon/worker.mjs'","'./balloon-worker-20261108.mjs'"),
 'expansion-player-entry-20261108.mjs':"import previous from './expansion100-entry-20261108.mjs';\nimport {installExpansion} from './expansion-worker-20261108.mjs';\nexport {LocalDemoWallet} from './expansion100-entry-20261108.mjs';\nexport default installExpansion(previous);\n"
};
await mkdir(resolve(root,'deployment'),{recursive:true});
for(const[name,source]of Object.entries(files))await writeFile(resolve(root,'deployment',name),source);
const result={release:'zplay-expansion-20261108-r1',previousMainModule:'expansion100-entry-20261108.mjs',mainModule:'expansion-player-entry-20261108.mjs',existingAssets:'keep_assets:true',referenceAssetsBinding:'EXPANSION100',published:GAMES.filter(game=>game.launchable).map(game=>game.id),referenceFiles:Object.keys(REFERENCE_ART_FILES).length,modules:Object.fromEntries(Object.entries(files).map(([name,source])=>[name,{bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex')}]))};
await writeFile(resolve(root,'evidence/player-release-candidate.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
