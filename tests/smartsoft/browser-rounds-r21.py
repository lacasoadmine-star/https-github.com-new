"""Nine-title visual input and money conservation review; loopback only."""
import asyncio,json,os,time
from decimal import Decimal
from pathlib import Path
from importlib.machinery import SourceFileLoader
from playwright.async_api import async_playwright
m=SourceFileLoader('natural',str(Path(__file__).with_name('browser-natural-r17.py'))).load_module()
OUT=Path(os.environ.get('SMARTSOFT_REVIEW_ARTIFACTS','/tmp/smartsoft-rounds-r21'));OUT.mkdir(parents=True,exist_ok=True)
async def main():
 reports=[];errors=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  context.on('page',lambda pg:pg.on('pageerror',lambda e:errors.append(str(e))))
  pages=await asyncio.gather(*(m.open_game(context,game) for game in m.IDS))
  for game,page in zip(m.IDS,pages):
   await page.bring_to_front()
   initial=await page.locator('#scene').bounding_box()
   await page.screenshot(path=str(OUT/(game+'-ready.png')))
   # Change the actual stake through the visible native controls.
   if game.startswith('burningice'):
    await page.locator('[data-control=increase]:visible').click();assert await page.locator('#stake').input_value()!='1.00'
    await page.locator('[data-control=decrease]:visible').click()
   else:
    await page.locator('[data-control=bet]:visible').click()
    await page.locator('#betDialog [aria-label="2.00 ETB"]:visible').click()
    assert await page.locator('#stake').input_value()=='2.00'
    await page.wait_for_timeout(250)
    await page.locator('[data-control=bet]:visible').click()
    await page.get_by_role('button',name='Previous bet levels',exact=True).click()
    await page.locator('#betDialog [aria-label="1.00 ETB"]:visible').click()
   for spin in range(3):
    before=await m.state(context,game);old=before.get('round') or {};count=len(page.native_start_requests);start=time.monotonic()
    await page.locator('[data-control=play]:visible').click()
    hashes=[]
    for _ in range(8):
     await page.wait_for_timeout(120)
     hashes.append(await page.locator('#scene').evaluate('(c)=>{const a=c.getContext("2d").getImageData(c.width*.2,c.height*.25,c.width*.6,c.height*.2).data;let h=0;for(let k=0;k<a.length;k+=37)h=(Math.imul(h,31)+a[k])|0;return h}'))
    await m.wait(page,"()=>!document.querySelector('#play').disabled&&!['STOP','CONFIRMING','RESULT SEQUENCE','CONFIRM ACTION'].includes(document.querySelector('#playLabel').textContent)",120)
    after=await m.state(context,game);round=after['round'];assert round['round_id']!=old.get('round_id')
    assert len(page.native_start_requests)==count+1,(game,spin,'duplicate wager')
    expected=Decimal(before['balance'])-Decimal(round['stakeMinor'])/100
    if old.get('status')=='active':expected+=Decimal(old['currentCashoutMinor'])/100
    if round['status']=='settled':expected+=Decimal(round['payoutMinor'])/100
    assert Decimal(after['balance'])==expected,(game,expected,after['balance'])
    assert len(set(hashes))>=3,(game,'no reel motion')
    assert await page.locator('#scene').bounding_box()==initial,(game,'canvas moved after result')
    report={'game':game,'spin':spin+1,'motionFrames':len(set(hashes)),'seconds':round_num(time.monotonic()-start),'resultFrames':len(round.get('frames',[])),'status':round['status'],'singleDebit':True,'balanceConserved':True,'stableCanvas':True}
    reports.append(report);print(json.dumps(report),flush=True)
    await page.screenshot(path=str(OUT/(game+'-result.png')))
   if round['status']=='active':
    win=Decimal(round['currentCashoutMinor'])/100;balance=Decimal(after['balance']);await m.collect_visible(page)
    await m.wait(page,"()=>!document.querySelector('#stake').disabled")
    settled=await m.state(context,game);assert Decimal(settled['balance'])==balance+win
   for width,height in [(360,740),(844,390)]:
    await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(600)
    box=await page.locator('[data-control=play]:visible').bounding_box()
    assert box and box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,(game,box)
    await page.screenshot(path=str(OUT/(game+f'-{width}x{height}.png')))
   await page.close()
  lobby=await context.new_page();await lobby.goto(m.ORIGIN+'/',wait_until='domcontentloaded')
  for game in m.IDS:
   card=lobby.locator('[data-r20-game="'+game+'"] .r20-native-open').first
   await card.wait_for();await card.click();sheet=lobby.locator('.native-game-sheet[open]');await sheet.wait_for()
   assert lobby.url.rstrip('/')==m.ORIGIN
   assert await sheet.locator('.native-sheet-play').get_attribute('href')=='/games/'+game
   await sheet.get_by_role('button',name='Game details').click();assert await sheet.locator('.native-sheet-details').is_visible()
   await sheet.get_by_role('button',name='Favourite').click();assert await sheet.get_by_role('button',name='Favourite').get_attribute('aria-pressed')=='true'
   await lobby.screenshot(path=str(OUT/(game+'-launcher.png')))
   await sheet.get_by_role('button',name='Close game options').click()
  await lobby.locator('[data-r20-game="multihot100_native"] .r20-native-open').first.click()
  await lobby.get_by_role('link',name='Play Now',exact=True).click();await lobby.wait_for_url('**/games/multihot100_native')
  status=await m.status(context);assert status['outgoingWrites']==0 and status['realMoneyRoundsPlaced']==0
  assert not errors,errors
  (OUT/'report.json').write_text(json.dumps({'rounds':reports,'launchers':9,'betControls':9,'responsiveTitles':9,'pageErrors':errors,'isolation':status},indent=2)+'\n')
  print(json.dumps({'passed':True,'rounds':len(reports),'launchers':9,'isolation':status}),flush=True)
  await browser.close()
def round_num(value):return float(f'{value:.3f}')
asyncio.run(main())
