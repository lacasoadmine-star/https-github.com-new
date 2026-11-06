// Presentation adapted from the publicly rendered demo menus (r13 references).
// Existing original atlas crops retain the provenance in evidence/r12/art-*.json.
// Payouts and feature text always describe the supplied, validated local model.
import {units, decimal} from './contract.mjs';
const symbols={
 hot_foxy_20:['fox','cherry','lemon','orange','watermelon','winged_bell','777','big_star'],
 multi_hot_5_video:['orange','cherry','plum','lemon','watermelon','grapes','golden_bell','dollar','777']
};
const displayOrder={hot_foxy_20:['fox','big_star','777','winged_bell','watermelon','orange','lemon','cherry'],multi_hot_5_video:['777','dollar','golden_bell','watermelon','grapes','plum','lemon','orange','cherry']};
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
  if(model.id==='multi_hot_5_video'&&!wild&&previous&&!previous.wild&&previousPays===signature)previous.symbols.push(symbol);
  else rows.push({symbols:[symbol],entries,wild,basis:'line'});
  previousPays=signature;
 }
 if(model.rules.scatter?.pays){
  rows.push({symbols:['scatter'],wild:false,basis:'total bet',entries:Object.entries(model.rules.scatter.pays).sort(([a],[b])=>Number(b)-Number(a)).map(([count,multiplier])=>({count:Number(count),amount:decimal(amount*BigInt(multiplier)/100n)}))});
 }
 return rows;
}

