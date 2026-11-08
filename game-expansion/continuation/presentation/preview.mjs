import {ReferenceAssetStore,createPresentationScene,paintScene} from './machine-renderer.mjs';
const $=id=>document.getElementById(id),select=$('game'),canvas=$('machine');
let store=null,manifest=null,images=null,mode=0,version=0,sound=null;
const sampleGrid=game=>Array.from({length:game.grid.columns},(_,c)=>Array.from({length:game.grid.rows},(_,r)=>Object.keys(game.symbols)[(c*3+r)%Object.keys(game.symbols).length]));
function scene(){return createPresentationScene(manifest,{grid:sampleGrid(manifest),pending:mode===1,balance:null,stake:null,currency:'ETB',canStart:false},{review:true});}
async function paint(){if(!manifest)return;const current=version,list=scene();images=await store.prepare(list);if(current!==version)return;paintScene(canvas.getContext('2d'),list,manifest,images,{width:canvas.width,height:canvas.height});}
async function choose(file){
  const current=++version;$('mode').disabled=true;$('sound').disabled=true;$('status').textContent='Checking artwork hashes and decoding images…';store?.dispose();sound?.pause();
  try{
    const response=await fetch(new URL(file,import.meta.url),{credentials:'omit'});if(!response.ok)throw new Error('Manifest unavailable');const game=await response.json();if(current!==version)return;
    manifest=game;mode=0;store=new ReferenceAssetStore(game);await paint();if(current!==version)return;
    $('status').textContent='Verified artwork loaded · unpublished presentation review';$('mode').disabled=false;$('mode').textContent='Show reel blur';$('sound').disabled=!Object.keys(game.audio).some(key=>/Button\.mp3$/i.test(key));
    const facts=[['Grid',game.grid.columns+' × '+game.grid.rows],['Original symbols',Object.keys(game.symbols).length],['Atlas frames',Object.keys(game.frames).length],['Audio assets',Object.keys(game.audio).length],['Production launch','Closed']];
    $('facts').replaceChildren(...facts.flatMap(([label,value])=>{const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=String(value);return[term,description];}));
  }catch(error){if(current===version)$('status').textContent=error.message;}
}
$('mode').addEventListener('click',async()=>{mode=mode?0:1;$('mode').textContent=mode?'Show resting symbols':'Show reel blur';try{await paint();}catch(error){$('status').textContent=error.message;}});
$('sound').addEventListener('click',async()=>{try{sound?.pause();const key=Object.keys(manifest.audio).find(key=>/Button\.mp3$/i.test(key));sound=await store.playSound(key);}catch(error){$('status').textContent=error.message;}});
select.addEventListener('change',()=>choose(select.value));
window.addEventListener('pagehide',()=>{version++;sound?.pause();store?.dispose();});
try{
  const response=await fetch(new URL('./renderer-manifest.json',import.meta.url),{credentials:'omit'});if(!response.ok)throw new Error('Build the renderer manifest first');const index=await response.json();
  for(const[id,game]of Object.entries(index.games)){const option=document.createElement('option');option.value=game.file;option.textContent=game.name;option.dataset.id=id;select.append(option);}
  const requested=new URL(location.href).searchParams.get('game')||'multihot40_native';const option=[...select.options].find(option=>option.dataset.id===requested);if(option)select.value=option.value;await choose(select.value);
}catch(error){$('status').textContent=error.message;}
