#!/usr/bin/env python3
"""Native mobile control audit for ten official demos; never touches player money."""
import asyncio,json,runpy,time,sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
CAPTURE=runpy.run_path(str(ROOT/'tools/capture_demos.py'),run_name='batch10_reference')
Session=CAPTURE['Session'];save_json=CAPTURE['save_json'];now=CAPTURE['now']
IDS=['multi-hot-20','multi-hot-40','multi-hot-100','multi-hot-5-deluxe','burning-ice-41','blazing-hot-10','burning-ice-40','hab','hot-samba','boca-jamba-10']
UA='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
DETAIL=r'''()=>{
 const prim=o=>{const r={};if(!o)return r;for(const[k,v]of Object.entries(o)){if(v===null||["number","string","boolean"].includes(typeof v))r[k]=v;else if(Array.isArray(v)&&v.length<500&&v.every(x=>typeof x!=="object"))r[k]=v;}return r;};
 const pick=(o,names)=>Object.fromEntries(names.filter(k=>o&&o[k]!==undefined).map(k=>[k,o[k]]));
 const out={url:location.href};
 if(typeof slot!=="undefined"&&slot){out.slot={info:prim(slot.info),box:pick(slot.box?.config||slot.boxes?.config,["row","column","count","defaults","width","height","left","top","mask","freeSpinIndex","multiplierIndex"])};out.slotRendering={spinning:slot.box?.spinning,spinOption:slot.buttons?.buttons?.spin?.option};out.buttons=Object.entries(slot.buttons?.buttons||{}).map(([name,b])=>({name,option:b.option,mode:b.mode,status:b.status,imageVisible:b.image?.worldVisible,containerVisible:b.container?.worldVisible,imageInteractive:b.image?.interactive,containerInteractive:b.container?.interactive}));}
 if(typeof gameInfo!=="undefined"&&gameInfo){out.legacy={user:prim(gameInfo.user),boxes:pick(gameInfo.boxes,["row","column","count","default","visibleBoxes","width","height"]),settings:prim(gameInfo.settings),buttons:Object.entries(gameInfo.buttons||{}).map(([name,b])=>({name,status:b.status,imageVisible:b.image?.worldVisible,containerVisible:b.container?.worldVisible}))};}
 if(typeof game!=="undefined"&&game){out.resources={name:game.name,url:prim(game.url),images:Object.fromEntries(Object.entries(game.images||{}).map(([k,v])=>[k,pick(v,["url","sprite"])])),sounds:Object.fromEntries(Object.entries(game.sounds||{}).map(([k,v])=>[k,pick(v,["url"])]))};}
 return out;
}'''
TIMING=r'''()=>{
 if(typeof slot!=='undefined'&&slot?.buttons?.buttons?.spin)return {kind:'slot',spinning:slot.box?.spinning??null,spinOption:slot.buttons?.buttons?.spin?.option??null,balance:slot.info?.balance,win:slot.win?.info?.totalWin,rendered:!!(slot.buttons.buttons.spin.container||slot.buttons.buttons.spin.image)?.worldVisible};
 if(typeof gameInfo!=='undefined')return {kind:'legacy',status:gameInfo.buttons?.Spin?.status,user:gameInfo.user,spin:gameInfo.spin??gameInfo.spinning,gameState:gameInfo.gameState,rendered:!!gameInfo.buttons?.Spin?.image?.worldVisible,resourceLoaded:gameInfo.resourceLoaded};
 return null;
}'''

async def details(s):
 out=[]
 for f in s.page.frames:
  if not s.is_game_frame(f):continue
  try:
   v=await asyncio.wait_for(f.evaluate(DETAIL),timeout=4)
   if len(v)>1:out.append(v)
  except Exception:pass
 return out

async def timing(s):
 for f in s.page.frames:
  if not s.is_game_frame(f):continue
  try:
   value=await asyncio.wait_for(f.evaluate(TIMING),timeout=2)
   if value:return value
  except Exception:pass
 return None

async def capture(s,label):return await s.capture('batch10-'+getattr(s,'batch10_tag','session')+'-'+label)

