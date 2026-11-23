/**
 * Burn Wilds: accessible native DOM control shell.
 * Layout/artwork parity is NOT asserted without a licensed, game-specific
 * capture; this is a functional new ZPLAY control layer, not a provider clone.
 * No third-party demo frames, no fabricated monetary state.
 */
const fail=code=>{throw Object.assign(new Error(code),{code});};
const cents=value=>Number.isSafeInteger(value)?(value/100).toFixed(2)+' ETB':'—';
const safeText=value=>typeof value==='string'?value:'';
const actions=Object.freeze(['spin','stop','bet','autoplay','sound','settings',
  'paytable','take-win','turbo','close','start-auto','cancel-auto','set-bet']);

export function mountBurnWildsGameShell({root,document,controls,heading='Multi Hot 5 Burn Wilds'}={}) {
  if(!root || typeof root.replaceChildren!=='function' ||
    typeof root.addEventListener!=='function'|| typeof root.removeEventListener!=='function' ||
    typeof root.contains!=='function'||!document||typeof document.createElement!=='function' ||
    !controls||!['view','spin','stop','setBet','startAutoplay','cancelAutoplay',
      'toggleMute','openPanel','closePanel'].every(name=>typeof controls[name]==='function'))
    fail('BURN_SHELL_DEPENDENCIES_INVALID');
  const el=(tag,css,text='')=>{
    const item=document.createElement(tag);
    if(css)item.className=css;
    item.textContent=text;
    return item;
  };
  let statusMessage='',modal=null,disposed=false,loadToken=0;
  const wrapper=el('section','burn-game-shell');wrapper.setAttribute('aria-label',heading);
  const title=el('h2','burn-heading',heading),status=el('p','burn-game-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const frame=el('div','burn-game-frame');
  frame.setAttribute('data-burn-reels','');
  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-label','Burn Wilds native slot reel presentation');
  const fallback=el('p','burn-asset-status',
    'Game-specific authorised artwork and recorded reference required before cash play.');
  frame.append(canvas,fallback);
  const financial=el('div','burn-game-balances');
  const balance=el('output','burn-game-balance');
  const bet=el('output','burn-game-bet');
  financial.append(balance,bet);
  const tools=el('nav','burn-game-controls');tools.setAttribute('aria-label','Game controls');
  const buttonMap=new Map();
  for(const [key,label] of [
    ['spin','SPIN'],['stop','STOP'],['bet','BET'],['autoplay','AUTO'],
    ['turbo','TURBO'],['take-win','TAKE WIN'],['sound','SOUND'],
    ['settings','SETTINGS'],['paytable','PAYTABLE']]) {
    const b=el('button','burn-button burn-'+key,label);
    b.setAttribute('type','button');b.dataset.burnAction=key;
    b.setAttribute('aria-label',label);buttonMap.set(key,b);tools.append(b);
  }
  const popover=el('div','burn-game-dialog');
  popover.setAttribute('role','dialog');popover.setAttribute('aria-modal','false');
  popover.setAttribute('aria-label','Game options');
  popover.hidden=true;
  wrapper.append(title,status,frame,financial,tools,popover);
  root.replaceChildren(wrapper);

  function showButton(action,text,data){
    const b=el('button','burn-menu-item',text);
    b.setAttribute('type','button');b.dataset.burnAction=action;
    if(data!==undefined)b.dataset.value=String(data);
    return b;
  }
  function render() {
    if(disposed)return;
    const state=controls.view();
    balance.textContent='BALANCE '+cents(state.balanceMinor);
    bet.textContent='BET '+cents(state.betMinor);
    const spinReady=state.canSpin && !state.needsRecovery;
    buttonMap.get('spin').disabled=!spinReady;
    buttonMap.get('stop').disabled=!['SUBMITTING','ANIMATING'].includes(state.phase);
    buttonMap.get('bet').disabled=!state.canBet;
    buttonMap.get('autoplay').disabled=!spinReady || state.autoplayRemaining>0;
    // These controls are disabled rather than displayed as bogus functionality
    // until actual provider-specific rule/cash endpoints are confirmed.
    buttonMap.get('take-win').disabled=true;
    buttonMap.get('turbo').disabled=true;
    buttonMap.get('paytable').disabled=true;
    buttonMap.get('sound').textContent=state.muted?'SOUND OFF':'SOUND ON';
    buttonMap.get('settings').disabled=false;
    status.textContent=statusMessage||(state.needsRecovery?'Existing round must be recovered; do not place another bet.':
      state.phase==='BLOCKED'?'Game unavailable: authenticated session required.':
      spinReady?'Ready for an authorised server-settled spin.':
      'Cash SPIN disabled until the licensed game and existing ETB server are verified.');
    if(modal===null){popover.hidden=true;popover.replaceChildren();return;}
    popover.hidden=false;popover.replaceChildren();
    const caption=el('h3','burn-dialog-title',
      modal==='bet'?'Select ETB bet':modal==='autoplay'?'Autoplay rounds':
      modal==='settings'?'Settings':'Game information');
    const close=showButton('close','Close');
    popover.append(caption,close);
    if(modal==='bet'){
      for(const amount of controls.controller?.snapshot()?.betLevelsMinor??[]){
        popover.append(showButton('set-bet',cents(amount),amount));
      }
    }else if(modal==='autoplay'){
      for(const count of state.autoplayCounts??[])
        popover.append(showButton('start-auto',count+' spins',count));
      if(state.autoplayRemaining>0)popover.append(showButton('cancel-auto','Stop autoplay'));
    }else if(modal==='settings'){
      popover.append(showButton('sound',state.muted?'Enable sound':'Mute sound'));
      popover.append(el('p','burn-settings-notice',
        'Turbo, gamble and sound levels require captured game-specific settings and a confirmed server contract.'));
    }else if(modal==='paytable'){
      popover.append(el('p','burn-paytable-unavailable',
        'Officially verified rules and payouts are not installed. No made-up paytable is shown.'));
    }
  }
  async function execute(action,value){
    if(disposed||!actions.includes(action))return false;
    try{
      if(action==='spin')await controls.spin();
      else if(action==='stop')controls.stop();
      else if(action==='bet')modal='bet';
      else if(action==='autoplay')modal='autoplay';
      else if(action==='settings')modal='settings';
      else if(action==='sound')controls.toggleMute();
      else if(action==='close')modal=null;
      else if(action==='set-bet') {
        controls.setBet(Number(value));modal=null;
      }else if(action==='start-auto'){
        modal=null;await controls.startAutoplay(Number(value));
      }else if(action==='cancel-auto')controls.cancelAutoplay();
      else if(action==='paytable')modal='paytable';
      else return false;
      statusMessage='';render();return true;
    }catch(e){statusMessage=e.code||'BURN_INPUT_UNAVAILABLE';render();return false;}
  }
  function handleClick(event){
    let node=event.target;
    while(node && node!==wrapper && !node.dataset?.burnAction)node=node.parentNode;
    if(!node?.dataset?.burnAction||!wrapper.contains(node)||node.disabled)return;
    void execute(node.dataset.burnAction,node.dataset.value);
  }
  function keyDown(event){
    if(disposed)return;
    if(typeof controls.keyboard==='function'){
      const processed=controls.keyboard(event);
      if(processed)render();
    }
  }
  const previousNotify=controls.notify;
  if(typeof previousNotify==='function')
    controls.notify=(state)=>{previousNotify(state);render();};
  wrapper.addEventListener('click',handleClick);
  document.addEventListener?.('keydown',keyDown);

  render();
  return Object.freeze({
    element:wrapper,canvas,
    render,execute,button:action=>buttonMap.get(action)??null,
    setAssetReady(ready){
      fallback.hidden=ready===true;
      return ready===true;
    },
    dispose(){
      if(disposed)return;
      disposed=true;
      wrapper.removeEventListener('click',handleClick);
      document.removeEventListener?.('keydown',keyDown);
      if(typeof previousNotify==='function')controls.notify=previousNotify;
      loadToken++;
    }
  });
}
