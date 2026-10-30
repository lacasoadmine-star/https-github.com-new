
const titles={hot_foxy_20:'Hot Foxy 20',multi_hot_5_video:'Multi Hot 5',multi_hot_40:'Multi Hot 40',burning_ice:'Burning Ice',wild_multi_stars:'Wild Multi Stars'};
const ids=new Set(Object.keys(titles));
export function uniqueGames(list){const seen=new Set();return (Array.isArray(list)?list:[]).filter(game=>game&&ids.has(game.id)&&!seen.has(game.id)&&(seen.add(game.id),true));}
const favouriteKey='superwin.favourites.v2300';
const atlasIndex={cherry:0,orange:1,lemon:2,plum:3,grapes:4,watermelon:5,golden_bell:6,'777':7,clover:8,dollar:9,pot_of_gold:10,pink7:11,big_star:12,coins:13,winged_bell:14,fox:15};
function readFavourites(value){try{const data=JSON.parse(value||'[]');return Array.isArray(data)?[...new Set(data.filter(id=>ids.has(id)))]:[];}catch{return [];}}

function startCollection(){
  if(!document.querySelector('link[href="/slots/css/collection-v2300.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/slots/css/collection-v2300.css';document.head.append(css);}
  let category='All';
  let games=[],filter='all',favourites=[],selected=null,sheetOpener=null,loading=false,scheduled=false,mountFrame=0,suspended=false,atlasReady=false;
  try{favourites=readFavourites(localStorage.getItem(favouriteKey));}catch{}
  const atlas=new Image();
  const gallery=document.createElement('section');gallery.id='sw-v116-games';gallery.dataset.collectionVersion='2302';gallery.setAttribute('aria-label','ZPLAY games');
  gallery.innerHTML='<h1 class="collection-sr-only">ZPLAY games</h1><div class="collection-toolbar"><div class="collection-tabs" aria-label="Game collection"><button type="button" data-filter="all" aria-pressed="true">All Games</button><button type="button" data-filter="favourites" aria-pressed="false">My Games</button></div><label class="collection-search"><span aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></span><input type="search" placeholder="Search games" aria-label="Search games"></label></div><div class="collection-count" role="status" aria-live="polite">Loading games…</div><div class="collection-grid"></div>';
  const sheet=document.createElement('dialog');sheet.id='sw-game-sheet';sheet.className='collection-sheet';sheet.setAttribute('aria-labelledby','sw-sheet-title');sheet.setAttribute('aria-modal','true');
  sheet.innerHTML='<header class="collection-sheet-header"><span class="collection-sheet-handle" aria-hidden="true"></span><h2 id="sw-sheet-title" class="collection-sr-only"></h2><button type="button" class="collection-sheet-close" aria-label="Close game details">×</button></header><div class="collection-sheet-body"><canvas class="collection-sheet-art" aria-hidden="true"></canvas><div class="collection-sheet-actions"><button type="button" class="collection-details-toggle" aria-expanded="false" aria-controls="sw-sheet-details"><span aria-hidden="true">ⓘ</span><span>Game details</span></button><button type="button" class="collection-sheet-favourite" aria-pressed="false"><span class="collection-favourite-icon" aria-hidden="true">☆</span><span class="collection-favourite-text">Favourite</span></button></div><section id="sw-sheet-details" class="collection-details" tabindex="-1" hidden><h3>Game details</h3><dl></dl><p>Open the game menu for the paytable and full rules.</p></section><a class="collection-sheet-play" href="/slots/lobby.html">Play Now</a><p class="collection-sheet-status collection-sr-only" role="status" aria-live="polite"></p></div>';
  const grid=gallery.querySelector('.collection-grid'),status=gallery.querySelector('.collection-count'),search=gallery.querySelector('input');
  const categories=document.createElement('nav');categories.className='zp-categories';categories.setAttribute('aria-label','Game categories');
  for(const name of ['All','Slots','Flight','Plinko','Adventure']){const b=document.createElement('button');b.type='button';b.textContent=name;b.setAttribute('aria-pressed',String(name===category));b.onclick=()=>{category=name;for(const other of categories.children)other.setAttribute('aria-pressed',String(other===b));draw();};categories.append(b);}
  gallery.querySelector('.collection-search').before(categories);
  function broadcast(){window.dispatchEvent(new CustomEvent('zplay:catalog-filter',{detail:{category,query:search.value.trim(),saved:filter==='favourites'}}));}
  const closeButton=sheet.querySelector('.collection-sheet-close'),hero=sheet.querySelector('.collection-sheet-art'),details=sheet.querySelector('.collection-details'),detailsButton=sheet.querySelector('.collection-details-toggle'),favouriteButton=sheet.querySelector('.collection-sheet-favourite'),playLink=sheet.querySelector('.collection-sheet-play');

  function sprite(ctx,symbol,x,y,size,angle=0){
    ctx.save();ctx.translate(x+size/2,y+size/2);ctx.rotate(angle);
    if(atlasReady){const index=atlasIndex[symbol],cw=atlas.naturalWidth/4,ch=atlas.naturalHeight/4;ctx.drawImage(atlas,index%4*cw,Math.floor(index/4)*ch,cw,ch,-size/2,-size/2,size,size);}
    // Keep the named cabinet background and title visible until the atlas is ready.
    ctx.restore();
  }
  function text(ctx,value,x,y,size,{color='#ffe783',stroke='#6a3c0a',font='Georgia,serif',italic=false,width=950}={}){
    ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.font=`${italic?'italic ':''}900 ${size}px ${font}`;ctx.lineJoin='round';ctx.lineWidth=Math.max(2,size*.045);ctx.shadowColor='#000b';ctx.shadowBlur=8;ctx.shadowOffsetY=5;ctx.strokeStyle=stroke;ctx.strokeText(value,x,y,width);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    const fill=ctx.createLinearGradient(0,y-size,0,y+size*.15);fill.addColorStop(0,'#fff6c8');fill.addColorStop(.43,color);fill.addColorStop(.5,'#fff2ad');fill.addColorStop(1,color);ctx.fillStyle=fill;ctx.fillText(value,x,y,width);ctx.restore();
  }
  function titleNumber(ctx,label,number,y){
    let size=118;ctx.font=`900 ${size}px Georgia,serif`;size*=Math.min(1,920/(ctx.measureText(label+' ').width+ctx.measureText(number).width));ctx.font=`900 ${size}px Georgia,serif`;const a=ctx.measureText(label+' ').width,b=ctx.measureText(number).width,total=a+b,start=(1000-total)/2;
    text(ctx,label,start+a/2,y,size,{width:a});text(ctx,number,start+a+b/2,y,size,{color:'#ff5c91',stroke:'#7b123d',width:b});
  }
  function background(ctx,kind){
    const stars=kind==='stars',foxy=kind==='foxy';const fill=ctx.createRadialGradient(510,270,20,500,330,660);fill.addColorStop(0,stars?'#9e36d4':foxy?'#176b54':'#167c38');fill.addColorStop(.55,stars?'#531082':foxy?'#074635':'#03542c');fill.addColorStop(1,stars?'#210537':'#002720');ctx.fillStyle=fill;ctx.fillRect(0,0,1000,690);
    for(let i=0;i<30;i++){const x=(i*233+37)%1050,y=(i*127+19)%740;ctx.save();ctx.translate(x,y);ctx.rotate(i*.7);ctx.globalAlpha=.13;
      if(stars){ctx.fillStyle='#f8dcff';ctx.beginPath();ctx.arc(0,0,2+i%4,0,Math.PI*2);ctx.fill();}
      else if(foxy){ctx.fillStyle=i%2?'#22c7aa':'#2e8f64';ctx.beginPath();ctx.ellipse(0,0,30+i%3*12,90,Math.PI/4,0,Math.PI*2);ctx.fill();}
      else{ctx.fillStyle=i%2?'#36bb68':'#00291d';for(const [cx,cy]of [[-22,-22],[22,-22],[-22,22],[22,22]]){ctx.beginPath();ctx.arc(cx,cy,32,0,Math.PI*2);ctx.fill();}}
      ctx.restore();
    }
    for(let i=0;i<38;i++){const x=(i*181+23)%1000,y=(i*71+83)%690;ctx.fillStyle=stars?'#ffd9ff60':'#ffe89a44';ctx.beginPath();ctx.arc(x,y,1+i%3,0,Math.PI*2);ctx.fill();}
  }
  function cover(canvas,id){
    const ctx=canvas.getContext('2d');if(!ctx)return;canvas.width=1000;canvas.height=690;canvas.dataset.game=id;
    const stars=id==='wild_multi_stars',foxy=id==='hot_foxy_20',ice=id==='burning_ice';background(ctx,stars?'stars':foxy?'foxy':'green');
    if(foxy){
      sprite(ctx,'winged_bell',34,290,245,-.18);sprite(ctx,'pink7',730,225,250,.16);sprite(ctx,'orange',720,442,220,.16);sprite(ctx,'cherry',55,455,205,-.12);
      sprite(ctx,'fox',280,24,440);sprite(ctx,'big_star',175,260,170,-.2);
      text(ctx,'Foxy',450,563,191,{color:'#d9e9a0',stroke:'#063c32',italic:true,width:750});text(ctx,'Hot',785,510,83,{color:'#c4ed49',stroke:'#174c29',italic:true,width:250});text(ctx,'20',795,619,121,{color:'#ff438b',stroke:'#5f123c',italic:true,width:250});
    }else if(stars){
      sprite(ctx,'grapes',810,488,175);sprite(ctx,'watermelon',10,478,190,-.2);sprite(ctx,'golden_bell',65,458,190,-.12);sprite(ctx,'777',150,452,245,-.12);sprite(ctx,'777',660,446,248,.12);sprite(ctx,'big_star',340,353,340);
      text(ctx,'WILD MULTI',500,131,82,{color:'#ffdf47',stroke:'#6c267f',font:'Arial,sans-serif'});text(ctx,'STARS',500,299,190,{color:'#b553e3',stroke:'#f1d4ff',font:'Arial,sans-serif',italic:true});
      for(const [index,value]of ['1×','3×','5×','4×','2×'].entries())text(ctx,value,150+index*175,402+Math.abs(2-index)*13,51,{color:'#f7eaff',stroke:'#562270',font:'Arial,sans-serif',width:125});
    }else if(ice){
      sprite(ctx,'cherry',34,26,230,-.15);sprite(ctx,'clover',706,-24,300,.3);sprite(ctx,'777',348,460,275,.1);sprite(ctx,'watermelon',832,401,220,.5);sprite(ctx,'dollar',-60,447,200,-.25);
      text(ctx,'BURNING ICE',500,368,116,{color:'#ffce56',stroke:'#58380d',width:945});
    }else{
      const superWilds=id==='multi_hot_5_video';titleNumber(ctx,'MULTI HOT',superWilds?'5':'40',148);
      if(superWilds)text(ctx,'5 PAYLINES',500,223,61,{color:'#ff353d',stroke:'#ffe754',font:'Arial,sans-serif'});
      sprite(ctx,'grapes',-8,382,210,-.13);sprite(ctx,'dollar',117,302,204,-.17);sprite(ctx,'watermelon',812,380,207,.2);sprite(ctx,'golden_bell',713,320,230,.12);
      sprite(ctx,'777',212,223,330,-.05);sprite(ctx,'777',379,198,365);sprite(ctx,'777',548,220,332,.06);
      const band=ctx.createLinearGradient(0,510,0,690);band.addColorStop(0,'#002b1400');band.addColorStop(1,'#003a2c');ctx.fillStyle=band;ctx.fillRect(0,510,1000,180);
      for(const [index,value]of ['1×','3×','5×','4×','2×'].entries())text(ctx,value,150+index*175,index===2?652:641,index===2?87:64,{color:index===2?'#ff6392':'#f3d971',stroke:index===2?'#6f1b3d':'#265031',width:130});
    }
  }
  function refreshArt(){for(const canvas of gallery.querySelectorAll('canvas[data-game]'))cover(canvas,canvas.dataset.game);if(selected)cover(hero,selected.id);}
  atlas.onload=()=>{atlasReady=atlas.naturalWidth>0&&atlas.naturalHeight>0;if(atlasReady)refreshArt();};atlas.onerror=()=>{atlasReady=false;};atlas.src='/slots/art/symbol-atlas-v2302.png';

  function updateFavourite(){if(!selected)return;const saved=favourites.includes(selected.id);favouriteButton.setAttribute('aria-pressed',String(saved));favouriteButton.setAttribute('aria-label',(saved?'Remove ':'Add ')+titles[selected.id]+(saved?' from favourites':' to favourites'));sheet.querySelector('.collection-favourite-icon').textContent=saved?'★':'☆';sheet.querySelector('.collection-favourite-text').textContent=saved?'Saved':'Favourite';}
  function openSheet(game,opener){
    selected=game;sheetOpener=opener;sheet.querySelector('#sw-sheet-title').textContent=titles[game.id];playLink.href='/slots/game.html?game='+encodeURIComponent(game.id);playLink.setAttribute('aria-label','Play '+titles[game.id]);
    details.hidden=true;detailsButton.setAttribute('aria-expanded','false');sheet.querySelector('.collection-sheet-status').textContent='';const list=details.querySelector('dl');list.replaceChildren();
    // Display the actual catalogue configuration, including the current server row count.
    for(const [label,value]of [['Reels',game.reels],['Rows',game.rows],['Fixed paylines',game.paylines],['Currency',game.currency]]){if(value===undefined||value===null||value==='')continue;const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=String(value);list.append(term,description);}
    cover(hero,game.id);updateFavourite();if(!sheet.isConnected)document.body.append(sheet);if(!sheet.open)sheet.showModal();document.body.classList.add('sw-collection-sheet-open');sheet.scrollTop=0;closeButton.focus({preventScroll:true});
  }
  function draw(){
    const query=search.value.trim().toLowerCase();const found=games.filter(game=>[titles[game.id],String(game.name||'')].some(name=>name.toLowerCase().includes(query))&&(['All','Slots'].includes(category))&&(filter==='all'||favourites.includes(game.id)));
    broadcast();grid.replaceChildren();status.textContent=found.length?`${found.length} ${found.length===1?'game':'games'}`:filter==='favourites'?'No favourites match. Open a game to save it.':'No games match your search.';
    for(const game of found){const card=document.createElement('article'),button=document.createElement('button'),canvas=document.createElement('canvas');card.className='collection-card';button.type='button';button.className='collection-card-open';button.dataset.game=game.id;button.setAttribute('aria-label','View '+titles[game.id]);button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',sheet.id);canvas.setAttribute('aria-hidden','true');button.append(canvas);button.addEventListener('click',()=>openSheet(game,button));card.append(button);grid.append(card);cover(canvas,game.id);}
  }
  favouriteButton.addEventListener('click',()=>{if(!selected)return;const id=selected.id,saved=!favourites.includes(id);favourites=saved?[...favourites,id]:favourites.filter(value=>value!==id);let persisted=true;try{localStorage.setItem(favouriteKey,JSON.stringify(favourites));}catch{persisted=false;}updateFavourite();draw();sheet.querySelector('.collection-sheet-status').textContent=(saved?'Added to favourites':'Removed from favourites')+(persisted?'.':' for this visit.');});
  detailsButton.addEventListener('click',()=>{details.hidden=!details.hidden;detailsButton.setAttribute('aria-expanded',String(!details.hidden));if(!details.hidden){details.focus({preventScroll:true});details.scrollIntoView({block:'nearest'});}});
  closeButton.addEventListener('click',()=>sheet.close());
  sheet.addEventListener('click',event=>{if(event.target!==sheet)return;const rect=sheet.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)sheet.close();});
  sheet.addEventListener('close',()=>{document.body.classList.remove('sw-collection-sheet-open');const replacement=selected?gallery.querySelector(`.collection-card-open[data-game="${selected.id}"]`):null;const target=sheetOpener?.isConnected?sheetOpener:replacement||search;target?.focus({preventScroll:true});});
  search.addEventListener('input',draw);
  for(const button of gallery.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{filter=button.dataset.filter;for(const item of gallery.querySelectorAll('[data-filter]'))item.setAttribute('aria-pressed',String(item===button));draw();});
  window.addEventListener('storage',event=>{if(event.key===favouriteKey){favourites=readFavourites(event.newValue);draw();updateFavourite();}});

  function mount(){
    if(suspended)return;const main=document.querySelector('.player-main')||document.getElementById('collection-root');if(!main)return;if(main.classList.contains('player-main')&&!main.querySelector('.game-grid,.game-tabs,#sw-internal-games')){gallery.remove();return;}
    if(!gallery.isConnected)main.prepend(gallery);if(!sheet.isConnected)document.body.append(sheet);document.body.classList.add('sw-collection-v2300');
    // Preserve the existing live catalogue and its working routes.

  }
  const observer=new MutationObserver(()=>{if(scheduled||suspended)return;scheduled=true;mountFrame=requestAnimationFrame(()=>{scheduled=false;mount();});});
  observer.observe(document.body,{childList:true,subtree:true});mount();
  async function loadGames(){
    if(loading)return;loading=true;status.textContent='Loading games…';gallery.setAttribute('aria-busy','true');const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{const response=await fetch('/slots/catalog.json',{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('Catalog unavailable');const data=await response.json();if(!Array.isArray(data.games))throw Error('Invalid catalog');games=uniqueGames(data.games);const order=['multi_hot_5_video','hot_foxy_20','wild_multi_stars','multi_hot_40','burning_ice'];games.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));await atlas.decode();atlasReady=true;draw();}
    catch{const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.addEventListener('click',loadGames);status.replaceChildren(document.createTextNode('Games could not load. '),retry);}
    finally{clearTimeout(timeout);loading=false;gallery.setAttribute('aria-busy','false');}
  }
  window.addEventListener('zplay:extra-count',event=>{const n=Number(event.detail)||0;const primary=grid.children.length;const label=(primary+n)?`${primary+n} ${filter==='favourites'?'saved games':'games'}`:filter==='favourites'?'No saved games. Open a game and select Favourite.':'No games match your search.';if(status.textContent!==label)status.textContent=label;});
  loadGames();
  window.addEventListener('pagehide',()=>{suspended=true;observer.disconnect();if(scheduled)cancelAnimationFrame(mountFrame);scheduled=false;});
  window.addEventListener('pageshow',event=>{if(event.persisted){suspended=false;observer.observe(document.body,{childList:true,subtree:true});mount();}});
  return {version:'2302'};
}

// Repeated shell injection must not add duplicate galleries, observers, or requests.
const instanceKey=Symbol.for('superwin.collection.v2302');
if(!window[instanceKey])window[instanceKey]=startCollection();
