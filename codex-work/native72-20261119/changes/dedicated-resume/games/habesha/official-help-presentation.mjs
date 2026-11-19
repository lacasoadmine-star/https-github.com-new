// Presentation adapted from the publicly rendered demo menus (r13 references).
// Existing original atlas crops retain the provenance in evidence/r12/art-*.json.
// Payouts and feature text always describe the supplied, validated local model.
import {units, decimal} from './contract.mjs';
const symbols={
 habesha_fortune_5_native:Array.from({length:9},(_,index)=>'symbol_'+index)
};
const displayOrder={habesha_fortune_5_native:Array.from({length:9},(_,index)=>'symbol_'+(8-index))};
const label=name=>name.replaceAll('_',' ');

export function helpPaytableRows(model,stake){
 const amount=units(stake),lines=BigInt(model.paylines);
 if(lines<=0n||amount<=0n||amount%lines!==0n)throw Error('INVALID_HELP_STAKE');
 const order=displayOrder[model.id]||[],names=[...new Set([...order,...Object.keys(model.paytable)])];
 const rows=[];let previousPays='';
 for(const symbol of names){
  const pays=model.paytable[symbol],wild=model.rules.wildSymbols.includes(symbol)&&model.symbols.includes(symbol);
  if(!pays&&!wild)continue;
  const entries=Object.entries(pays||{}).sort(([a],[b])=>Number(b)-Number(a)).map(([count,multiplier])=>({count:Number(count),amount:decimal(amount/lines*BigInt(multiplier)/100n)}));
  const previous=rows.at(-1);
  const signature=JSON.stringify(Object.entries(pays||{}).sort(([a],[b])=>Number(b)-Number(a)));
  if(model.id==='habesha_fortune_5_native'&&!wild&&previous&&!previous.wild&&previousPays===signature)previous.symbols.push(symbol);
  else rows.push({symbols:[symbol],entries,wild,basis:'line'});
  previousPays=signature;
 }
 if(model.rules.scatter?.pays){
  rows.push({symbols:['scatter'],wild:false,basis:'total bet',entries:Object.entries(model.rules.scatter.pays).sort(([a],[b])=>Number(b)-Number(a)).map(([count,multiplier])=>({count:Number(count),amount:decimal(amount*BigInt(multiplier)/100n)}))});
 }
 return rows;
}

// This state owns only Help's preview. It never writes the model or commits a
// wager, and reopening Help resets it to the controller's actual selected bet.
export function createHelpPreview(){
 let source=null,index=0;
 return {
  update(value){source={...value};index=Math.max(0,value.model.betLevels.indexOf(value.stake));return this.value();},
  step(direction){if(!source)return null;index=Math.max(0,Math.min(source.model.betLevels.length-1,index+direction));return this.value();},
  value(){return source?{...source,stake:source.model.betLevels[index]||source.stake}:null;},
  get index(){return index;}
 };
}