async def native_click(s,name,capture=False,label=None,delay=.15,required_status=None):
 for frame in s.page.frames:
  if not s.is_game_frame(frame):continue
  try:
   point=await asyncio.wait_for(frame.evaluate(r'''name=>{
    let b,c,modern=false;
    if(name==='AutoPlayClose'&&typeof slot!=='undefined'&&slot?.autoPlay?.close){b={container:slot.autoPlay.close,option:'Close'};c=slot.canvas?.canvas?.view;modern=true;}
    if(!b&&typeof slot!=='undefined'&&slot?.buttons?.buttons){const key=Object.keys(slot.buttons.buttons).find(k=>k.toLowerCase()===name.toLowerCase());b=slot.buttons.buttons[key];c=slot.canvas?.canvas?.view;modern=!!b;}
    if(!b&&typeof gameInfo!=='undefined')b=gameInfo?.buttons?.[name];
    if(!b)return null;const image=modern?(b.container||b.image):(b.image||b.container);
    if(!image?.worldVisible||(!image.interactive&&image.eventMode!=='static'&&!b.image?.interactive&&!b.container?.interactive))return null;
    const bounds=image.getBounds();c=c||document.querySelector('canvas');if(!c||!bounds)return null;
    const r=c.getBoundingClientRect(),x=r.x+(bounds.x+bounds.width/2)*r.width/c.width,y=r.y+(bounds.y+bounds.height/2)*r.height/c.height;
    if(x<0||y<0||x>innerWidth||y>innerHeight||document.elementFromPoint(x,y)!==c)return null;
    return {x,y,status:b.option||b.mode||b.status,modern,bounds:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},imageVisible:b.image?.worldVisible,containerVisible:b.container?.worldVisible};
   }''',name),timeout=3)
   if not point or required_status and point.get('status','').lower()!=required_status.lower():continue
   box=await(await frame.frame_element()).bounding_box()if frame.parent_frame else{'x':0,'y':0}
   await s.page.mouse.click(box['x']+point['x'],box['y']+point['y']);await asyncio.sleep(delay)
   s.actions.append({'label':label or name,'at':now(),'method':'native_container_pointer_click','button':name,'observed_control':point,'outcome':'clicked'})
   if capture:await s.capture('batch10-'+(label or name))
   return True
  except Exception as e:s.errors.append({'operation':'native-container-click','button':name,'error':str(e)[:200]})
 return False

