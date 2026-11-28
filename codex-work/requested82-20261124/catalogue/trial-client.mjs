import {TRIAL_GRID,TRIAL_SHEET_ID,TRIAL_LOADER_ID,validTrialManifest,renderTrialCard,renderTrialSheet} from './trial-public.mjs';
const STATE=Symbol.for('zplay.requested82.first-pair.v1'),PREFERENCES='zplay.requested82.first-pair.preferences.v1';

export function installFirstPair(manifest,{doc=document,win=window,storage=null}={}){
  if(!validTrialManifest(manifest))throw Error('FIRST_PAIR_MANIFEST_INVALID');
  if(win[STATE])return win[STATE];
  let disposed=false,queued=false,sheet=null,selected=null,opener=null,newGroup=null,newGrid=null;
  try{storage??=win.localStorage;}catch{}
  let preferences={};try{const saved=JSON.parse(storage?.getItem(PREFERENCES)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))preferences=saved;}catch{}
  const byId=new Map(manifest.games.map(game=>[game.gameId,game])),nodes=new Map(),admittedGrids=new WeakSet();
  const preference=id=>({liked:preferences[id]?.liked===true,favorite:preferences[id]?.favorite===true});
  function save(){try{storage?.setItem(PREFERENCES,JSON.stringify(Object.fromEntries(manifest.games.map(game=>[game.gameId,preference(game.gameId)]))));}catch{}}
  function close(){if(sheet?.open)sheet.close();}
  function onClose(){const prior=opener;selected=null;opener=null;const next=prior?.isConnected&&prior.getClientRects().length?prior:doc.querySelector('#zplay-live-catalog [data-catalog-filter][aria-pressed="true"]');next?.focus({preventScroll:true});}
  function show(game,button){
    if(!sheet){sheet=doc.createElement('dialog');sheet.id=TRIAL_SHEET_ID;sheet.className='restored-game-sheet requested82-pair-sheet';sheet.dataset.catalogRelease=doc.getElementById('zplay-live-catalog')?.dataset.catalogRelease||'zplay-player-20261119-play-now-r1';sheet.setAttribute('aria-labelledby','requested82-pair-title');sheet.addEventListener('close',onClose);doc.body.append(sheet);}
    selected=game;opener=button;sheet.innerHTML=renderTrialSheet(game,preference(game.gameId));if(!sheet.open)sheet.showModal();
    sheet.querySelector('[data-r82-pair-close]')?.focus();
  }
  function updatePreferences(){
    if(!selected||!sheet)return;const state=preference(selected.gameId);
    for(const [selector,key,on,off]of [['[data-r82-pair-like]','liked','♥','♡'],['[data-r82-pair-favorite]','favorite','★','☆']]){
      const button=sheet.querySelector(selector);button.setAttribute('aria-pressed',String(state[key]));button.firstElementChild.textContent=state[key]?on:off;
      if(key==='favorite'){button.lastElementChild.textContent=state.favorite?'La kaydiyey':'Kaydi';button.setAttribute('aria-label',(state.favorite?'Ka saar kuwa la kaydiyey':'Ku dar kuwa la kaydiyey')+' · '+selected.name);}
    }
  }
  const superseded=new Map([
    ['ind74_official_multihot100','zplay72_multi_hot_100_v1'],
    ['ind74_official_multihot20','zplay72_multi_hot_20_v1']
  ]);
  function filter(grid){
    const container=grid.closest('#zplay-live-catalog'),query=container.querySelector('.restored-catalog-search input')?.value.trim().toLowerCase().replace(/[^a-z0-9]/g,'')||'';
    const kind=container.querySelector('[data-catalog-filter][aria-pressed="true"]')?.dataset.catalogFilter||'all';
    for(const card of container.querySelectorAll('[data-catalog-game]')){
      const id=superseded.get(card.dataset.catalogGame);
      if(!id)continue;
      if((kind==='favorites'||card.querySelector('.restored-game-saved'))&&!Object.hasOwn(preferences,id)){
        preferences[id]={favorite:true,liked:false};save();
      }
      card.remove();
    }
    for(const section of container.querySelectorAll('[data-catalog-group]')){
      const remaining=section.querySelectorAll('[data-catalog-game]').length;
      section.hidden=remaining===0;
      const heading=section.querySelector('h2');
      if(heading){const title=heading.textContent.replace(/· \d+$/,'· '+remaining);if(heading.textContent!==title)heading.textContent=title;}
    }
    for(const game of manifest.games){const node=nodes.get(game.gameId);if(!node)continue;const match=game.name.toLowerCase().replace(/[^a-z0-9]/g,'').includes(query);
      node.hidden=!match||kind==='preparing'||kind==='favorites'&&!preference(game.gameId).favorite;
    }
    const trialVisible=[...nodes.values()].filter(node=>!node.hidden&&node.parentElement===newGrid).length;
    const visible=container.querySelectorAll('[data-catalog-game]').length+trialVisible;
    if(newGroup)newGroup.hidden=trialVisible===0;
    const empty=container.querySelector('[data-catalog-empty]');if(empty)empty.hidden=visible!==0;
    const count=container.querySelector('[data-catalog-count]');
    if(count){
      const total=count.textContent.match(/(?:^|\/ )(\d+) ciyaarood/)?.[1];
      if(total){const text=(query||kind!=='all'?visible+' / ':'')+total+' ciyaarood';if(count.textContent!==text)count.textContent=text;}
    }
  }
  function mount(){
    queued=false;if(disposed)return;
    if(win.location.pathname!=='/'){newGroup?.remove();for(const node of nodes.values())node.remove();close();return;}
    const grid=doc.querySelector(TRIAL_GRID),anchor=grid?.querySelector('[data-catalog-game="ind74_official_multihot5"]');
    if(!grid)return;
    if(anchor&&grid.querySelector('[data-catalog-game="ind74_official_foxyhot20"]'))admittedGrids.add(grid);
    if(!admittedGrids.has(grid))return;
    const originalGroup=grid.closest('.restored-catalog-group');
    if(!newGroup?.isConnected){newGroup=doc.createElement('section');newGroup.className='restored-catalog-group';newGroup.dataset.r82NewGroup='true';const title=doc.createElement('h2');title.className='restored-catalog-group-title';title.textContent='Ciyaaraha cusub';newGrid=doc.createElement('div');newGrid.className='restored-catalog-grid';newGrid.dataset.r82NewGrid='true';newGroup.append(title,newGrid);}
    if(originalGroup.previousElementSibling!==newGroup)originalGroup.before(newGroup);
    let cursor=null;
    for(const game of manifest.games){let node=nodes.get(game.gameId);
      if(!node){const template=doc.createElement('template');template.innerHTML=renderTrialCard(game);node=template.content.firstElementChild;nodes.set(game.gameId,node);}
      if(cursor){if(node.parentElement!==newGrid||node.previousElementSibling!==cursor)cursor.after(node);}
      else if(node.parentElement!==newGrid||node.previousElementSibling!==null)newGrid.prepend(node);cursor=node;
    }
    filter(grid);
  }
  function schedule(){if(!queued&&!disposed){queued=true;queueMicrotask(mount);}}
  function onClick(event){
    const details=event.target.closest?.('[data-r82-pair-details]');
    if(details){const game=byId.get(details.dataset.r82PairDetails);if(game){event.preventDefault();show(game,details);}return;}
    if(event.target.closest?.('[data-r82-pair-close]')){event.preventDefault();close();return;}
    if(selected&&event.target.closest?.('[data-r82-pair-like],[data-r82-pair-favorite]')){
      const key=event.target.closest('[data-r82-pair-like]')?'liked':'favorite';preferences[selected.gameId]={...preference(selected.gameId),[key]:!preference(selected.gameId)[key]};
      save();updatePreferences();schedule();return;
    }
    if(event.target===sheet&&sheet.open){const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();}
    if(event.target.closest?.('[data-catalog-filter]'))schedule();
  }
  function onInput(event){if(event.target.matches?.('#zplay-live-catalog .restored-catalog-search input'))schedule();}
  // The replaced request-only catalogue has no live games removed; its routes remain delegated.
  for(const key of ['zplay.new90.lobby.v1','zplay.new71.lobby.v1'])win[Symbol.for(key)]?.dispose?.();
  for(const selector of ['#zplay-requested90','#zplay-requested71'])doc.querySelector(selector)?.remove();
  const observer=new win.MutationObserver(schedule);observer.observe(doc.documentElement,{childList:true,subtree:true});
  doc.addEventListener('click',onClick);doc.addEventListener('input',onInput);win.addEventListener('popstate',schedule);win.addEventListener('hashchange',schedule);
  const api=Object.freeze({mount,dispose(){if(disposed)return;disposed=true;observer.disconnect();doc.removeEventListener('click',onClick);doc.removeEventListener('input',onInput);win.removeEventListener('popstate',schedule);win.removeEventListener('hashchange',schedule);close();sheet?.remove();newGroup?.remove();for(const node of nodes.values())node.remove();doc.querySelector('[data-r82-pair-count]')?.remove();if(win[STATE]===api)delete win[STATE];}});
  win[STATE]=api;mount();return api;
}

export async function bootFirstPair(){
  if(window[STATE])return window[STATE];const loader=document.getElementById(TRIAL_LOADER_ID),path=loader?.dataset.manifestUrl;
  if(!/^\/_zplay\/requested82-pair\/[a-f0-9]{64}\/manifest\.[a-f0-9]{64}\.json$/.test(path||''))throw Error('FIRST_PAIR_BOOT_CONFIG');
  const response=await fetch(path,{credentials:'omit',redirect:'error',cache:'force-cache'});
  if(!response.ok||response.redirected||!/^application\/json\b/i.test(response.headers.get('Content-Type')||''))throw Error('FIRST_PAIR_MANIFEST_UNAVAILABLE');
  return installFirstPair(await response.json());
}
if(typeof window!=='undefined'&&typeof document!=='undefined')void bootFirstPair().catch(()=>{});
