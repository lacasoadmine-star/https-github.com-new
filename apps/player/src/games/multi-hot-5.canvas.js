// Game #1: Multi Hot 5 Canvas prototype. No real-money settlement is performed here.
// Official reel strips, paytable, audio and server round contract must be verified before live enablement.
export function mountMultiHot5(root, {roundProvider} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 390; canvas.height = 550;
  canvas.style.cssText = 'width:100%;max-width:480px;touch-action:manipulation;display:block;margin:auto';
  canvas.setAttribute('aria-label','Multi Hot 5 game reels');
  root.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');
  const symbols = ['🍒','🍋','🍊','🍇','🔔','⭐','7'];
  const state = {reels:Array.from({length:3},()=>Array.from({length:3},()=>symbols[Math.floor(Math.random()*symbols.length)])),bet:1,busy:false,auto:false,sound:false,stopped:false,credits:null,win:0,status:'PRACTICE ONLY',settings:false};
  let timer=null, audio=null, destroyed=false;
  const buttons = [{name:'BET -',x:15,y:460,w:82,h:55},{name:'BET +',x:105,y:460,w:82,h:55},{name:'SPIN',x:195,y:460,w:90,h:55},{name:'STOP',x:293,y:460,w:82,h:55},{name:'AUTO',x:15,y:520,w:82,h:27},{name:'SOUND',x:105,y:520,w:82,h:27},{name:'SETTINGS',x:195,y:520,w:180,h:27}];
  function beep(freq=440){if(!state.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.value=.025;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.07)}catch{}}
  function draw(){
    ctx.fillStyle='#170e26';ctx.fillRect(0,0,390,550);
    ctx.fillStyle='#ffcf60';ctx.textAlign='center';ctx.font='bold 27px sans-serif';ctx.fillText('MULTI HOT 5',195,42);
    ctx.font='15px sans-serif';ctx.fillText('Game #1 • '+state.status,195,70);
    ctx.fillStyle='#33203c';ctx.fillRect(14,93,362,325);
    for(let c=0;c<3;c++)for(let r=0;r<3;r++){const x=24+c*118,y=106+r*100;ctx.fillStyle='#fff6dd';ctx.fillRect(x,y,106,90);ctx.fillStyle='#151019';ctx.font='48px sans-serif';ctx.fillText(state.reels[c][r],x+53,y+63)}
    ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('BET '+state.bet+' ETB   |   WIN '+state.win,195,445);
    for(const b of buttons){ctx.fillStyle=b.name==='SPIN'?'#257e56':'#64426c';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.fillText(b.name,b.x+b.w/2,b.y+b.h/2+5)}
    if(state.settings){ctx.fillStyle='rgba(0,0,0,.9)';ctx.fillRect(30,165,330,160);ctx.fillStyle='white';ctx.font='17px sans-serif';ctx.fillText('Settings • Practice only',195,215);ctx.fillText('Tap SETTINGS to close',195,260)}
  }
  function randomize(){for(let c=0;c<3;c++)for(let r=0;r<3;r++)state.reels[c][r]=symbols[Math.floor(Math.random()*symbols.length)];draw()}
  async function spin(){
    if(state.busy||destroyed)return;
    state.busy=true;state.stopped=false;state.win=0;state.status='SPINNING';draw();beep(300);
    const id=setInterval(randomize,65);timer=id;
    try{
      // No local random outcome is ever used for cash settlement.
      const result=roundProvider?await roundProvider({bet:state.bet,game:'multi-hot-5',mode:'practice'}):null;
      await new Promise(resolve=>{const start=performance.now();const tick=()=>{if(destroyed||state.stopped||performance.now()-start>=950)resolve();else requestAnimationFrame(tick)};tick()});
      if(destroyed)return;
      if(result?.reels){if(!Array.isArray(result.reels)||result.reels.length!==3||result.reels.some(col=>!Array.isArray(col)||col.length!==3))throw Error('Invalid reels');state.reels=result.reels;state.win=Number(result.win)||0;state.status='SERVER PRACTICE RESULT'}
      else {state.status='VISUAL DEMO • NO PAYOUT';state.win=0}
      beep(550);
    }catch(e){state.status='ROUND REJECTED';state.win=0}
    finally{clearInterval(id);timer=null;state.busy=false;draw();if(state.auto&&!destroyed&&state.status!=='ROUND REJECTED')setTimeout(()=>{if(state.auto&&!state.busy&&!destroyed)spin()},600)}
  }
  function action(name){
    if(name==='STOP'){state.stopped=true;return}
    if(name==='SOUND'){state.sound=!state.sound;draw();return}
    if(name==='SETTINGS'){state.settings=!state.settings;draw();return}
    if(name==='AUTO'){state.auto=!state.auto;draw();return}
    if(state.busy||state.settings)return;
    if(name==='BET -')state.bet=Math.max(1,state.bet-1);
    if(name==='BET +')state.bet=Math.min(40000,state.bet+1);
    if(name==='SPIN')spin();
    draw();
  }
  const onPointer=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*390/r.width,y=(e.clientY-r.top)*550/r.height;const b=buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);if(b)action(b.name)};
  const onVisibility=()=>{if(document.hidden){state.auto=false;state.stopped=true;audio?.suspend()}else if(state.sound)audio?.resume()};
  canvas.addEventListener('pointerdown',onPointer);document.addEventListener('visibilitychange',onVisibility);draw();
  return {state,spin,stop:()=>action('STOP'),destroy(){destroyed=true;state.auto=false;state.stopped=true;clearInterval(timer);canvas.removeEventListener('pointerdown',onPointer);document.removeEventListener('visibilitychange',onVisibility);canvas.remove();audio?.close()}};
}
