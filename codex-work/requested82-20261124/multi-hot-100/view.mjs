import { M100_SYMBOL_FRAMES, } from '../../continue71-20261122/multi-hot-100-component/render/atlas.mjs';
import { M100_PAYLINES } from './rules/paylines.mjs';
import { M100_OBSERVED_AUTO_COUNTS } from './controls.mjs';

const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const cents=value=>{const raw=String(value??'').trim();if(!/^\d+(?:\.\d{1,2})?$/.test(raw))return null;const [whole,fraction='']=raw.split('.');const n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return n>0n&&n<=99999999999999n?`${n/100n}.${String(n%100n).padStart(2,'0')}`:null;};
const showAmount=value=>value===null||value===undefined?'—':String(value);
const focusables=element=>[...element.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length);
const running=state=>['SPIN_PENDING','PRESENTING'].includes(state.phase);
const validIdleGrid=grid=>grid===null||Array.isArray(grid)&&grid.length===4&&Array.from(grid).every(row=>Array.isArray(row)&&row.length===5&&Array.from(row).every(name=>Object.hasOwn(M100_SYMBOL_FRAMES,name)));
const button=(action,label,options='')=>`<button type="button" data-action="${action}" ${options}>${label}</button>`;

// Own native Multiplier/Numbers geometry. This is not an outcome or timing model.
export const M100_NATIVE_WHEEL_VALUES=Object.freeze([2,4,2,5,1,3,5,2,5,2,4,1,3,5]);
const wheelSector=Object.freeze({1:4,2:0,3:5,4:10,5:6});
export function defaultM100WheelAngle({presentation}){const multiplier=(presentation.receipt??presentation.previous)?.multiplier??2;return -wheelSector[multiplier]*2*Math.PI/14;}