export function createOfficialHelpPresentation({document,gameId,audioControls=null}){
 if(!symbols[gameId])return null;
 const get=id=>document.getElementById(id),settings=get('settings'),rules=get('rules'),paytable=get('paytable'),audio=get('audio'),bets=get('bets');
 if(!settings||!rules||!paytable||!audio||!bets)return null;
 const win=document.defaultView,events=new win.AbortController(),listen=(node,type,fn)=>node?.addEventListener(type,fn,{signal:events.signal});
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./official-help.css',import.meta.url).href;document.head.append(css);
 const make=(tag,className,text,parent)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;parent?.append(node);return node;};
 const header=settings.querySelector('header'),nav=settings.querySelector('nav'),title=get('settings-title'),close=header.querySelector('button');
 const exit=make('a','native-help-exit','Exit',header);exit.href=settings.querySelector('footer a')?.getAttribute('href')||'/';exit.setAttribute('aria-label','Exit to games');header.prepend(exit);
 const closeText=close.textContent;close.textContent='Close';close.classList.add('native-help-close');
 const originalNav=new Map();
 for(const [panel,text] of [['rules','Rules'],['audio','Settings'],['history','History']]){
  const button=nav.querySelector('[data-panel="'+panel+'"]');if(!button)continue;originalNav.set(button,button.textContent);button.replaceChildren();make('span','native-help-tab-label',text,button);button.setAttribute('aria-label',text);
 }
 const summary=make('div','native-help-summary'),currency=make('p','native-help-currency','All symbol wins are in ETB',summary),stakeRow=make('div','native-help-stake',undefined,summary);
 const less=make('button','native-help-less','−',stakeRow),selected=make('output','native-help-selected',undefined,stakeRow),more=make('button','native-help-more','+',stakeRow);
 for(const b of [less,more])b.type='button';less.setAttribute('aria-label','Decrease paytable preview bet');more.setAttribute('aria-label','Increase paytable preview bet');selected.setAttribute('aria-label','Paytable preview bet');
 const selectedValue=make('span','','—',selected);make('small','','ETB',selected);
 rules.prepend(summary);
 const feature=make('section','native-help-feature'),featureTitle=make('h3','','MULTIPLIER REEL',feature),featureText=make('p','','',feature),featureArt=make('div','native-help-feature-art',undefined,feature);
 paytable.after(feature);
 const rulesTitle=rules.querySelector('h3');rulesTitle?.classList.add('native-help-rules-title');
 if(get('rules-text'))feature.after(get('rules-text'));
 const nativeAudio=audioControls&&typeof audioControls.getState==='function'&&typeof audioControls.setEffects==='function'&&typeof audioControls.setMusic==='function';
 const soundSource=get('sound'),soundToggle=make('button','native-help-sound-toggle',undefined),soundLabel=make('span','',nativeAudio?'Sound Effects':'Sound effects & music',soundToggle),soundFace=make('span','native-help-toggle-face','',soundToggle);
 soundToggle.type='button';soundToggle.setAttribute('role','switch');audio.prepend(soundToggle);
 let musicToggle=null,nativeAudioGroup=null,volumeDetails=null,volumeNodes=[];
 if(nativeAudio){
  nativeAudioGroup=make('div','native-help-audio-group',undefined,audio);nativeAudioGroup.append(soundToggle);
  musicToggle=make('button','native-help-music-toggle',undefined,nativeAudioGroup);musicToggle.type='button';musicToggle.setAttribute('role','switch');make('span','','Background Music',musicToggle);make('span','native-help-toggle-face','',musicToggle);
  volumeDetails=make('details','native-help-volume-options',undefined,audio);make('summary','','Volume',volumeDetails);
  volumeNodes=Array.from(audio.children).filter(node=>node!==nativeAudioGroup&&node!==volumeDetails);
  for(const node of volumeNodes)volumeDetails.append(node);
  audio.classList.add('native-help-audio-native');
 }
 const full=get('fullscreen'),fullMarker=full?document.createComment('fullscreen original position'):null;
 const fullText=full?.textContent;
 if(full){full.before(fullMarker);(nativeAudioGroup||audio).append(full);full.classList.add('native-help-fullscreen');if(nativeAudio){full.replaceChildren();make('span','','Full Screen',full);make('span','native-help-toggle-face','',full);full.setAttribute('role','switch');}}
 let disposed=false,pack=null,current=null,generation=0,audioBusy=false,menuFont=null;const preview=createHelpPreview(),opener=get('menu-top');
 const artSource=fetch(new URL('./habesha-art.json',import.meta.url)).then(response=>{if(!response.ok)throw Error('HABESHA_HELP_ART_UNAVAILABLE');return response.json();}).then(manifest=>({sprites:Object.fromEntries(Object.values(manifest.sprites).map(entry=>[entry.name,new URL(entry.path,import.meta.url).href]))}));
 const artReady=artSource.then(value=>{if(disposed)return;pack=value;if(current)renderPreview();}).catch(()=>{});
 const menuReady=import('./habesha-menu-assets.mjs').then(async({sprites,bookAlt})=>{
  if(disposed)return;for(const [name,url]of Object.entries(sprites))settings.style.setProperty('--native-menu-'+name,'url("'+url+'")');
  try{const bytes=Uint8Array.from(win.atob(bookAlt.slice(bookAlt.indexOf(',')+1)),character=>character.charCodeAt(0));const font=await new win.FontFace('Official Menu Book',bytes).load();if(!disposed){document.fonts.add(font);menuFont=font;}}catch{}
  if(!disposed)settings.dataset.nativeMenuAssetsReady='true';
 }).catch(()=>{});
 const ready=Promise.all([artReady,menuReady]);
 function soundState(){try{return audioControls.getState();}catch{return {effectsEnabled:false,musicEnabled:false};}}
 function controls(){
  less.disabled=!current||preview.index<=0;more.disabled=!current||preview.index>=current.model.betLevels.length-1;
  if(nativeAudio){const state=soundState();soundToggle.disabled=audioBusy;musicToggle.disabled=audioBusy;soundToggle.setAttribute('aria-checked',String(!!state.effectsEnabled));musicToggle.setAttribute('aria-checked',String(!!state.musicEnabled));}
  else{soundToggle.disabled=!soundSource;soundToggle.setAttribute('aria-checked',String(soundSource?.getAttribute('aria-pressed')!=='true'));}
  if(nativeAudio&&full)full.setAttribute('aria-checked',String(!!document.fullscreenElement));
 }
 function panel(){
  if(disposed)return;
  settings.classList.toggle('official-help-menu',bets.hidden);settings.dataset.officialHelpGame=gameId;
  for(const button of originalNav.keys()){const active=!get(button.dataset.panel)?.hidden;button.setAttribute('aria-current',active?'page':'false');}
  controls();
 }
 // Official Help controls change the paytable preview only (public main.js:169–205).
 // The controller retains the wager; closing Help never commits this preview.
 function renderPreview(){const value=preview.value();if(value)render(value);}
 function stepPreview(direction){if(!current)return;preview.step(direction);renderPreview();}
 async function changeAudio(key){if(disposed||audioBusy)return;audioBusy=true;controls();try{await audioControls[key==='effects'?'setEffects':'setMusic'](!soundState()[key+'Enabled']);}catch{}finally{audioBusy=false;if(!disposed)controls();}}
 listen(less,'click',()=>stepPreview(-1));listen(more,'click',()=>stepPreview(1));listen(soundToggle,'click',()=>nativeAudio?changeAudio('effects'):soundSource?.click());
 if(musicToggle)listen(musicToggle,'click',()=>changeAudio('music'));
 listen(document,'fullscreenchange',controls);const unsubscribe=nativeAudio&&typeof audioControls.subscribe==='function'?audioControls.subscribe(controls):null;
 const observer=new win.MutationObserver(panel);for(const node of [bets,rules,audio,get('history')])if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});
 if(soundSource)observer.observe(soundSource,{attributes:true,attributeFilter:['aria-pressed']});
 function symbolImage(symbol,parent){
  const index=symbols[gameId].indexOf(symbol),url=pack?.sprites['Box/'+index];
  if(url){const img=make('img','native-help-symbol',undefined,parent);img.src=url;img.alt=label(symbol);img.draggable=false;}
  else make('span','native-help-symbol-name',label(symbol),parent);
 }
 function render({model,stake,roundId=null}){
  if(disposed)return;
  const epoch=++generation;let rows;
  try{rows=helpPaytableRows(model,stake);selectedValue.textContent=decimal(units(stake)/100n);}catch{return;}
  title.textContent='Spin ID: '+(roundId||'—');title.title=title.textContent;paytable.replaceChildren();paytable.classList.add('native-help-paytable');paytable.dataset.nativeHelpLayout='habesha';
  rows.forEach((row,index)=>{
   const item=make('article','native-help-symbol-group',undefined,paytable);item.dataset.symbols=row.symbols.join(' ');if(row.wild)item.classList.add('native-help-wild');if(index===0)item.classList.add('native-help-top-symbol');
   const art=make('div','native-help-symbols',undefined,item);art.dataset.count=String(row.symbols.length);for(const name of row.symbols)symbolImage(name,art);
   if(row.wild)make('p','native-help-wild-note','Substitutes for paying symbols'+(model.rules.scatter?', except Scatter.':'.'),item);
   if(row.entries.length){const table=make('dl','native-help-payouts',undefined,item);table.setAttribute('aria-label',row.symbols.map(label).join(', ')+' payouts at 1×');for(const entry of row.entries){make('dt','',String(entry.count),table);make('dd','',entry.amount,table);}if(row.basis==='total bet')make('small','','Scatter · total bet',item);}
  });
  const values=model.wheel.values;featureTitle.textContent='MULTIPLIER REEL';featureText.textContent='Winning lines are multiplied by '+values.map(value=>value+'×').join(', ')+'. Symbol amounts above show the payout at 1×.';
  featureArt.replaceChildren();
  if(pack)for(const value of values){const src=pack.sprites['Multiplier/'+value];if(src){const img=make('img','',undefined,featureArt);img.src=src;img.alt=value+'× multiplier';}}
  if(get('math-note'))get('math-note').textContent='Paytable preview only; changing it does not change your wager. Amounts show the current game rules at 1×. Payouts round down to 0.01 ETB. Maximum win: '+model.maxWinMultiplier+'× total bet.';
  settings.dataset.nativeHelpReady=String(!!pack);panel();
 }
 panel();
 return {ready,update(value){current=value;preview.update(value);renderPreview();},destroy(){disposed=true;generation++;events.abort();observer.disconnect();if(typeof unsubscribe==='function')unsubscribe();css.remove();if(menuFont)document.fonts.delete(menuFont);if(opener){opener.classList.remove('native-menu-original-opener');opener.style.removeProperty('--native-menu-opener');}delete settings.dataset.nativeMenuAssetsReady;settings.classList.remove('official-help-menu');delete settings.dataset.officialHelpGame;delete settings.dataset.nativeHelpReady;exit.remove();close.textContent=closeText;close.classList.remove('native-help-close');for(const [button,text]of originalNav){button.textContent=text;button.removeAttribute('aria-current');button.removeAttribute('aria-label');}summary.remove();feature.remove();soundToggle.remove();musicToggle?.remove();if(full&&fullMarker){fullMarker.replaceWith(full);full.classList.remove('native-help-fullscreen');if(nativeAudio){full.textContent=fullText;full.removeAttribute('role');full.removeAttribute('aria-checked');}}for(const node of volumeNodes)audio.append(node);volumeDetails?.remove();nativeAudioGroup?.remove();audio.classList.remove('native-help-audio-native');rulesTitle?.classList.remove('native-help-rules-title');paytable.classList.remove('native-help-paytable');delete paytable.dataset.nativeHelpLayout;}};
}
