"""Native control test with isolated financial API responses; zero real wagers."""
import asyncio,json,mimetypes,sys
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,'/workspace/superwin-existing-integration/tests')
from native9_controls import Fixture,ORIGIN
import uuid
class WinFixture(Fixture):
 async def route(self,r):
  if "/api/remaining20/action" in r.request.url and r.request.post_data_json.get("type")=="action":
   body=r.request.post_data_json;self.requests.append(body);assert body["expected_version"]==self.round["version"];self.round["version"]+=1
   if body["action"]=="gamble":self.round.update(currentCashoutMinor="200",gambleHistory=[{"choice":"red","color":"red","suit":"hearts","won":True,"attempt":1}])
   else:self.round.update(status="settled",payoutMinor="200",actions=[]);self.balance+=200
   return await r.fulfill(json={**self.state(),"status":"SUCCESS","request_id":body["request_id"],"game_id":self.game_id})
  return await super().route(r)
async def main():
 game='multi-hot-100';fixture=WinFixture('multihot100_native');errors=[]
 async with async_playwright()as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);ctx=await b.new_context(viewport={'width':390,'height':844})
  async def route(r):
   path=r.request.url.split('?')[0].replace(ORIGIN,'')
   file=None
   if path=='/games/multihot100_native':file=ROOT/'native-machines/shared/index.html'
   elif path=='/independent74/native/shared/native-account.mjs':return await r.continue_()
   elif path.startswith('/independent74/native/'):file=ROOT/'native-machines'/path.removeprefix('/independent74/native/').replace('scene-v2-','',1)
   if file:
    if not file.is_file():errors.append('missing '+str(file));return await r.fulfill(status=404)
    mime=mimetypes.guess_type(str(file))[0]or'application/octet-stream'
    if file.suffix=='.mjs':mime='application/javascript'
    return await r.fulfill(body=file.read_bytes(),content_type=mime,headers=({'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'"} if file.suffix=='.html' else {}))
   return await fixture.route(r)
  await ctx.route('**/*',route);page=await ctx.new_page();page.on('pageerror',lambda e:(errors.append(str(e)),print(json.dumps({'pageerror':str(e),'stack':e.stack}),flush=True)))
  await page.goto(ORIGIN+'/games/multihot100_native?native_scene='+game,wait_until='domcontentloaded')
  await page.wait_for_function('()=>!!window.nativeController',timeout=60000)
  await page.wait_for_function('()=>nativeController.state.connected',timeout=10000)
  async def tap(name):
   point=await page.evaluate('''name=>{const s=nativeScene,n=s.controls[name],r=n.getBounds(),c=s.app.view.getBoundingClientRect();return{x:c.x+(r.x+r.width/2)*c.width/s.app.renderer.width,y:c.y+(r.y+r.height/2)*c.height/s.app.renderer.height};}''',name)
   await page.mouse.click(point['x'],point['y'])
  await tap('bet');await page.wait_for_function("()=>nativeScene.bound('bets.container').visible")
  await page.evaluate('nativeController.closePanels()')
  await tap('menu');await expect(page.locator('#menu')).to_be_visible();await page.locator('#menu-close').click()
  await tap('spin');await page.wait_for_function('()=>nativeController.phase!=="idle"');await tap('spin')
  await page.wait_for_function('()=>nativeController.phase==="idle"',timeout=15000)
  assert len(fixture.requests)==1 and fixture.settlements==1,(len(fixture.requests),fixture.settlements,await page.locator('#status').inner_text())
  assert await page.evaluate('nativeController.state.balance')=='99.00'
  fixture.round.pop('payoutMinor',None);fixture.round.update(status='active',currentCashoutMinor='100',actions=['collect','gamble'],gambleAvailable=True,gambleAttemptsRemaining=5)
  await page.reload(wait_until='domcontentloaded');await page.wait_for_function('()=>!!window.nativeController&&nativeController.state.round?.status==="active"',timeout=30000)
  await page.locator('[data-native-hit="buttons.buttons.double.container"]').click()
  await page.locator('[data-native-hit="double.redBlack.red"]').click()
  await page.wait_for_function('()=>nativeController.state.round?.amountMinor==="200"')
  await page.locator('[data-native-hit="double.redBlack.take"]').click()
  await page.wait_for_function('()=>nativeController.state.balance==="101.00"')
  assert not errors,errors
  await page.screenshot(path=str(ROOT/'reports/multihot100-new-account.png'))
  print(json.dumps({'id':fixture.game_id,'passed':True,'requests':len(fixture.requests),'settlements':fixture.settlements,'real_wagers':0,'errors':errors}),flush=True)
  await b.close()
asyncio.run(main())
