"""New rendering on existing URLs; isolated financial fixture, no real wagers."""
import asyncio,json,mimetypes,re,os
from pathlib import Path
from playwright.async_api import async_playwright,expect
from native9_controls import Fixture,IDS,ORIGIN,ROOT,click_native,money
import uuid,copy
LIVE=os.environ.get('NATIVE_REBUILD_LIVE')=='1'
OUT=ROOT/('reports/native9-rebuild-live' if LIVE else 'reports/native9-rebuild');OUT.mkdir(exist_ok=True)
SLUGS={json.loads(p.read_text())['backendId']:p.parent for p in (ROOT/'games/batch10').glob('*/profile.json')}
class WinFixture(Fixture):
 async def route(self,route):
  if '/api/remaining20/action' in route.request.url and route.request.post_data_json.get('type')=='action':
   body=route.request.post_data_json;self.requests.append(body)
   assert body['expected_version']==self.round['version']
   self.round['version']+=1
   if body['action']=='gamble':
    self.round['currentCashoutMinor']='200'
    self.round['gambleHistory']=[{'choice':'red','color':'red','suit':'hearts','won':True,'attempt':1}]
   else:
    assert body['action']=='collect'
    self.round.update(status='settled',payoutMinor='200',actions=[]);self.balance+=200
   return await route.fulfill(json={**self.state(),'status':'SUCCESS','request_id':body['request_id'],'game_id':self.game_id})
  return await super().route(route)
async def audit(browser,gid):
 ctx=await browser.new_context(viewport={'width':390,'height':844})
 fixture=WinFixture(gid);errors=[]
 async def route(r):
  path=r.request.url.split('?')[0].replace(ORIGIN,'')
  file=None
  if path=='/games/'+gid:file=ROOT/'games/shared/native-shell.html'
  elif path.startswith('/independent74/native/shared/'):
   name=path.rsplit('/',1)[-1];file=ROOT/'games/shared'/('native-game.css' if name=='style.css' else name)
  elif path.startswith('/independent74/native/'):
   bits=path.split('/');file=ROOT/'games/batch10'/bits[3]/'/'.join(bits[4:])
  if file and not LIVE:
   if not file.is_file():errors.append('missing '+str(file));return await r.fulfill(status=404)
   mime=mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
   if file.suffix=='.mjs':mime='application/javascript'
   return await r.fulfill(body=file.read_bytes(),content_type=mime)
  return await fixture.route(r)
 await ctx.route('**/*',route)
 page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 await page.goto(ORIGIN+'/games/'+gid,wait_until='domcontentloaded')
 await expect(page.locator('#sound-no')).to_be_visible(timeout=45000);await page.locator('#sound-no').click()
 await expect(page.locator('#spin')).to_be_enabled()
 await page.screenshot(path=str(OUT/(gid+'-portrait.png')))
 await click_native(page,'#menu');await expect(page.locator('#menu-dialog')).to_be_visible();await page.locator('#menu-dialog [data-close]').click()
 await click_native(page,'#bet');await expect(page.locator('#bet-dialog')).to_be_visible();await page.locator('#bet-dialog [data-close]').click()
 await click_native(page,'#spin');await expect(page.locator('#spin')).to_have_attribute('aria-label',re.compile('^STOP'));await click_native(page,'#spin')
 await expect(page.locator('#spin')).to_have_attribute('aria-label','SPIN',timeout=15000)
 assert len(fixture.requests)==1 and fixture.settlements==1,(fixture.requests,fixture.settlements)
 for w,h in [(320,568),(844,390)]:
  await page.set_viewport_size({'width':w,'height':h});await page.screenshot(path=str(OUT/(gid+f'-{w}.png')))
  for selector in ['#spin','#menu','#bet','#auto']:
   b=await page.locator(selector).bounding_box();assert b and b['x']>=0 and b['y']>=0 and b['x']+b['width']<=w+1 and b['y']+b['height']<=h+1,(gid,w,selector,b)
 # Restore an active fixture win through the canonical state refresh.
 fixture.round.pop('payoutMinor',None)
 fixture.round.update(status='active',currentCashoutMinor='100',actions=['collect','gamble'],gambleAvailable=True,gambleAttemptsRemaining=5)
 await page.set_viewport_size({'width':390,'height':844})
 await page.reload(wait_until='domcontentloaded')
 await click_native(page,'#gamble-win');await click_native(page,'#gamble-red')
 await expect(page.locator('#gamble-stake')).to_have_text('2.00 ETB')
 await expect(page.locator('#revealed-card')).to_have_text('RED')
 await click_native(page,'#gamble-take')
 await expect(page.locator('#balance')).to_have_text('101.00')
 assert [r.get('action',r['type']) for r in fixture.requests]==['start','gamble','collect']
 assert not errors,errors
 await ctx.close();return {'id':gid,'passed':True,'real_wagers':0}
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for gid in IDS:
   try:result=await audit(browser,gid)
   except Exception as e:result={'id':gid,'passed':False,'error':str(e)[:1500]}
   results.append(result);print(json.dumps(result),flush=True)
  await browser.close()
 (OUT/'results.json').write_text(json.dumps(results,indent=2))
if __name__=='__main__':asyncio.run(main())
