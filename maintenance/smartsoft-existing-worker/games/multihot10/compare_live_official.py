"""Open official demo and deployed game together, documenting isolated test scope."""
import asyncio,json,runpy,sys,time
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
RESEARCH=Path('/workspace/official-game-research-2026-11-11')
C=runpy.run_path(str(RESEARCH/'tools/capture_demos.py'),run_name='reference_compare')
sys.path.insert(0,str(ROOT));from verify_live import Fixture,ORIGIN
async def main():
 game=next(g for g in json.loads((RESEARCH/'catalogues/smartsoft-games.json').read_text())['games']if g['id']=='multi-hot-10-2')
 out=ROOT/'comparison';out.mkdir(exist_ok=True)
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  ua='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  reference=C['Session'](browser,game)
  reference.directory=RESEARCH/'games'/game['id']/'10-layout-mobile/realtime-comparison'
  reference.context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent=ua)
  reference.page=await reference.context.new_page();reference.page.on('response',reference.queue_response)
  live_context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,user_agent=ua)
  live=await live_context.new_page();fixture=Fixture();await live.route(ORIGIN+'/api/slots/**',fixture.route)
  await asyncio.gather(reference.page.goto(game['demo_url'],wait_until='domcontentloaded',timeout=45000),live.goto(ORIGIN+'/independent74/fresh74.html',wait_until='networkidle',timeout=45000))
  await live.locator('#sound-no').click()
  await reference.page.wait_for_timeout(15000)
  await reference.dom_click('comparison-sound-no',['.sound-popup-content-buttons .no'],capture=False)
  await reference.capture('comparison-native-idle')
  # The deployed page is genuine; only this test browser's financial calls are isolated.
  await live.screenshot(path=str(out/'live-idle.png'))
  native=Path(RESEARCH/reference.captures[-1]['path']);Image.open(native).save(out/'official-idle.png')
  pair=Image.new('RGB',(780,884),'#111');draw=ImageDraw.Draw(pair)
  draw.text((10,10),'OFFICIAL PUBLIC DEMO / DMO',fill='white');draw.text((400,10),'DEPLOYED GAME / ISOLATED API FIXTURE',fill='white')
  pair.paste(Image.open(out/'official-idle.png'),(0,40));pair.paste(Image.open(out/'live-idle.png'),(390,40));pair.save(out/'side-by-side.png')
  observations=[]
  for label,reference_action,live_control in [('menu','Menu','menu'),('bet','Bet','bet')]:
   clicked=await reference.pixi_click(reference_action,label='comparison-native-'+label)
   await live.locator('#'+live_control).click()
   await live.screenshot(path=str(out/('live-'+label+'.png')))
   observations.append({'control':label,'official_native_click':clicked,'live_dialog':await live.locator('dialog[open]').get_attribute('id')})
   await live.keyboard.press('Escape');await reference.close_overlays()
  # A canvas bet sheet is closed by a real pointer press outside the sheet.
  # Its overlaid Spin position would select a stake rather than start a round.
  await reference.page.mouse.click(10,150)
  await reference.page.wait_for_timeout(400)
  before=await reference.states()
  ready=any(f.get('slotRendering',{}).get('spinOption')=='Start' for f in before)
  assert ready,'Official Spin is covered or unavailable; do not report a played round'
  native_started=time.monotonic()
  native_play=await reference.pixi_click('Spin',label='comparison-native-spin',delay=.1,capture=False,required_status='Start')
  await reference.page.wait_for_timeout(250)
  native_stop=await reference.pixi_click('Spin',label='comparison-native-stop',required_status='Stop',delay=.1,capture=False)
  await live.locator('#spin').click();await live.locator('#spin').click()
  await live.locator('#win-display').wait_for(state='visible')
  await reference.page.wait_for_timeout(2000);await reference.capture('comparison-native-result')
  after=await reference.states()
  before_info=[f.get('slotInfo')for f in before if f.get('slotInfo')]
  after_info=[f.get('slotInfo')for f in after if f.get('slotInfo')]
  assert before_info!=after_info,'Official round outcome was not observed'
  observations.append({'control':'spin-stop','official_play_clicked':native_play,'official_stop_clicked_only_when_stop_available':native_stop,'official_changed_account_state':True,'official_before':before_info,'official_after':after_info,'observed_result_after_seconds':round(time.monotonic()-native_started,3),'live_round_requests':len(fixture.spins),'live_fixture_settlements':fixture.settlements})
  report={'official_url':game['demo_url'],'live_url':ORIGIN+'/independent74/fresh74.html','simultaneously_open_in_browser':True,'viewport':{'width':390,'height':844},'official_real_demo_interactions':True,'live_financial_api_scope':'Isolated browser fixtures; no player session impersonation, real wager or ledger mutation','realLedgerWrites':0,'observations':observations,'reference_states':reference.captures,'reference_actions':reference.actions}
  (out/'comparison.json').write_text(json.dumps(report,indent=2))
  # Native exit releases this public demo table when its launcher offers it.
  await reference.pixi_click('Menu',capture=False);await reference.dom_click('comparison-exit',['.menu-popup-exit-game'],capture=False)
  await browser.close();print(json.dumps({'comparison_saved':str(out/'comparison.json'),'observations':observations}),flush=True)
asyncio.run(main())
