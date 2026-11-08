import{createArcadeScene,paintArcadeScene,ReferenceAssetStore}from'./arcade-renderer.mjs';
import{REVIEW_FIXTURES}from'./review-fixtures.mjs';
const $=id=>document.getElementById(id);
const json=async path=>{const response=await fetch(path,{credentials:'omit',redirect:'error'});if(!response.ok)throw new Error('Local review file unavailable');return response.json();};
let selected=null,manifest=null,store=null,generation=0;
const index=await json('./index.json');
for(const[id,entry]of Object.entries(index.games)){
  const button=document.createElement('button');button.textContent=entry.name;button.dataset.game=id;button.addEventListener('click',()=>select(id));$('games').append(button);
}
async function draw(){
  const current=++generation,fixture=REVIEW_FIXTURES[selected][Number($('fixture').value)||0];
  $('fixture-note').textContent=fixture.label;$('status').textContent='Verifying local artwork…';
  try{
    const scene=createArcadeScene(manifest,fixture.snapshot,fixture.options),images=await store.prepare(scene);
    if(current!==generation)return;
    $('scene').width=scene.width;$('scene').height=scene.height;paintArcadeScene($('scene').getContext('2d'),scene,manifest,images);
    $('status').textContent='Static review · '+images.size+' verified image files · no wagers';
    $('controls').replaceChildren(...scene.controls.map(control=>{const button=document.createElement('button');button.disabled=true;button.textContent=control.label;return button;}));
  }catch(error){if(current===generation)$('status').textContent=error.message;}
}
async function select(id){
  const current=++generation;const next=await json('./'+index.games[id].file);if(current!==generation)return;
  store?.dispose();selected=id;manifest=next;store=new ReferenceAssetStore(manifest,{baseURL:new URL('/assets/',location.href).href});
  document.querySelectorAll('[data-game]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.game===id)));
  $('name').textContent=manifest.name;$('fixture').replaceChildren(...REVIEW_FIXTURES[id].map((item,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=item.label;return option;}));
  $('remaining').replaceChildren(...manifest.blockers.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('fixture').value='1';await draw();
}
$('fixture').addEventListener('change',draw);
window.addEventListener('pagehide',()=>store?.dispose());
await select(Object.keys(index.games)[0]);
