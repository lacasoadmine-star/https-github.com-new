import {entries} from './official74-data.mjs';
const $=id=>document.getElementById(id);
function show(id){
 const game=entries.find(e=>e.gameId===id);if(!game)return;
 $('selection').value=id;$('title').textContent=game.name;
 const official=new URL(game.demoUrl);
 if(official.protocol!=='https:'||official.hostname!=='eu-server.ssgportal.com')throw Error('Unknown official demo host.');
 $('official-link').href=official.href;$('source-link').href=game.officialUrl;
 $('official-frame').src=official.href;
 $('protected').hidden=!game.protected;$('build-frame').hidden=game.protected;
 const build=game.protected?'/':'/independent74/official74.html?compare=1#'+game.gameId;
 $('build-link').href=build;
 $('build-frame').src=game.protected?'about:blank':build;
 $('gallery').hidden=true;$('comparison').hidden=false;
 $('gallery-toggle').textContent='74-ka sawir';
 history.replaceState(null,'','#'+game.gameId);
}
for(const game of entries){
 const option=document.createElement('option');option.value=game.gameId;option.textContent=game.number+'. '+game.name;$('selection').append(option);
 const card=document.createElement('button');card.className='card';card.type='button';
 const img=document.createElement('img');img.src=game.coverUrl;img.alt=game.name;img.loading='lazy';img.width=493;img.height=617;
 const title=document.createElement('strong');title.textContent=game.name;
 const status=document.createElement('small');status.textContent=game.protected?'Ciyaartii hore · la ilaaliyey':game.category;
 card.append(img,title,status);card.onclick=()=>show(game.gameId);$('gallery').append(card);
}
$('selection').onchange=()=>show($('selection').value);
$('gallery-toggle').onclick=()=>{const open=$('gallery').hidden;$('gallery').hidden=!open;$('comparison').hidden=open;if(open){$('official-frame').src='about:blank';$('build-frame').src='about:blank';history.replaceState(null,'',location.pathname);$('title').textContent='SmartSoft Gaming · 74';}else show($('selection').value);};
if(entries.some(e=>e.gameId===location.hash.slice(1)))show(location.hash.slice(1));