/** Own responsive M100 surface. Only accepted host receipts are drawn as results. */
export function mountMultiHot100View({root,controller,assets=null,drawScene=null,audio=null,onExit=null,onAutoStart=null,onAutoStop=null,presentationClock=null,paytable=[],rules=[],historyRecords=null,historyURL=null,idleGrid=null,wheelAngle=defaultM100WheelAngle,reelOffset=null}={}) {
  if(!root?.ownerDocument||!controller?.snapshot||!controller?.controls||!controller?.presentation)throw new TypeError('M100_VIEW_CONTRACT');
  if(!validIdleGrid(idleGrid))throw new TypeError('M100_IDLE_GRID_CONTRACT');
  if(presentationClock!==null&&typeof presentationClock!=='function')throw new TypeError('M100_CLOCK_CONTRACT');
  const doc=root.ownerDocument,win=doc.defaultView,abort=new win.AbortController(),signal=abort.signal;
  const initialCurrency=controller.snapshot().currency;
  let disposed=false,raf=null,modalKey=null,priorFocus=null,latestError='',startedAt=null,animationKey=null,renderError=false;
  const nativeImages=new Map();
  let lastSound='',lastRound='',lastAudioEnabled='',infoTab='rules',autoCount=100,betOffset=0;
  const betWindowSize=5;
  const autoLimits={winAtLeast:null,balanceDecrease:null,balanceIncrease:null};
  root.innerHTML=`<section class="m100-game" aria-label="Multi Hot 100" tabindex="-1">
    <header class="m100-top"><div class="m100-brand m100-sr"><span>MULTI HOT</span><strong>100</strong></div><span class="m100-demo m100-sr">${initialCurrency==='DMO'?'DEMO · DMO':esc(initialCurrency)}</span>${onExit?button('exit','Close game','aria-label="Close game" class="m100-icon"'):''}</header>
    <div class="m100-cabinet"><div class="m100-stage"><canvas class="m100-canvas" width="1363" height="766" aria-hidden="true"></canvas><div class="m100-round-description m100-sr" role="status" aria-live="polite"></div></div><div class="m100-banner" aria-live="polite"></div></div>
    <div class="m100-readout"><div><span>BALANCE</span><strong data-value="balance">—</strong><small data-currency>${esc(initialCurrency)}</small></div><div><span>WIN</span><strong data-value="win">—</strong><small data-currency>${esc(initialCurrency)}</small></div><div>${button('bet','<span>BET</span><strong data-value="bet">1.00</strong><small data-currency></small>','aria-label="Change bet"')}</div></div>
    <div class="m100-controls"><div class="m100-side">${button('menu','☰','aria-label="Menu" class="m100-icon"')}${button('sound','♪','aria-label="Sound" aria-pressed="true" class="m100-icon"')}</div>
    <div class="m100-play-group">${button('quick','⚡','aria-label="Quick spin" aria-pressed="false" class="m100-icon m100-quick"')}${button('spin','<span class="m100-spin-ring">⟳</span><span data-spin-label>HOLD &amp; SPIN</span>','aria-label="HOLD &amp; SPIN" class="m100-spin"')}${button('auto','⟳','aria-label="Autoplay" class="m100-icon m100-auto"')+button('bet','$','aria-label="Bet selector" class="m100-icon m100-bet-button"')}</div>
    <div class="m100-win-actions">${button('take','TAKE WIN','aria-label="Take win"')}${button('double','X2','aria-label="Double win"')}</div></div>
    <p class="m100-status" role="status" aria-live="polite"></p><div class="m100-recovery" hidden>${button('recover','Recover current round')}</div><div class="m100-overlay" hidden></div>
    </section>`;
  const game=root.querySelector('.m100-game'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d'),overlay=root.querySelector('.m100-overlay');
  const byAction=name=>root.querySelector(`[data-action="${name}"]`);
  const text=(value,x,y,size=24,color='#fff',align='center')=>{ctx.fillStyle=color;ctx.font=`700 ${size}px Arial,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(value),x,y);};
  const safeCall=(object,name,...args)=>{try{return object?.[name]?.(...args);}catch{return undefined;}};
  function nativeURL(name){if(!assets?.frames?.names?.includes(name))return null;if(!nativeImages.has(name))nativeImages.set(name,assets.frames.get(name).toDataURL());return nativeImages.get(name);}
  function nativeButton(el,name){if(!el)return;const url=nativeURL(name);el.classList.toggle('m100-native-button',!!url);if(url)el.style.backgroundImage=`url("${url}")`;else el.style.removeProperty('background-image');}
  function message(text){latestError=text;root.querySelector('.m100-status').textContent=text;}
  function scene(state,view){
    const portrait=game.getBoundingClientRect().width<700;
    const bounds=game.getBoundingClientRect(),width=portrait?600:1363;
    const size={width,height:Math.round(width*bounds.height/bounds.width)},verticalOffset=portrait?0:Math.max(0,(size.height-766)/2);
    if(canvas.width!==size.width||canvas.height!==size.height){canvas.width=size.width;canvas.height=size.height;}
    ctx.clearRect(0,0,size.width,size.height);
    if(drawScene){drawScene({canvas,context:ctx,state,presentation:view,assets,portrait});return;}
    if(assets?.background){const bg=assets.background,scale=Math.max(size.width/bg.width,size.height/bg.height);ctx.drawImage(bg,(size.width-bg.width*scale)/2,(size.height-bg.height*scale)/2,bg.width*scale,bg.height*scale);}
    else {const fill=ctx.createRadialGradient(size.width/2,size.height/2,0,size.width/2,size.height/2,size.width*.8);fill.addColorStop(0,'#07583d');fill.addColorStop(.7,'#002b23');fill.addColorStop(1,'#001b1d');ctx.fillStyle=fill;ctx.fillRect(0,0,size.width,size.height);}
    const x=portrait?3:386,y=portrait?Math.round(size.height*.28):184+verticalOffset,w=portrait?594:568,h=portrait?475.2:460,cw=w/5,ch=h/4;
    game.style.setProperty('--m100-reels-bottom',`${(y+h)/size.height*100}%`);
    const nativeCabinet=assets?.frames?.names?.includes('Box/Background');
    if(nativeCabinet){const cabinet=assets.frames.get('Box/Background');ctx.drawImage(cabinet,0,243,993,813,x-5,y-5,w+10,h+10);}
    else{ctx.fillStyle='#003025';ctx.fillRect(x-5,y-5,w+10,h+10);ctx.strokeStyle='#d4ba65';ctx.lineWidth=4;ctx.strokeRect(x-5,y-5,w+10,h+10);}
    const receipt=view.receipt??view.previous,grid=receipt?.grid??idleGrid;
    for(let col=0;col<5;col++){
      ctx.save();ctx.beginPath();ctx.rect(x+col*cw,y,cw,h);ctx.clip();
      const offset=view.moving&&!view.stopRequested&&reelOffset?reelOffset({column:col,cellHeight:ch,state,presentation:view}):0;
      if(!Number.isFinite(offset))throw new TypeError('M100_REEL_OFFSET');
      for(let row=-1;row<5;row++){
        const cy=y+row*ch+offset;
        if(!nativeCabinet){ctx.fillStyle=(row+col)%2?'#00372f':'#003d31';ctx.fillRect(x+col*cw,cy,cw,ch);}
        const symbol=grid?.[(row+4)%4]?.[col];
        if(symbol&&assets?.frames){
          const name=M100_SYMBOL_FRAMES[symbol],image=assets.frames.get(name),trim=assets.frames.metadata?.(name)?.spriteSourceSize??{x:0,y:0,w:image.width,h:image.height};
          const scale=Math.min((cw-8)/trim.w,(ch-8)/trim.h);
          ctx.drawImage(image,x+col*cw+cw/2-(trim.x+trim.w/2)*scale,cy+ch/2-(trim.y+trim.h/2)*scale,image.width*scale,image.height*scale);
        }
      }
      ctx.restore();if(!nativeCabinet){ctx.strokeStyle='#5b895a';ctx.lineWidth=1;ctx.strokeRect(x+col*cw,y,cw,h);}
    }
    if(state.phase==='WIN_PENDING'&&Array.isArray(receipt?.winningLines)){
      ctx.save();ctx.strokeStyle='#ffe942';ctx.lineWidth=3;ctx.shadowColor='#f5ee4a';ctx.shadowBlur=8;for(const id of receipt.winningLines){const path=M100_PAYLINES[id-1];if(!path)continue;ctx.beginPath();path.forEach((row,col)=>col?ctx.lineTo(x+(col+.5)*cw,y+(row+.5)*ch):ctx.moveTo(x+cw/2,y+(row+.5)*ch));ctx.stroke();}ctx.restore();
    }
    if(!grid){text('MULTI HOT 100',x+w/2,y+h/2-22,portrait?32:30,'#ffe6a0');text('Ready to play',x+w/2,y+h/2+24,20,'#fff4dc');}
    // Only this game's native art and an explicitly supplied observed angle are used.
    if(assets?.frames?.names?.includes('Multiplier/Background')){
      const scale=(w+10)/993,cx=x+w/2,full=1320*scale,top=y-243*scale;
      ctx.save();ctx.beginPath();ctx.rect(x-45,0,w+90,y-1);ctx.clip();
      ctx.drawImage(assets.frames.get('Multiplier/Background'),cx-full/2,top,full,full);
      if(assets.frames.names.includes('Multiplier/Numbers')&&typeof wheelAngle==='function'){
        const angle=wheelAngle({state,presentation:view});if(!Number.isFinite(angle))throw new TypeError('M100_WHEEL_ANGLE');
        const ring=assets.frames.get('Multiplier/Numbers'),ringSize=1164*scale;
        ctx.translate(cx,top+full/2);ctx.rotate(angle);ctx.drawImage(ring,-ringSize/2,-ringSize/2,ringSize,ringSize);
      }
      ctx.restore();
    }
    if(receipt&&!assets?.frames?.names?.includes('Multiplier/Numbers')){const mx=x+w/2,my=y-72;text(`×${receipt.multiplier}`,mx,my,43,'#ffe8a0');}
    if(assets?.logo?.imageAt){const image=assets.logo.imageAt(win.performance.now()/1000);ctx.drawImage(image,portrait?100:45,portrait?121:95+verticalOffset,portrait?400:345,portrait?97:83.5);}
    else text('MULTI HOT 100',portrait?300:220,portrait?166:132+verticalOffset,portrait?36:31,'#ffe39a');
  }
  function description(state){
    if(state.phase==='RECOVERY_REQUIRED'||state.presentationRecoveryRequired)return 'Connection interrupted. Recover the current round to continue.';
    if(state.phase==='WIN_PENDING')return `Win ${state.pendingWin} ${state.currency}. Take win or double.`;
    if(state.phase.endsWith('_PENDING'))return 'Waiting for the current action.';
    if(state.phase==='PRESENTING')return 'Reels spinning.';
    return '';
  }
  function update(){
    if(disposed)return;
    const state=controller.snapshot(),view=controller.presentation.snapshot(),moving=running(state),pending=!!state.pending;
    root.querySelector('[data-value="balance"]').textContent=showAmount(state.balance);
    for(const el of root.querySelectorAll('[data-currency]'))el.textContent=state.currency;
    root.querySelector('.m100-demo').textContent=state.currency==='DMO'?'DEMO · DMO':state.currency;
    root.querySelector('[data-value="bet"]').textContent=state.selectedBet;
    root.querySelector('[data-value="win"]').textContent=state.pendingWin===null?'—':state.pendingWin;
    root.querySelector('.m100-readout>div:nth-child(2)').style.visibility=state.phase==='WIN_PENDING'?'visible':'hidden';
    const recovering=state.phase==='RECOVERY_REQUIRED'||state.presentationRecoveryRequired;
    byAction('spin').disabled=state.hidden||state.disposed||recovering||(!moving&&(pending||!!state.modal||!['IDLE','WIN_PENDING'].includes(state.phase)));
    const spinLabel=moving?'STOP':'HOLD & SPIN';byAction('spin').setAttribute('aria-label',spinLabel);root.querySelector('[data-spin-label]').textContent=moving?'STOP':'HOLD\n&\nSPIN';
    byAction('spin').classList.toggle('is-moving',moving);byAction('spin').setAttribute('aria-busy',String(pending));
    for(const name of ['take','double'])byAction(name).disabled=state.hidden||pending||state.phase!=='WIN_PENDING'||(!!state.modal&&state.modal!=='double');
    for(const name of ['bet','auto','quick'])for(const el of root.querySelectorAll(`[data-action="${name}"]`))el.disabled=state.hidden||pending||(name==='auto'&&state.auto.running?false:state.phase!=='IDLE');
    byAction('menu').disabled=state.hidden||pending||state.phase==='PRESENTING';
    byAction('sound').setAttribute('aria-pressed',String(state.settings.soundEffects||state.settings.music));byAction('sound').textContent=state.settings.soundEffects||state.settings.music?'♪':'♩';
    byAction('quick').setAttribute('aria-pressed',String(state.settings.quick));byAction('auto').setAttribute('aria-pressed',String(state.auto.running));
    for(const el of root.querySelectorAll('[data-action="fullscreen"]')){el.setAttribute('aria-pressed',String(doc.fullscreenElement===game));el.setAttribute('aria-checked',String(doc.fullscreenElement===game));}
    nativeButton(byAction('spin'),moving?(state.settings.quick?'Buttons/SpinTurboStop':'Buttons/SpinStop'):byAction('spin').disabled?'Buttons/SpinDisabled':state.settings.quick?'Buttons/SpinTurbo':'Buttons/Spin');
    nativeButton(byAction('auto'),state.auto.running?'Buttons/AutoPlayStop':'Buttons/AutoPlay');
    nativeButton(root.querySelector('.m100-bet-button'),'Buttons/Bet');nativeButton(byAction('quick'),state.settings.quick?'Buttons/QuickPlayTurbo':'Buttons/QuickPlay');
    nativeButton(byAction('menu'),'Buttons/Menu');nativeButton(byAction('sound'),state.settings.soundEffects||state.settings.music?'Buttons/SoundOn':'Buttons/SoundOff');
    nativeButton(byAction('take'),'Buttons/DoubleTake');nativeButton(byAction('double'),'Buttons/Double');
    for(const [index,name] of [[1,'Start/FooterBalance'],[2,'Start/FooterWin'],[3,'Start/FooterBet']]){const el=root.querySelector(`.m100-readout>div:nth-child(${index})`),url=nativeURL(name);if(url){el.style.backgroundImage=`url("${url}")`;el.classList.add('m100-native-readout');}}
    root.querySelector('.m100-recovery').hidden=!recovering;for(const el of root.querySelectorAll('[data-action="recover"]'))el.disabled=state.hidden||state.inFlight;
    const status=description(state),statusEl=root.querySelector('.m100-status');statusEl.textContent=latestError||status;statusEl.classList.toggle('m100-sr',!latestError&&!recovering);
    root.querySelector('.m100-banner').textContent=view.receipt?.winTier&&state.phase==='PRESENTING'?view.receipt.winTier:'';
    if(state.round?.roundId&&state.round.roundId!==lastRound&&state.phase!=='PRESENTING'){
      lastRound=state.round.roundId;root.querySelector('.m100-round-description').textContent=`Result: ${state.round.grid.map(row=>row.join(', ')).join('; ')}. Multiplier ${state.round.multiplier}. Win ${state.pendingWin} ${state.currency}.`;
    }
    const audioEnabled=JSON.stringify(state.settings);
    if(audioEnabled!==lastAudioEnabled){lastAudioEnabled=audioEnabled;safeCall(audio,'setEnabled',{effects:state.settings.soundEffects,music:state.settings.music});}
    const soundKey=[view.pending?.requestKey??state.round?.roundId??'',state.phase].join(':');
    if(soundKey!==lastSound){lastSound=soundKey;if(state.phase==='SPIN_PENDING')safeCall(audio,'play','spin');else if(state.phase==='WIN_PENDING')safeCall(audio,'play','win');else if(state.phase==='IDLE'&&state.round)safeCall(audio,'play','settled');}
    renderModal(state);
    try{scene(state,view);renderError=false;}catch{if(!renderError){renderError=true;message('The game artwork could not be displayed.');}}
  }
  function autoFields(state){return `<label>Number of rounds<select name="maximumRounds">${M100_OBSERVED_AUTO_COUNTS.map(n=>`<option value="${n}" ${n===autoCount?'selected':''}>${n}</option>`).join('')}</select></label>${[['winAtLeast','If a win reaches or exceeds'],['balanceDecrease','If balance decreases'],['balanceIncrease','If balance increases']].map(([name,label])=>`<div class="m100-auto-limit"><label><input type="checkbox" name="${name}Enabled" ${autoLimits[name]?'checked':''}>${label}</label><label class="m100-sr" for="m100-${name}">${label} amount</label><input id="m100-${name}" name="${name}" aria-label="${label} amount" inputmode="decimal" value="${esc(autoLimits[name]??'')}" ${autoLimits[name]?'':'disabled'}></div>`).join('')}<p class="m100-modal-error" role="alert"></p>${button('auto-start','Start Play',onAutoStart?'':'disabled')}${onAutoStart?'':'<p>Autoplay is unavailable for this session.</p>'}`;}
  function rulesContent(state){
    const items=typeof paytable==='function'?paytable({bet:state.paytablePreviewBet,currency:state.currency}):paytable;
    return `<p class="m100-paytable-heading">All symbol wins are in ${esc(state.currency)}</p><div class="m100-preview">${button('preview-minus','−','aria-label="Decrease paytable preview bet"')}<span>${esc(state.paytablePreviewBet)}<small>${esc(state.currency)}</small></span>${button('preview-plus','+','aria-label="Increase paytable preview bet"')}</div>${Array.isArray(items)&&items.length?`<div class="m100-paytable">${items.map(item=>`<article>${Object.hasOwn(M100_SYMBOL_FRAMES,item.symbol)?`<canvas data-paytable-symbol="${esc(item.symbol)}" width="160" height="160" aria-label="${esc(item.label??item.symbol)}" role="img"></canvas>`:`<h3>${esc(item.label??item.symbol)}</h3>`}${(item.rows??[]).map(row=>`<p>${esc(row)}</p>`).join('')}</article>`).join('')}</div>`:'<p>The paytable is unavailable for this session.</p>'}${rules.map(item=>`<article><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></article>`).join('')}<article class="m100-controls-help"><h3>Controls</h3><dl><dt>SPIN / Space</dt><dd>Start one round. During a round, STOP finishes its presentation when the accepted result is available.</dd><dt>TAKE WIN</dt><dd>Collect the pending win.</dd><dt>X2</dt><dd>Open the double panel and choose red or black.</dd><dt>BET</dt><dd>Select the stake before starting a round.</dd><dt>Escape</dt><dd>Close the open panel.</dd></dl></article>`;
  }
  function settingsContent(state){return `<div class="m100-setting-list">${[['soundEffects','Sound Effects','♬'],['music','Background Music','♫']].map(([name,label,icon])=>`<label><span class="m100-setting-icon" aria-hidden="true">${icon}</span><span>${label}</span><input type="checkbox" name="${name}" ${state.settings[name]?'checked':''}></label>`).join('')}<div class="m100-fullscreen-setting"><span class="m100-setting-icon" aria-hidden="true">⛶</span><span>Full Screen</span>${button('fullscreen','',`role="switch" aria-label="Fullscreen" aria-checked="${doc.fullscreenElement===game}"`)}</div></div>`;}
  function historyContent(){
    if(Array.isArray(historyRecords))return historyRecords.length?`<div class="m100-history"><table><thead><tr><th>Round</th><th>Bet</th><th>Win</th></tr></thead><tbody>${historyRecords.map(row=>`<tr><td>${esc(row.roundId)}</td><td>${esc(row.bet)}</td><td>${esc(row.winAmount)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="m100-history-empty">No rounds yet.</p>';
    return typeof historyURL==='string'&&/^\/[A-Za-z0-9/_-]+$/.test(historyURL)?`<p class="m100-history-empty"><a href="${esc(historyURL)}">Open round history</a></p>`:'<p class="m100-history-empty">History is unavailable for this session.</p>';
  }
  function positionBetModal() {
    const panel=overlay.querySelector('.m100-bet-modal'),anchor=root.querySelector('.m100-bet-button');
    if(!panel||!anchor)return;
    const box=game.getBoundingClientRect(),buttonBox=anchor.getBoundingClientRect(),padding=12;
    if(!box.width||!box.height||!buttonBox.width)return;
    const width=Math.min(buttonBox.width*613/133,box.width-padding*2,(box.height-padding*2)*613/634);
    const height=width*634/613;
    const left=Math.max(padding,Math.min(buttonBox.right-box.left+buttonBox.width*1.2-width,box.width-width-padding));
    const top=Math.max(padding,Math.min(buttonBox.top-box.top+buttonBox.height/2-height,box.height-height-padding));
    Object.assign(panel.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
    panel.style.setProperty('--m100-bet-font',Math.max(14,width/613*64)+'px');
  }
  function decorateModal(){
    for(const cell of overlay.querySelectorAll('[data-paytable-symbol]')){
      if(!assets?.frames)continue;const name=M100_SYMBOL_FRAMES[cell.dataset.paytableSymbol],image=assets.frames.get(name),trim=assets.frames.metadata?.(name)?.spriteSourceSize??{x:0,y:0,w:image.width,h:image.height},scale=Math.min(144/trim.w,144/trim.h),context=cell.getContext('2d');context.clearRect(0,0,160,160);context.drawImage(image,80-(trim.x+trim.w/2)*scale,80-(trim.y+trim.h/2)*scale,image.width*scale,image.height*scale);
    }
    const betPanel=overlay.querySelector('.m100-bet-modal');
    if(betPanel){
      const popup=nativeURL('Bets/Popup'),row=nativeURL('Bets/Button'),active=nativeURL('Bets/ButtonActive');
      if(popup){betPanel.style.backgroundImage=`url("${popup}")`;betPanel.style.backgroundColor='transparent';}
      if(row)betPanel.style.setProperty('--m100-bet-row-image',`url("${row}")`);
      if(active)betPanel.style.setProperty('--m100-bet-row-active',`url("${active}")`);
      for(const [action,name] of [['bet-page-prev','Bets/Up'],['bet-page-next','Bets/Down']]){
        const arrow=betPanel.querySelector(`[data-action="${action}"]`),url=nativeURL(name);
        if(arrow&&url){arrow.style.backgroundImage=`url("${url}")`;arrow.classList.add('m100-native-bet-arrow');}
      }
      positionBetModal();
    }
    const quick=overlay.querySelector('.m100-quick-modal');
    if(quick){for(const [element,name] of [[quick,'QuickPlay/Popup'],[quick.querySelector('[data-action="quick-enable"]'),'QuickPlay/Confirm'],[quick.querySelector('.m100-quick-cancel'),'QuickPlay/Cancel']]){const url=nativeURL(name);if(url)element.style.backgroundImage=`url("${url}")`;}nativeButton(quick.querySelector('header [data-action="close"]'),'QuickPlay/Close');}
  }
  function renderModal(state){
    const key=[state.modal,state.phase,state.pending?.kind??'',state.gamble?.requestKey??'',infoTab,state.paytablePreviewBet,state.modal==='bet'?betOffset:''].join(':');
    if(key===modalKey)return;modalKey=key;
    if(!state.modal){overlay.hidden=true;overlay.classList.remove('m100-information-overlay');overlay.replaceChildren();if(priorFocus?.isConnected&&!priorFocus.disabled)priorFocus.focus({preventScroll:true});priorFocus=null;return;}
    if(overlay.hidden){priorFocus=doc.activeElement;overlay.hidden=false;}
    const isInfo=['menu','settings','rules'].includes(state.modal),tab=state.modal==='settings'?'settings':state.modal==='rules'?'rules':infoTab;
    const title=isInfo?'Game information':{bet:'Bet',auto:'Autoplay',quick:'QUICK PLAY',double:'Double win'}[state.modal];
    let content='';
    if(isInfo)content=tab==='settings'?settingsContent(state):tab==='history'?historyContent():rulesContent(state);
    if(state.modal==='bet'){
      const lastStart=Math.max(0,state.betLevels.length-betWindowSize);
      betOffset=Math.min(betOffset,lastStart);
      const choices=state.betLevels.slice(betOffset,betOffset+betWindowSize);
      content=`<div class="m100-bets" role="group" aria-label="Bet choices">${choices.map(bet=>button(`bet:${bet}`,`<span>${esc(bet)}</span><small>${esc(state.currency)}</small>`,`class="m100-bet-choice" aria-label="${esc(bet)} ${esc(state.currency)}" aria-pressed="${bet===state.selectedBet}"`)).join('')}</div>${button('bet-page-prev','<span aria-hidden="true">⌃</span>',`class="m100-bet-page m100-bet-prev" aria-label="Previous bet values" ${betOffset===0?'disabled':''}`)}${button('bet-page-next','<span aria-hidden="true">⌄</span>',`class="m100-bet-page m100-bet-next" aria-label="Next bet values" ${betOffset>=lastStart?'disabled':''}`)}`;
    }
    if(state.modal==='quick')content=`<div class="m100-quick-copy"><p>For faster play enable <span aria-hidden="true">⚡</span> turbo mode</p><p>You can disable the feature <span aria-hidden="true">⚡</span> from game menu</p></div><div class="m100-modal-actions">${button('quick-enable','ENABLE QUICK PLAY')}${button('close','NO','class="m100-quick-cancel"')}</div>`;
    if(state.modal==='auto')content=autoFields(state);
    if(state.modal==='double')content=`<p class="m100-double-amount">${esc(state.pendingWin)} <small>${esc(state.currency)}</small></p>${state.gamble?`<p class="m100-card-result">${esc(state.gamble.card.replace('Ace_','Ace of '))}</p>`:''}<p>Choose a colour</p><div class="m100-gamble">${button('red','♥ ♦','aria-label="Red"')}${button('black','♠ ♣','aria-label="Black"')}</div>${button('take','TAKE WIN','aria-label="Take win"')}<p class="m100-modal-error" role="alert"></p>`;
    if(state.phase==='RECOVERY_REQUIRED')content+=`<div class="m100-modal-recover">${button('recover','Recover current round')}</div>`;
    overlay.classList.toggle('m100-information-overlay',isInfo);
    const infoTabs=isInfo?`<footer class="m100-information-tabs" role="tablist" aria-label="Game information">${[['rules','Rules','?'],['settings','Settings','⚙'],['history','History','◴']].map(([name,label,icon])=>button(`info:${name}`,`<span aria-hidden="true">${icon}</span><span class="m100-info-tab-label">${label}</span>`,`role="tab" aria-label="${label}" aria-selected="${tab===name}"`)).join('')}</footer>`:'';
    const heading=isInfo?`<h2 class="m100-sr">Game information</h2><span class="m100-information-round">${state.round?`Round ${esc(state.round.roundId)}`:'Multi Hot 100'}</span>`:`<h2>${title}</h2>`;
    overlay.innerHTML=`<section class="m100-modal ${isInfo?'m100-info-modal':state.modal==='quick'?'m100-quick-modal':state.modal==='bet'?'m100-bet-modal':''}" role="dialog" aria-modal="true" aria-label="${title}" tabindex="-1"><header>${heading}${button('close',isInfo?'Close <span aria-hidden="true">×</span>':'×','aria-label="Close panel"')}</header><div class="m100-modal-body">${content}</div>${infoTabs}</section>`;
    if(state.pending){overlay.querySelectorAll('button,input,select').forEach(el=>el.disabled=el.dataset.action!=='recover'||state.inFlight);}
    decorateModal();
    queueMicrotask(()=>{if(disposed||overlay.hidden)return;const dialog=overlay.querySelector('[role="dialog"]');(focusables(dialog)[0]??dialog).focus({preventScroll:true});});
  }
  function changed(){latestError='';update();}
  async function action(name){
    if(disposed)return;
    const controls=controller.controls,state=controller.snapshot();
    safeCall(audio,'resume');
    try{
      if(name==='spin'){controls.stopAuto();safeCall({onAutoStop},'onAutoStop');await controller.spin();}
      else if(name==='take')await controller.take();
      else if(name==='red'||name==='black')await controller.gamble(name);
      else if(name==='recover')await controller.recover();
      else if(name==='close')controls.closeModal();
      else if(name==='exit'){await onExit?.();return;}
      else if(name==='sound'){const enabled=!(state.settings.soundEffects||state.settings.music);controls.setSetting('soundEffects',enabled);controls.setSetting('music',enabled);}
      else if(name==='quick'){if(state.settings.quick)controls.setSetting('quick',false);else controls.openModal('quick');}
      else if(name==='quick-enable'){controls.setSetting('quick',true);controls.closeModal();}
      else if(name==='fullscreen'){
        if(doc.fullscreenElement===game)await doc.exitFullscreen?.();else if(game.requestFullscreen)await game.requestFullscreen();
        controls.setSetting('fullscreenRequested',doc.fullscreenElement===game);
      }
      else if(name==='auto'&&state.auto.running){controls.stopAuto();await onAutoStop?.();}
      else if(name.startsWith('info:')){infoTab=name.slice(5);controls.openModal(infoTab==='history'?'menu':infoTab);}
      else if(['menu','settings','rules','bet','auto','double'].includes(name)){if(name==='menu')infoTab='rules';controls.openModal(name);}
      else if(name==='bet-page-prev'||name==='bet-page-next'){
        if(state.modal!=='bet'||state.pending)return;
        const delta=name==='bet-page-next'?betWindowSize:-betWindowSize;
        betOffset=Math.max(0,Math.min(betOffset+delta,Math.max(0,state.betLevels.length-betWindowSize)));modalKey=null;
      }
      else if(name.startsWith('bet:'))controls.selectBet(name.slice(4));
      else if(name==='preview-plus'||name==='preview-minus'){
        const index=state.betLevels.indexOf(state.paytablePreviewBet),next=index+(name==='preview-plus'?1:-1);
        if(state.betLevels[next]){controls.selectPaytablePreview(state.betLevels[next]);modalKey=null;}
      }
      else if(name==='auto-start'){
        if(!onAutoStart)return;
        const configuration={maximumRounds:Number(overlay.querySelector('[name="maximumRounds"]').value)};autoCount=configuration.maximumRounds;
        for(const field of Object.keys(autoLimits)){
          const enabled=overlay.querySelector(`[name="${field}Enabled"]`).checked;
          configuration[field]=enabled?cents(overlay.querySelector(`[name="${field}"]`).value):null;
          if(enabled&&!configuration[field]){overlay.querySelector('.m100-modal-error').textContent='Enter a positive amount for each enabled condition.';return;}
        }
        if(!controls.configureAuto(configuration))return;
        const request=controls.requestAutoStart();if(!request.accepted)return;
        for(const field of Object.keys(autoLimits))autoLimits[field]=configuration[field];
        try{await onAutoStart(request.hostScheduleRequested,{controller});}catch(error){controls.stopAuto();throw error;}
      }
      changed();
    }catch(error){message(name==='fullscreen'?'Fullscreen is unavailable.':'The current action could not be completed.');update();}
  }
  root.addEventListener('click',event=>{const el=event.target.closest('[data-action]');if(el&&root.contains(el)&&!el.disabled){event.preventDefault();void action(el.dataset.action);}else if(event.target===overlay)void action('close');},{signal});
  canvas.addEventListener('pointerdown',()=>game.focus({preventScroll:true}),{signal});
  root.addEventListener('change',event=>{
    if(disposed)return;const el=event.target;
    if(['soundEffects','music'].includes(el.name)){controller.controls.setSetting(el.name,el.checked);changed();}
    if(el.name.endsWith('Enabled')){const field=el.name.slice(0,-7),input=overlay.querySelector(`[name="${field}"]`);if(input)input.disabled=!el.checked;}
  },{signal});
  win.addEventListener('resize',()=>{if(controller.snapshot().modal==='bet'){modalKey=null;update();}},{signal});
  game.addEventListener('keydown',event=>{
    if(disposed||event.isComposing)return;const state=controller.snapshot();
    if(event.key==='Escape'&&state.modal){event.preventDefault();void action('close');return;}
    if(event.key==='Tab'&&state.modal){const dialog=overlay.querySelector('[role="dialog"]'),items=focusables(dialog);if(!items.length){event.preventDefault();dialog.focus();return;}const first=items[0],last=items.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}}
    if((event.code==='Space'||event.key===' ')&&!event.repeat&&!state.modal&&!event.target.closest('input,select,textarea,button,a')){event.preventDefault();void action('spin');}
  },{signal});
  doc.addEventListener('visibilitychange',()=>{controller.setHidden(doc.hidden);if(doc.hidden){safeCall(audio,'suspend');safeCall({onAutoStop},'onAutoStop');}else safeCall(audio,'resume');update();},{signal});
  doc.addEventListener('fullscreenchange',()=>{controller.controls.setSetting('fullscreenRequested',doc.fullscreenElement===game);update();},{signal});
  function tick(now){
    if(disposed)return;
    const state=controller.snapshot(),key=state.pending?.requestKey??(state.phase==='PRESENTING'?state.round?.requestKey:null);
    if(key!==animationKey){animationKey=key;startedAt=key?now:null;}
    if(presentationClock&&key&&!state.hidden&&!state.presentationRecoveryRequired){
      try{const frame=presentationClock({now,elapsedMs:Math.max(0,now-startedAt),state,presentation:controller.presentation.snapshot()});if(frame)controller.frame(frame);}catch{message('The current presentation could not be displayed.');}
    }
    update();raf=win.requestAnimationFrame(tick);
  }
  raf=win.requestAnimationFrame(tick);update();
  return Object.freeze({update,canvas,element:game,frame(input){if(disposed)return null;const result=controller.frame(input);update();return result;},reportError(){message('The current action could not be completed. Recover the round to continue.');update();},destroy(){if(disposed)return;disposed=true;abort.abort();if(raf!==null)win.cancelAnimationFrame(raf);safeCall(audio,'suspend');safeCall(audio,'dispose');controller.dispose();root.replaceChildren();}});
}
