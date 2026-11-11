#!/usr/bin/env python3
"""Ten official instant demos, native mobile touch and open-shadow DOM controls."""
import asyncio,json,re,runpy,time,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
C=runpy.run_path(str(ROOT/'tools/capture_demos.py'),run_name='instant_reference');Session=C['Session'];save_json=C['save_json'];now=C['now']
IDS=['jetx','balloonx','plinko-x-classic','world-champion-x','chicken-ways','cheesy-road','fortune-catch','chicken-highway','carx','cai-balao-cappadocia']
UA='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
INTRO=['.sound-popup-content-buttons .no','.info-button','.how-to-play-ok','.how-to-play-popup .ok-button','.info-on-start-accept','.info-on-start-parent .ok','.Accept','.close-how-to-play','.close-how-toplay','text=OK','text=I UNDERSTAND']
PLAY={
 'jetx':['button.bet-button.place-bet','[data-action="bet"]'],
 'balloonx':['#bet-0.place-bet','.bet.place-bet'],
 'plinko-x-classic':['.place-bet-button'],
 'world-champion-x':['.start-button','.shoot-button','.main-button','.bet-button','text=START','text=BET','text=KICK'],
 'chicken-ways':['.Front','.Up','.Down'],
 'cheesy-road':['.Front','.Up','.Down','.start-button'],
 'fortune-catch':['.main-button.make-bet'],
 'chicken-highway':['.start-button.main-button'],
 'carx':['#bet-0.place-bet','.bet.place-bet','.main-button.bet'],
 'cai-balao-cappadocia':['.Bet','.Start','.Play','.bet-button','text=BET','text=PLAY','text=START'],
}
CASH=['button.cash-out','.bet.cash-out','#bet-0.cash-out','.cashout-button:not(.disable-main-button)','.cash-out-button','.collect-button','.main-button.cashout','.CashOut','.Cashout','.Collect','text=CASHOUT','text=CASH OUT','text=COLLECT']
FIND=r'''arg=>{
 const {selectors,skipIntro}=arg;
 const roots=[document];for(let i=0;i<roots.length&&i<80;i++)for(const e of roots[i].querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);
 const at=(x,y)=>{let e=document.elementFromPoint(x,y);for(let i=0;i<8&&e?.shadowRoot;i++){const n=e.shadowRoot.elementFromPoint(x,y);if(!n||n===e)break;e=n;}return e;};
 for(const selector of selectors)for(const root of roots){let list;
  try{list=selector.startsWith('text=')?Array.from(root.querySelectorAll('button,a,[role=button],.button,.main-button,.Bet,.Start,.Collect,.Cashout,.CashOut')).filter(e=>{const t=(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').toUpperCase(),w=selector.slice(5);return t===w||t.startsWith(w+' ')}):root.querySelectorAll(selector);}catch{continue;}
  for(const e of list){const r=e.getBoundingClientRect(),s=getComputedStyle(e),x=r.x+r.width/2,y=r.y+r.height/2;
   if(skipIntro&&e.closest('.info-on-start,.info-onstart,.info-on-start-parent,.how-to-play,.how-to-play-popup,.howtoplay,.howtoplay-parent,.how-to-play-container'))continue;
   if(r.width<3||r.height<3||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||e.disabled||e.getAttribute('aria-disabled')==='true'||/\b(disabled|disable|disable-main-button)\b/.test(String(e.className)))continue;
   if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;const top=at(x,y);if(top!==e&&!e.contains(top))continue;
   return {x,y,selector,shadow:root!==document,tag:e.tagName,id:e.id,classes:String(e.className),text:(e.innerText||'').slice(0,150),aria:e.getAttribute('aria-label'),box:{x:r.x,y:r.y,width:r.width,height:r.height}};
  }
 }return null;
}'''
STATE=r'''()=>{
 const prim=o=>{const r={};if(!o)return r;for(const[k,v]of Object.entries(o)){if(v===null||['number','boolean','string'].includes(typeof v))r[k]=typeof v==='string'?v.slice(0,160):v;else if(Array.isArray(v)&&v.length<120&&v.every(x=>x===null||['number','boolean','string'].includes(typeof x)))r[k]=v;}return r;};
 const out={url:location.href,viewport:{width:innerWidth,height:innerHeight},controls:[],text:(document.body?.innerText||'').slice(0,9000)};
 const roots=[document];for(let i=0;i<roots.length&&i<80;i++)for(const e of roots[i].querySelectorAll('*'))if(e.shadowRoot)roots.push(e.shadowRoot);
 for(const root of roots)for(const e of root.querySelectorAll('button,a,input,[role=button],.main-button,.Front,.Up,.Down,.Accept,.Collect,.CashOut,.Cashout,.Bet,.Start,.Play,.Ok,.Cancel,[class*="bet-button"],[class*="start-button"],[class*="cashout"],[class*="collect"],[class*="button"]')){const r=e.getBoundingClientRect(),s=getComputedStyle(e);if(r.width<2||r.height<2||s.display==='none'||s.visibility==='hidden')continue;out.controls.push({tag:e.tagName,id:e.id,classes:String(e.className),text:(e.innerText||'').slice(0,100),value:e.value,disabled:!!e.disabled,shadow:root!==document,box:{x:r.x,y:r.y,width:r.width,height:r.height}});if(out.controls.length>220)break;}
 if(typeof gameClass!=='undefined'&&gameClass)out.instant={...prim(gameClass),boardInfo:prim(gameClass.boardInfo),info:prim(gameClass.info),user:prim(gameClass.user)};
 if(typeof gameInfo!=='undefined'&&gameInfo)out.gameInfo={...prim(gameInfo),user:prim(gameInfo.user)};
 if(typeof slot!=='undefined'&&slot)out.slot={info:prim(slot.info),data:prim(slot.data),state:prim(slot.state)};
 return out;
}'''
class MobileSession(Session):
 async def deep_find(self,selectors,skip_intro=False):
  for f in self.page.frames:
   if not self.is_game_frame(f):continue
   try:
    point=await asyncio.wait_for(f.evaluate(FIND,{'selectors':selectors,'skipIntro':skip_intro}),timeout=3)
    if point:return f,point
   except Exception:pass
  return None
 async def tap(self,label,selectors,delay=.25):
  found=await self.deep_find(selectors,skip_intro=label in['native-play','native-cashout','native-move'])
  if not found:return False
  f,v=found;box=await(await f.frame_element()).bounding_box()if f.parent_frame else{'x':0,'y':0}
  await self.page.touchscreen.tap(box['x']+v['x'],box['y']+v['y']);await asyncio.sleep(delay)
  self.actions.append({'label':label,'at':now(),'method':'native_mobile_touchscreen_tap','frame':f.url,'control':v})
  # Some older public demos bind only mousedown for the welcome overlay.
  # Repeat only an actual still-visible welcome control, never a bet or collect.
  if label=='dismiss-welcome':
   remaining=await self.deep_find([v['selector']])
   if remaining:
    rf,rv=remaining;rbox=await(await rf.frame_element()).bounding_box()if rf.parent_frame else{'x':0,'y':0}
    await self.page.mouse.click(rbox['x']+rv['x'],rbox['y']+rv['y']);await asyncio.sleep(.2)
    self.actions.append({'label':'legacy-welcome-mouse','at':now(),'method':'native_mouse_click_on_still_visible_welcome','frame':rf.url,'control':rv})
  return True
 async def deep_state(self):
  states=[]
  for f in self.page.frames:
   if not self.is_game_frame(f):continue
   try:states.append(await asyncio.wait_for(f.evaluate(STATE),timeout=3))
   except Exception:pass
  return states

