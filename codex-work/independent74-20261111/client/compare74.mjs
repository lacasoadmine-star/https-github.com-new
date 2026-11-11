import {entries} from './official74-data.mjs';
const $=id=>document.getElementById(id),cards=new Map();
let view='both';
function safeUrl(value,hosts){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||!hosts.includes(u.hostname))throw Error('Unrecognized reference URL.');return u.href;}
function setView(next){
  view=['both','official','build'].includes(next)?next:'both';
  $('reference-pane').hidden=view==='build';$('build-pane').hidden=view==='official';
  document.querySelector('.comparison').classList.toggle('single-pane',view!=='both');
  for(const button of document.querySelectorAll('[data-view]'))button.setAttribute('aria-pressed',String(button.dataset.view===view));
}
function show(id){
  const game=entries.find(e=>e.gameId===id);if(!game)return;
  $('selection').value=id;$('title').textContent=game.name;
  const official=safeUrl(game.demoUrl,['eu-server.ssgportal.com']);
  $('official-link').href=official;$('source-link').href=safeUrl(game.officialUrl,['www.smartsoftgaming.com','smartsoftgaming.com']);
  $('official-frame').src=official;
  $('protected').hidden=!game.protected;$('build-frame').hidden=game.protected;
  const build=game.protected?'/':'/independent74/machines74.html?compare=1&game='+encodeURIComponent(game.gameId)+'#'+encodeURIComponent(game.gameId);
  $('build-link').href=build;$('build-frame').src=game.protected?'about:blank':build;
  $('gallery').hidden=true;$('search-label').hidden=true;$('search-count').hidden=true;$('comparison').hidden=false;
  $('gallery-toggle').textContent='74-ka sawir';setView(view);history.replaceState(null,'','#'+game.gameId);
}
function gallery(){
  $('gallery').hidden=false;$('search-label').hidden=false;$('search-count').hidden=false;$('comparison').hidden=true;
  $('official-frame').src='about:blank';$('build-frame').src='about:blank';history.replaceState(null,'',location.pathname);
  $('title').textContent='74 ciyaarood · Isbarbar dhig';$('gallery-toggle').textContent='Isbarbar dhig';
}
for(const game of entries){
  const option=document.createElement('option');option.value=game.gameId;option.textContent=game.number+'. '+game.name;$('selection').append(option);
  const card=document.createElement('button');card.className='card';card.type='button';card.setAttribute('aria-label','Isbarbar dhig '+game.name);
  const img=document.createElement('img');img.src=safeUrl(game.coverUrl,['cdn.prod.website-files.com']);img.alt='';img.loading='lazy';img.width=493;img.height=617;
  const title=document.createElement('strong');title.textContent=game.name;
  const status=document.createElement('small');status.textContent=game.protected?'Ciyaartii hore · la ilaaliyey':game.category;
  card.append(img,title,status);card.addEventListener('click',()=>show(game.gameId));$('gallery').append(card);cards.set(game.gameId,card);
}
$('search').addEventListener('input',()=>{const q=$('search').value.trim().toLocaleLowerCase();let count=0;for(const game of entries){const visible=(game.name+' '+game.category).toLocaleLowerCase().includes(q);cards.get(game.gameId).hidden=!visible;if(visible)count++;}$('search-count').textContent=count+' ciyaarood';});
$('selection').addEventListener('change',()=>show($('selection').value));
$('gallery-toggle').addEventListener('click',()=>{if($('gallery').hidden)gallery();else show($('selection').value);});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>setView(button.dataset.view));
window.addEventListener('hashchange',()=>{if(location.hash)show(location.hash.slice(1));else gallery();});
if(entries.some(e=>e.gameId===location.hash.slice(1)))show(location.hash.slice(1));else gallery();
