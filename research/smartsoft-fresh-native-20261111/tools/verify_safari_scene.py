"""Physical controls on existing origin; intercepted ledger fixtures, zero wagers."""
import asyncio,json,mimetypes,uuid,sys
from pathlib import Path
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[1];ORIGIN='https://superwin-player.apdiy61.workers.dev'
class Fixture:
 def __init__(self):
  self.game=json.loads((ROOT/'native-machines/safari-simba-2/profile.json').read_text())['backendGame'];self.balance=10000;self.round=None;self.requests=[];self.settlements=0;self.attempt=0;self.stake=0
 def state(self):return {'authenticated':True,'currency':'ETB','sessionGuard':'b'*64,'balance':f'{self.balance/100:.2f}','game':self.game,'round':None if self.round is None else {'result':self.round,'createdAt':'2026-11-12T01:00:00Z','gamble':{'attempt':self.attempt,'stake':f'{self.stake/100:.2f}','maxAttempts':5,'available':self.stake>0,'maxStake':'500.00',**({'lastResult':self.last}if self.attempt else{})}},'blockedByActiveGame':None}
 async def route(self,r):
  path=r.request.url.split('?')[0].replace(ORIGIN,'')
  if path=='/api/slots/fresh-state':return await r.fulfill(json=self.state())
  if path=='/api/slots/rounds':return await r.fulfill(json={'items':[]})
  if path in ['/api/slots/spin','/api/slots/gamble']:
   body=r.request.post_data_json;self.requests.append(body);assert body['sessionGuard']=='b'*64;before=self.balance
   if path.endswith('spin'):
    assert body['gameId']=='fresh_safarisimba';assert body['mathVersion']==self.game['mathVersion'];self.settlements+=1;self.stake=0 if self.settlements==1 else 200;self.balance+=self.stake-100;self.attempt=0
    self.round={'roundId':str(uuid.uuid4()),'gameId':'fresh_safarisimba',**{k:self.game[k]for k in ['mathVersion','engineVersion','mathSha256']},'currency':'ETB','bet':'1.00','finalWin':f'{self.stake/100:.2f}','balanceAfter':f'{self.balance/100:.2f}','grid':[['j','j','j'],['q','k','a'],['zebra','elephant','tiger']],'wheelMultiplier':1,'winLines':[],'expandedColumns':[],'walletReceipt':{'currency':'ETB','balanceBefore':f'{before/100:.2f}','chargedStake':'1.00','finalWin':f'{self.stake/100:.2f}','balanceAfter':f'{self.balance/100:.2f}'}}
    return await r.fulfill(json=self.round)
   assert body['roundId']==self.round['roundId'];assert body['expectedAttempt']==self.attempt+1;assert body['expectedStake']==f'{self.stake/100:.2f}';self.attempt+=1;stake=self.stake;self.stake*=2;self.balance+=stake;self.last={'roundId':body['roundId'],'gameId':'fresh_safarisimba','attempt':self.attempt,'choice':body['choice'],'revealed':body['choice'],'won':True,'payout':f'{self.stake/100:.2f}','balanceAfter':f'{self.balance/100:.2f}','walletReceipt':{'currency':'ETB','balanceBefore':f'{before/100:.2f}','chargedStake':f'{stake/100:.2f}','finalWin':f'{self.stake/100:.2f}','balanceAfter':f'{self.balance/100:.2f}'}}
   return await r.fulfill(json=self.last)
  return await r.continue_()
async def main():
 errors=[];fixture=Fixture()
 async with async_playwright()as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);ctx=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  async def route(r):
   path=r.request.url.split('?')[0].replace(ORIGIN,'');file=None
   if '--live'in sys.argv:return await fixture.route(r)
   if path=='/games/safari-simba':file=ROOT/'native-machines/shared/index.html'
   elif path=='/independent74/native/shared/native-account.mjs':return await r.continue_()
   elif path.startswith('/independent74/native/'):file=ROOT/'native-machines'/path.removeprefix('/independent74/native/').replace('scene-v2-','',1)
   if file:
    if not file.is_file():errors.append('missing '+str(file));return await r.fulfill(status=404)
    mime='application/javascript'if file.suffix=='.mjs'else mimetypes.guess_type(str(file))[0]or'application/octet-stream'
    return await r.fulfill(body=file.read_bytes(),content_type=mime,headers=({'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'"}if file.suffix=='.html'else{}))
   return await fixture.route(r)
  await ctx.route('**/*',route);page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));await page.goto(ORIGIN+'/games/safari-simba',wait_until='domcontentloaded');await page.wait_for_function('()=>!!window.nativeController&&nativeController.state.authenticated',timeout=60000)
  async def tap(name):await page.locator('[data-native-hit="buttons.buttons.'+name+'.container"]').tap()
  await tap('bet');await page.locator('[data-native-hit="bets.buttons.0.container"]').tap();await tap('menu');await expect(page.locator('#menu')).to_be_visible();await page.locator('#menu-close').tap()
  await tap('spin');await tap('spin');await page.wait_for_function('()=>nativeController.phase==="idle"',timeout=15000);assert fixture.settlements==1;assert await page.evaluate('nativeController.state.balance')=='99.00'
  await tap('spin');await page.wait_for_function('()=>nativeController.phase==="idle"',timeout=15000);assert await page.evaluate("nativeScene.bound('common.win').worldVisible");await tap('double');await page.locator('[data-native-hit="double.redBlack.red"]').tap();await page.wait_for_function('()=>nativeController.phase==="idle"',timeout=15000);await page.locator('[data-native-hit="double.redBlack.take"]').tap();assert fixture.balance==10200;assert len(fixture.requests)==3
  expanded=await page.evaluate("async()=>{nativeScene.landGrid([[4,4,4],[1,2,3],[2,3,0]]);await nativeScene.presentRound({feature:{expandedColumns:[0]}});return nativeScene.roundEffects.length;}");assert expanded==1;await page.wait_for_timeout(200);await page.screenshot(path=str(ROOT/'reports/safari-live-expansion-verified.png'));await page.evaluate("()=>{nativeController.lastRound='';nativeController.update();}")
  for width,height in [(320,568),(844,390),(390,844)]:
   await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(800);await tap('bet');await page.locator('[data-native-hit="bets.buttons.0.container"]').tap()
   bounds=await page.locator('canvas').bounding_box();assert bounds['x']>=-1 and bounds['y']>=0 and bounds['x']+bounds['width']<=width+1 and bounds['y']+bounds['height']<=height+1,bounds
   await page.screenshot(path=str(ROOT/f'reports/safari-{"live-"if"--live"in sys.argv else""}verified-{width}x{height}.png'))
  await tap('autoPlay');await page.locator('[data-native-hit="autoPlay.close"]').tap();await tap('soundOff');await tap('soundOn');await tap('quickPlay');assert not errors,errors
  print(json.dumps({'passed':True,'real_wagers':0,'fixture_spin_settlements':fixture.settlements,'financial_requests':len(fixture.requests),'viewports':["390x844","320x568","844x390"],'errors':errors}));await browser.close()
if __name__=='__main__':asyncio.run(main())