def balances(states):
 values=[]
 def walk(o,path=''):
  if isinstance(o,dict):
   for k,v in o.items():
    if 'balance'in k.lower()and isinstance(v,(int,float)):values.append([path+'.'+k,v])
    elif isinstance(v,dict):walk(v,path+'.'+k)
 for f in states:
  for control in f.get('controls',[]):
   text=control.get('text','').strip()
   if 'btn-secondary' in control.get('classes','') and re.fullmatch(r'[$€£]?\s*[0-9,]+\.[0-9]{2}',text):
    values.append(['visible_balance_button',float(re.sub(r'[^0-9.]','',text))])
  for k in ['instant','gameInfo','slot']:
   if k in f:walk(f[k],k)
 return sorted(values)

async def run(p,game):
 browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 s=MobileSession(browser,game);tag=str(int(time.time()*1000));out=s.directory/'10-layout-mobile';out.mkdir(parents=True,exist_ok=True)
 s.context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent=UA,record_video_dir=str(out/'batch2-recordings'),record_video_size={'width':390,'height':844})
 await s.context.add_init_script("setInterval(()=>{try{if(typeof PIXI!=='undefined'){if(PIXI.Ticker?.shared)PIXI.Ticker.shared.maxFPS=20;if(PIXI.Ticker?.system)PIXI.Ticker.system.maxFPS=20;}if(typeof gameClass!=='undefined'&&gameClass?.canvas?.canvas?.ticker)gameClass.canvas.canvas.ticker.maxFPS=20;}catch{}},500)");s.page=await s.context.new_page();s.page.set_default_timeout(4000);s.page.on('response',s.queue_response);s.ws=[]
 def ws_open(ws):
  def recv(payload):
   if len(s.ws)<3000:s.ws.append({'elapsed':round(time.monotonic()-s.origin,3),'url':ws.url,'payload':payload.decode(errors='replace')if isinstance(payload,bytes)else str(payload)[:20000]})
  ws.on('framereceived',recv)
 s.page.on('websocket',ws_open)
 report={'game':game,'started_at':now(),'local_render_fps_cap':20,'scope':'Fresh official DMO only. Genuine native mobile touch; open-shadow DOM inspected without calling internal game actions. No player money, account or ledger writes.','provider_blocked':False,'play_clicked':False,'cashout_clicked':False,'account_state_change':False,'deep_states':[],'errors':[]}
 async def shot(label):
  await s.capture('batch2-'+tag+'-'+label);report['deep_states'].append({'label':label,'states':await s.deep_state()})
 try:
  await s.page.goto(game['demo_url'],wait_until='domcontentloaded',timeout=45000)
  ready_started=time.monotonic()
  for _ in range(28):
   if time.monotonic()-ready_started>38:break
   await asyncio.sleep(.8)
   await s.tap('dismiss-welcome',INTRO,delay=.1)
   if await s.deep_find(PLAY[game['id']],skip_intro=True):break
  await shot('ready-controls')
  text=' '.join(f.get('text','')for d in report['deep_states']for f in d['states']).lower()
  if any(t in text for t in ['you can create up to','your session has expired','game is not available','access denied']):report['provider_blocked']=True;return report
  before=await s.deep_state();report['balances_before']=balances(before)
  report['play_clicked']=await s.tap('native-play',PLAY[game['id']]);await shot('play-submitted')
  if report['play_clicked']:
   # Step games require a second native move before Collect becomes available.
   if game['id']in ['chicken-ways','cheesy-road','chicken-highway','world-champion-x']:
    await asyncio.sleep(1)
    if not await s.deep_find(CASH):await s.tap('native-move',['.Front','.Up','.jump-button','.start-button.main-button','.shoot-button'])
   for i in range(0 if game['id']=='plinko-x-classic' else 60):
    if await s.tap('native-cashout',CASH,delay=.15):report['cashout_clicked']=True;break
    if i in[0,5,12]:await shot('round-observation-'+str(i))
    await asyncio.sleep(.7)
  await asyncio.sleep(1);await shot('round-response')
  after=await s.deep_state();report['balances_after']=balances(after)
  report['account_state_change']=bool(report['balances_before']and report['balances_after']and report['balances_before']!=report['balances_after'])
  # Observe available native menus and close them through their rendered controls.
  for label,selectors in [('bet-settings',['.bet-arrow','.BetArrow','.ChooseBet','.bet-amount-button']),('autoplay-settings',['[aria-label="Autoplay"]','.autoplay-icon','.autoplay-button','.Autoplay']),('game-menu',['[aria-label="Menu"]','.menu-icon-bt','.menu-icon','.menu-icon-without-line.open-menu','[data-menu-toggle]']),('history',['.my-bets-button','[data-popup-open="my-bets"]','[data-page="history"]'])]:
   if await s.tap(label,selectors):
    await shot(label)
    await s.tap('close-overlay',['.menu-popup-close','.autoplay-close','.close-autoplay','.close-popup-icon','.close','.Cancel','button[aria-label="Close"]'])
  while len(s.captures)<10:await asyncio.sleep(.3);await shot('observed-frame-'+str(len(s.captures)+1))
  await s.page.set_viewport_size({'width':844,'height':390});await asyncio.sleep(.6);await shot('phone-landscape')
  await s.tap('exit-menu',['.menu-icon-bt','.menu-icon','.menu-icon-without-line.open-menu','[aria-label="Menu"]'])
  report['native_exit_clicked']=await s.tap('native-exit',['.menu-popup-exit-game','.game-exit-bt'])
 except Exception as e:report['errors'].append(type(e).__name__+': '+str(e)[:350])
 finally:
  if s.tasks:
   _,pending=await asyncio.wait(list(s.tasks),timeout=15)
   for t in pending:t.cancel()
  report.update({'finished_at':now(),'actions':s.actions,'captures':s.captures,'assets':s.assets,'session_errors':s.errors,'websocket_frames':s.ws})
  save_json(out/'batch2-attempts'/tag/'control-session.json',report)
  target=out/'batch2-control-session.json'
  prior=json.loads(target.read_text())if target.exists()else{}
  def score(r):return(r.get('account_state_change',False),r.get('cashout_clicked',False),r.get('play_clicked',False),len(r.get('captures',[])))
  if score(report)>=score(prior):
   save_json(target,report);save_json(s.directory/'13-live-build-specification/batch2-native-profile.json',report)
  try:await asyncio.wait_for(s.context.close(),timeout=12)
  except Exception:pass
  try:await asyncio.wait_for(browser.close(),timeout=8)
  except Exception:pass
 return report

async def main():
 games={g['id']:g for g in json.loads((ROOT/'catalogues/smartsoft-games.json').read_text())['games']};semaphore=asyncio.Semaphore(2)
 async with async_playwright()as p:
  async def one(gid):
   async with semaphore:
    implementation=runpy.run_path(str(Path(__file__).resolve()),run_name='batch2_latest_implementation')
    try:r=await asyncio.wait_for(implementation['run'](p,games[gid]),timeout=165)
    except Exception as e:r={'provider_blocked':False,'play_clicked':False,'errors':[str(e)]}
    print(json.dumps({'id':gid,'provider_blocked':r.get('provider_blocked'),'play_clicked':r.get('play_clicked'),'cashout_clicked':r.get('cashout_clicked'),'account_state_change':r.get('account_state_change'),'screenshots':len(r.get('captures',[])),'errors':r.get('errors')}),flush=True)
  await asyncio.gather(*(one(gid)for gid in(sys.argv[1:]or IDS)))
if __name__=='__main__':asyncio.run(main())