export function createOfficialHelpPresentation({document,gameId}){
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
 const less=make('button','native-help-less','−',stakeRow),selected=make('button','native-help-selected',undefined,stakeRow),more=make('button','native-help-more','+',stakeRow);
 for(const b of [less,selected,more])b.type='button';less.setAttribute('aria-label','Decrease bet');more.setAttribute('aria-label','Increase bet');selected.setAttribute('aria-label','Choose total bet');
 const selectedValue=make('span','','—',selected);make('small','','ETB',selected);
 rules.prepend(summary);
 const feature=make('section','native-help-feature'),featureTitle=make('h3','','MULTIPLIER REEL',feature),featureText=make('p','','',feature),featureArt=make('div','native-help-feature-art',undefined,feature);
 if(gameId==='hot_foxy_20')feature.prepend(featureArt);
 paytable.after(feature);
 const rulesTitle=rules.querySelector('h3');rulesTitle?.classList.add('native-help-rules-title');
 if(get('rules-text'))feature.after(get('rules-text'));
 const soundSource=get('sound'),soundToggle=make('button','native-help-sound-toggle',undefined),soundLabel=make('span','','Sound effects & music',soundToggle),soundFace=make('span','native-help-toggle-face','',soundToggle);
 soundToggle.type='button';soundToggle.setAttribute('role','switch');audio.prepend(soundToggle);
 const full=get('fullscreen'),fullMarker=full?document.createComment('fullscreen original position'):null;
 if(full){full.before(fullMarker);audio.append(full);full.classList.add('native-help-fullscreen');}
 let disposed=false,pack=null,current=null,generation=0;
 const ready=(gameId==='hot_foxy_20'?import('./official-foxy-art.mjs'):import('./official-mh5-art.mjs')).then(value=>{if(disposed)return;pack=value;if(current)render(current);}).catch(()=>{});
 function controls(){
  less.disabled=!get('bet-less')||get('bet-less').disabled;more.disabled=!get('bet-more')||get('bet-more').disabled;selected.disabled=!get('bet-open')||get('bet-open').disabled;
  soundToggle.disabled=!soundSource;soundToggle.setAttribute('aria-checked',String(soundSource?.getAttribute('aria-pressed')!=='true'));
 }
 function panel(){
  if(disposed)return;
  settings.classList.toggle('official-help-menu',bets.hidden);settings.dataset.officialHelpGame=gameId;
  for(const button of originalNav.keys()){const active=!get(button.dataset.panel)?.hidden;button.setAttribute('aria-current',active?'page':'false');}
  controls();
 }
 listen(less,'click',()=>get('bet-less')?.click());listen(more,'click',()=>get('bet-more')?.click());
 listen(selected,'click',()=>nav.querySelector('[data-panel="bets"]')?.click());listen(soundToggle,'click',()=>soundSource?.click());
 const observer=new win.MutationObserver(panel);for(const node of [bets,rules,audio,get('history')])if(node)observer.observe(node,{attributes:true,attributeFilter:['hidden']});
 for(const node of [soundSource,get('bet-less'),get('bet-more'),get('bet-open')])if(node)observer.observe(node,{attributes:true,attributeFilter:['disabled','aria-pressed']});
 function symbolImage(symbol,parent){
  const index=symbols[gameId].indexOf(symbol),url=pack?.sprites['Box/'+index];
  if(url){const img=make('img','native-help-symbol',undefined,parent);img.src=url;img.alt=label(symbol);img.draggable=false;}
  else make('span','native-help-symbol-name',label(symbol),parent);
 }
 function render({model,stake}){
  if(disposed)return;
  const epoch=++generation;let rows;
  try{rows=helpPaytableRows(model,stake);selectedValue.textContent=decimal(units(stake)/100n);}catch{return;}
  title.textContent=model.name;paytable.replaceChildren();paytable.classList.add('native-help-paytable');paytable.dataset.nativeHelpLayout=gameId==='hot_foxy_20'?'foxy':'mh5';
  rows.forEach((row,index)=>{
   const item=make('article','native-help-symbol-group',undefined,paytable);item.dataset.symbols=row.symbols.join(' ');if(row.wild)item.classList.add('native-help-wild');if(index<2&&gameId==='hot_foxy_20'&&rows[0]?.wild)item.classList.add('native-help-first-row');if(index===0&&gameId==='multi_hot_5_video')item.classList.add('native-help-top-symbol');
   const art=make('div','native-help-symbols',undefined,item);art.dataset.count=String(row.symbols.length);for(const name of row.symbols)symbolImage(name,art);
   if(row.wild)make('p','native-help-wild-note','Substitutes for paying symbols'+(model.rules.scatter?', except Scatter.':'.'),item);
   if(row.entries.length){const table=make('dl','native-help-payouts',undefined,item);table.setAttribute('aria-label',row.symbols.map(label).join(', ')+' payouts at 1×');for(const entry of row.entries){make('dt','',String(entry.count),table);make('dd','',entry.amount,table);}if(row.basis==='total bet')make('small','','Scatter · total bet',item);}
  });
  const values=model.wheel.values;featureTitle.textContent='MULTIPLIER REEL';featureText.textContent='Winning lines are multiplied by '+values.map(value=>value+'×').join(', ')+'. Symbol amounts above show the payout at 1×.';
  featureArt.replaceChildren();
  if(pack&&gameId==='multi_hot_5_video')for(const value of values){const src=pack.sprites['Multiplier/'+value];if(src){const img=make('img','',undefined,featureArt);img.src=src;img.alt=value+'× multiplier';}}
  if(pack&&gameId==='hot_foxy_20'){
   const canvas=make('canvas','native-help-wheel',undefined,featureArt);canvas.width=420;canvas.height=130;canvas.setAttribute('aria-label','Multiplier wheel with values '+values.join(', '));
   const keys=['Multiplier/Background','Multiplier/Wheel','Multiplier/Numbers','Multiplier/Box','Multiplier/Light','Multiplier/BorderBox'];
   Promise.all(keys.map(key=>new Promise(resolve=>{const img=new win.Image();img.onload=()=>resolve([key,img]);img.onerror=()=>resolve([key,null]);img.src=pack.sprites[key];}))).then(async entries=>{
    if(disposed||epoch!==generation)return;const {drawOfficialFoxyWheel,officialFoxyAngle}=await import('./official-presentation.mjs');if(disposed||epoch!==generation)return;const c=canvas.getContext('2d');c.translate(0,-46);drawOfficialFoxyWheel(c,{sprites:new Map(entries),meta:pack.spriteMeta},{angle:officialFoxyAngle(5),reducedMotion:true});
   }).catch(()=>{});
  }
  settings.dataset.nativeHelpReady=String(!!pack);panel();
 }
 panel();
 return {ready,update(value){current=value;render(value);},destroy(){disposed=true;generation++;events.abort();observer.disconnect();css.remove();settings.classList.remove('official-help-menu');delete settings.dataset.officialHelpGame;delete settings.dataset.nativeHelpReady;exit.remove();close.textContent=closeText;close.classList.remove('native-help-close');for(const [button,text]of originalNav){button.textContent=text;button.removeAttribute('aria-current');button.removeAttribute('aria-label');}summary.remove();feature.remove();soundToggle.remove();if(full&&fullMarker){fullMarker.replaceWith(full);full.classList.remove('native-help-fullscreen');}rulesTitle?.classList.remove('native-help-rules-title');paytable.classList.remove('native-help-paytable');delete paytable.dataset.nativeHelpLayout;}};
}