async def run_game(p,game):
 browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 s=Session(browser,game);out=s.directory/'10-layout-mobile';out.mkdir(parents=True,exist_ok=True)
 s.batch10_tag=str(int(time.time()*1000))
 video=out/'batch10-recording';video.mkdir(exist_ok=True)
 s.context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent=UA,record_video_dir=str(video),record_video_size={'width':390,'height':844})
 s.page=await s.context.new_page();s.page.set_default_timeout(4000);s.page.on('response',s.queue_response)
 report={'game':game,'started_at':now(),'viewport':{'width':390,'height':844},'scope':'Official public DMO browser only. Native pointer actions; no internal game action calls or real ledger writes.','native_rounds':[],'details':[],'provider_blocked':False,'errors':[]}
 try:
  await s.page.goto(game['demo_url'],wait_until='domcontentloaded',timeout=45000)
  ready=False
  for _ in range(35):
   await asyncio.sleep(1)
   t=await timing(s)
   if t and t.get('rendered') and (t.get('spinOption') is not None or t.get('status')):ready=True;break
  await asyncio.sleep(2)
  await s.dom_click('batch10-sound-no',['.sound-popup-content-buttons .no'],capture=False)
  st=await capture(s,'idle')
  text=' '.join(f.get('text','')for f in st).lower()
  if any(v in text for v in ['you can create up to','not available in your','access denied','your session has expired']):
   report['provider_blocked']=True;return report
  report['details']=await details(s)
  scenes=[]
  for frame in s.page.frames:
   if s.is_game_frame(frame):
    try:scenes.append(await asyncio.wait_for(frame.evaluate((ROOT/'tools/scene_snapshot.js').read_text()),timeout=5))
    except Exception:pass
  save_json(s.directory/'05-reels-system/fresh-native-scene.json',{'source':'Read-only official rendered scene; no ticker or outcome modifications','scenes':scenes})
  if not ready:report['errors'].append('No confirmed ready Spin control; screenshots may show loading.')
  # Spin is tested before opening bet/autoplay overlays: a click in a bet list must not count as play.
  for index in range(2):
   before=await timing(s)
   if not before:break
   if before.get('kind')=='slot' and before.get('spinOption')not in ['Start','Spin']:break
   if before.get('kind')=='legacy' and before.get('status')not in ['Start','Spin','Active']:break
   clicked=await native_click(s,'Spin',capture=False,label='batch10-spin-'+str(index+1),delay=.05)
   if not clicked:break
   started=time.monotonic();samples=[];stop=False
   for n in range(18):
    value=await timing(s);samples.append({'elapsed_ms':round((time.monotonic()-started)*1000),'state':value})
    if n==0:await capture(s,'round-'+str(index+1)+'-start')
    option=(value or{}).get('spinOption')or(value or{}).get('status')
    if value and option=='Stop' and not stop:
     stop=await native_click(s,'Spin',capture=False,label='batch10-stop-'+str(index+1),required_status='Stop',delay=.05)
     await capture(s,'round-'+str(index+1)+'-stop')
    if n>2 and value and option=='Start'and not value.get('spinning'):break
    await asyncio.sleep(.12)
   await asyncio.sleep(1)
   after=await timing(s);await capture(s,'round-'+str(index+1)+'-result')
   observed=bool(before!=after and after and (before.get('balance')!=after.get('balance')or before.get('user')!=after.get('user')))
   report['native_rounds'].append({'native_spin_clicked':clicked,'native_stop_clicked':stop,'before':before,'after':after,'account_state_changed':observed,'samples':samples})
  # Menu owns the rules, settings, history and exit in the official launcher.
  opened=await native_click(s,'Menu',capture=False,label='batch10-menu')
  if not opened:opened=await s.dom_click('batch10-menu',['.menu-icon-bt','.menu-icon','.Menu','.menu-icon-without-line.open-menu'],capture=False)
  if opened:
   await capture(s,'rules')
   for label,selectors in [('settings',['.footer-navigation [data-page="setting"]','.footer-page-setting','[data-action="settings"]']),('history',['.footer-navigation [data-page="history"]','.footer-page-spin-history','[data-action="history"]'])]:
    if await s.dom_click('batch10-'+label,selectors,capture=False):await capture(s,label)
   await s.close_overlays()
  # These are state observations; selecting a bet never counts as a round.
  if await native_click(s,'Bet',capture=False,label='batch10-bet'):
   await capture(s,'bet-options')
   # Tapping outside the visible list closes it through native input.
   await s.page.mouse.click(15,150);await asyncio.sleep(.4)
  if await native_click(s,'AutoPlay',capture=False,label='batch10-auto'):
   await capture(s,'autoplay-options');await native_click(s,'AutoPlayClose',capture=False,label='batch10-autoplay-close');await s.close_overlays()
  while len(s.captures)<10:
   await asyncio.sleep(.4);await capture(s,'observed-frame-'+str(len(s.captures)+1))
  await s.page.set_viewport_size({'width':844,'height':390});await asyncio.sleep(.7);await capture(s,'landscape')
  await s.page.set_viewport_size({'width':390,'height':844})
  await s.close_overlays()
  if not await s.dom_click('batch10-exit-menu',['.menu-icon-bt','.menu-icon','.Menu','.menu-icon-without-line.open-menu'],capture=False):await native_click(s,'Menu',capture=False)
  report['native_exit_clicked']=await s.dom_click('batch10-exit',['.menu-popup-exit-game','.game-exit-bt','.exit-game'],capture=False)
 except Exception as e:report['errors'].append(type(e).__name__+': '+str(e)[:350])
 finally:
  if s.tasks:
   done,pending=await asyncio.wait(list(s.tasks),timeout=15)
   for task in pending:task.cancel()
  report.update({'finished_at':now(),'actions':s.actions,'captures':s.captures,'assets':s.assets,'requests':s.requests,'session_errors':s.errors})
  save_json(out/'batch10-attempts'/s.batch10_tag/'control-session.json',report)
  target=out/'batch10-control-session.json'
  def score(value):
   rounds=sum(x.get('account_state_changed',False)for x in value.get('native_rounds',[]))
   rendered=sum(any(any(b.get('visible')for b in f.get('pixi',[]))for f in c.get('frames',[]))for c in value.get('captures',[]))
   return (rounds,rendered,len(value.get('captures',[])))
  prior=json.loads(target.read_text())if target.exists()else{}
  if score(report)>=score(prior):
   save_json(target,report)
   save_json(s.directory/'13-live-build-specification/batch10-native-profile.json',{'game':game,'reference_scope':report['scope'],'provider_blocked':report['provider_blocked'],'mobile_layout':report['viewport'],'native_rounds':report['native_rounds'],'details':report['details'],'errors':report['errors']})
  try:await asyncio.wait_for(s.context.close(),timeout=12)
  except Exception:pass
  try:await asyncio.wait_for(browser.close(),timeout=8)
  except Exception:pass
 return report

async def main():
 games={g['id']:g for g in json.loads((ROOT/'catalogues/smartsoft-games.json').read_text())['games']}
 chosen=sys.argv[1:]or IDS
 async with async_playwright()as p:
  for game_id in chosen:
   try:r=await asyncio.wait_for(run_game(p,games[game_id]),timeout=155)
   except Exception as e:r={'provider_blocked':False,'captures':[],'native_rounds':[],'errors':[str(e)]}
   print(json.dumps({'id':game_id,'provider_blocked':r['provider_blocked'],'screenshots':len(r.get('captures',[])),'rounds':len(r.get('native_rounds',[])),'state_changed':any(x.get('account_state_changed')for x in r.get('native_rounds',[])),'errors':r.get('errors')}),flush=True)
if __name__=='__main__':asyncio.run(main())
