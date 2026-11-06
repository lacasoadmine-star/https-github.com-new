// Native dialog presentation. The controller owns permitted bets and AUTO results.
const supported=new Set(['hot_foxy_20','multi_hot_5_video']);
const limits=[['stopWin','If a win reaches or exceeds'],['stopDecrease','If balance decreases'],['stopIncrease','If balance increases']];
const decimalPattern='[0-9]+(?:\\.[0-9]{1,2})?';

export function installOfficialAutoBetPresentation(document,gameId){
 if(!supported.has(gameId))return null;
 const foxy=gameId==='hot_foxy_20',win=document.defaultView,events=new AbortController();
 const listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:events.signal});
 const auto=document.getElementById('auto-dialog'),settings=document.getElementById('settings'),bets=document.getElementById('bets'),options=document.getElementById('bet-options'),machine=document.getElementById('machine');
 if(!auto||!settings||!bets||!options||!machine)return null;
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./official-auto-bet.css',import.meta.url).href;document.head.append(css);
 auto.classList.add('official-auto',foxy?'official-auto-foxy':'official-auto-mh5');
 auto.setAttribute('aria-label','Autoplay');
 auto.replaceChildren();
 const stage=document.createElement('div');stage.className='official-auto-stage';stage.tabIndex=-1;stage.setAttribute('autofocus','');auto.append(stage);
 const make=(tag,className,text,parent=stage)=>{const node=document.createElement(tag);node.className=className;if(text!==undefined)node.textContent=text;parent.append(node);return node;};
 const close=make('button','official-auto-close',foxy?'':'×');close.type='button';close.setAttribute('aria-label','Close autoplay');listen(close,'click',()=>auto.close());
 if(!foxy)make('h2','official-auto-title','AUTOPLAY');
 const counts=foxy?[25,50,100,500,1000]:[10,25,50,75,Infinity];let count=foxy?100:Infinity;
 const choices=make('div','official-auto-counts');choices.setAttribute('role','group');choices.setAttribute('aria-label','Number of auto spins');
 for(const value of counts){
  const button=make('button','official-auto-count',Number.isFinite(value)?String(value):'∞',choices);button.type='button';button.dataset.autoCount=String(value);button.setAttribute('aria-pressed',String(value===count));button.setAttribute('aria-label',Number.isFinite(value)?value+' spins':'Unlimited spins');
  listen(button,'click',()=>{count=value;for(const other of choices.children)other.setAttribute('aria-pressed',String(other===button));});
 }
 make('h3','official-auto-stop-title',foxy?'STOP AUTOPLAY':'SPIN TILL');
 const fields=[];
 for(const [index,[name,label]]of (foxy?limits:[['stopIncrease','If win reachs or exceeds'],['stopDecrease','If lose not exceeds']]).entries()){
  const row=make('div','official-auto-row');row.style.setProperty('--row',String(index));
  let checkbox=null;
  if(foxy){
   const toggle=make('label','official-auto-toggle',undefined,row);checkbox=make('input','official-auto-check',undefined,toggle);checkbox.type='checkbox';checkbox.setAttribute('aria-label',label);make('span','official-auto-toggle-face','',toggle).setAttribute('aria-hidden','true');
  }
  const text=make('label','official-auto-label',label,row),inputBox=make('div','official-auto-input-box',undefined,row),input=make('input','official-auto-input',undefined,inputBox);
  input.id='official-auto-'+name;input.type='text';input.inputMode='decimal';input.autocomplete='off';input.pattern=decimalPattern;input.maxLength=16;input.setAttribute('aria-label',label+' in ETB');text.htmlFor=input.id;
  make('span','official-auto-currency','ETB',inputBox).setAttribute('aria-hidden','true');
  if(checkbox){input.disabled=true;listen(checkbox,'change',()=>{input.disabled=!checkbox.checked;input.required=checkbox.checked;row.classList.toggle('active',checkbox.checked);if(checkbox.checked)input.focus();});}
  fields.push({name,input,checkbox});
 }
 let bigWin=null;
 if(!foxy){
  make('h3','official-auto-big-title','STOP SPIN');
  const row=make('label','official-auto-big-row','If i win BIG WIN');bigWin=make('input','official-auto-big-check',undefined,row);bigWin.type='checkbox';make('span','official-auto-big-face','',row).setAttribute('aria-hidden','true');
 }
 const start=make('button','official-auto-start',foxy?'START PLAY':'START');start.id='official-auto-start';start.type='button';
 if(!foxy){
  const title=stage.querySelector('.official-auto-title'),stopTitle=stage.querySelector('.official-auto-stop-title'),bigTitle=stage.querySelector('.official-auto-big-title'),bigRow=stage.querySelector('.official-auto-big-row'),rows=Array.from(stage.querySelectorAll('.official-auto-row'));
  const head=make('div','official-auto-head'),info=make('div','official-auto-info'),left=make('div','official-auto-info-left',undefined,info),right=make('div','official-auto-info-right',undefined,info),buttons=make('div','official-auto-buttons');
  head.append(title,close);left.append(stopTitle,...rows);right.append(bigTitle,bigRow);buttons.append(start);stage.replaceChildren(head,choices,info,buttons);
 }
 let first=0,up=null,down=null;
 if(foxy){
  up=make('button','official-bet-up','',bets);down=make('button','official-bet-down','',bets);
  for(const [button,direction]of [[up,-1],[down,1]]){button.type='button';button.setAttribute('aria-label',direction<0?'Previous bet levels':'Next bet levels');listen(button,'click',()=>{first+=direction;updateBetOptions(false);});}
 }
 const betButtons=()=>Array.from(options.children).filter(button=>button.matches('button[data-bet]'));
 function updateBetOptions(reset=true){
  if(!foxy)return;
  const buttons=betButtons();
  if(reset){const selected=buttons.findIndex(button=>button.getAttribute('aria-pressed')==='true');if(selected>=0)first=selected;}
  first=Math.max(0,Math.min(first,Math.max(0,buttons.length-5)));
  buttons.forEach((button,index)=>{
   button.hidden=index<first||index>=first+5;
   if(button.dataset.nativeBetLabel!==button.dataset.bet){button.dataset.nativeBetLabel=button.dataset.bet;button.replaceChildren();make('span','official-bet-amount',button.dataset.bet,button);make('small','official-bet-currency',' ETB',button);}
  });
  up.disabled=first===0;down.disabled=first+5>=buttons.length;
 }
 function fit(){
  const rect=machine.getBoundingClientRect();
  auto.style.setProperty('--dialog-machine-width',rect.width+'px');auto.style.setProperty('--dialog-machine-height',rect.height+'px');auto.style.setProperty('--dialog-machine-top',rect.top+'px');auto.style.setProperty('--dialog-machine-left',rect.left+'px');
  if(foxy){
   const visible=!bets.hidden;settings.classList.toggle('official-bet-foxy',visible);
   settings.style.setProperty('--dialog-machine-width',rect.width+'px');settings.style.setProperty('--dialog-machine-bottom',Math.max(0,win.innerHeight-rect.bottom+rect.height*.06)+'px');settings.style.setProperty('--dialog-machine-left',rect.left+'px');
   if(visible&&settings.open)updateBetOptions();
  }
 }
 const observer=new win.MutationObserver(fit);observer.observe(settings,{attributes:true,attributeFilter:['open']});observer.observe(bets,{attributes:true,attributeFilter:['hidden']});observer.observe(auto,{attributes:true,attributeFilter:['open']});
 const betObserver=new win.MutationObserver(()=>updateBetOptions());betObserver.observe(options,{childList:true});
 const resize=new win.ResizeObserver(fit);resize.observe(machine);listen(win,'resize',fit);
 listen(options,'click',event=>{if(foxy&&event.target.closest('button[data-bet]:not(:disabled)'))settings.close();});
 for(const dialog of [auto,settings])listen(dialog,'click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 const ready=foxy?Promise.all([import('./official-foxy-dialog-assets.mjs'),import('./official-foxy-art.mjs')]).then(([autoArt,art])=>{
  for(const [key,url]of Object.entries(autoArt.sprites))auto.style.setProperty('--native-'+key.replace('AutoPlay/','').replace(/[A-Z]/g,(letter,index)=>(index?'-':'')+letter.toLowerCase()),'url("'+url+'")');
  for(const name of ['Button','ButtonActive','Popup','Up','Down'])settings.style.setProperty('--native-bet-'+name.replace(/[A-Z]/g,(letter,index)=>(index?'-':'')+letter.toLowerCase()),'url("'+art.sprites['Bets/'+name]+'")');
  auto.dataset.nativeDialogReady='true';settings.dataset.nativeBetReady='true';
 }):import('./official-mh5-dialog-assets.mjs').then(({sprites})=>{for(const [name,url]of Object.entries(sprites))auto.style.setProperty('--native-'+name,'url("'+url+'")');auto.dataset.nativeDialogReady='true';});
 fit();updateBetOptions();
 return {ready,updateBetOptions,readAutoOptions(){
  const value={count,stopWin:null,stopDecrease:null,stopIncrease:null,stopBigWin:!!bigWin?.checked};
  for(const {name,input,checkbox}of fields){
   if(checkbox&&!checkbox.checked)continue;
   input.value=input.value.trim();if(!checkbox&&!input.value)continue;
   if(!input.reportValidity())return null;
   value[name]=input.value;
  }
  return value;
 },destroy(){events.abort();observer.disconnect();betObserver.disconnect();resize.disconnect();css.remove();}};
}
