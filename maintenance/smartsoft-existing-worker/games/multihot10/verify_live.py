"""Browser contract checks on the existing Worker; financial API fixtures never debit real accounts."""
import asyncio,copy,json,uuid,time
from pathlib import Path
from playwright.async_api import async_playwright,expect

ORIGIN='https://superwin-player.apdiy61.workers.dev'
ROOT=Path(__file__).resolve().parent
GAME='fresh_multihot10';SHA='383b2348149f8eb50c14f26edfa6a1b3dc7816130d5d2ea1244d9b6ce855700a'
MODEL={'mathVersion':'fresh-mh10-20261111-v1','engineVersion':'zplay-fresh-slot-v1','mathSha256':SHA}
LEVELS=['0.10','0.20','0.50','1.00','2.00','5.00','10.00','20.00','50.00','100.00','200.00']
def minor(value):return int(value.replace('.',''))
def money(value):return str(value//100)+'.'+str(value%100).zfill(2)
class Fixture:
 def __init__(self,ambiguous=False):
  self.balance=10000;self.round=None;self.spins=[];self.gambles=[];self.saved={};self.ambiguous=ambiguous;self.settlements=0;self.state_reads=0
 def state(self):
  return {'authenticated':True,'currency':'ETB','sessionGuard':'a'*64,'balance':money(self.balance),
   'game':{'id':GAME,**MODEL,'enabled':True,'freshReleaseReady':True,'betLevels':LEVELS},'round':self.round,'blockedByActiveGame':None}
 async def route(self,route):
  path=route.request.url.split('/api/slots/')[-1]
  if path=='fresh-state':
   self.state_reads+=1
   return await route.fulfill(json=self.state())
  if path=='rounds':return await route.fulfill(json={'items':[{'game_code':GAME,'created_at':'2026-11-11T20:00:00Z','result_json':r}for r in self.saved.values()]})
  if path=='spin':
   body=route.request.post_data_json;self.spins.append(body)
   assert body['gameId']==GAME and body['mathSha256']==SHA and body['sessionGuard']=='a'*64
   uuid.UUID(body['roundToken']);token=body['roundToken']
   if token not in self.saved:
    assert body.get('replayOnly')is not True
    before=self.balance;bet=minor(body['bet']);win=bet*1000;self.balance=before-bet+win
    result={'roundId':str(uuid.uuid4()),'gameId':GAME,**MODEL,'currency':'ETB','bet':body['bet'],
      'baseBet':body['bet'],'grid':[['seven']*5 for _ in range(3)],'wheelMultiplier':1,
      'winLines':[{'line':1,'positions':[{'row':0,'col':i}for i in range(5)],'win':money(win)}],
      'finalWin':money(win),'baseWin':money(win),'walletReceipt':{'currency':'ETB','balanceBefore':money(before),
       'chargedStake':body['bet'],'finalWin':money(win),'balanceAfter':money(self.balance),'netChange':money(win-bet)}}
    self.saved[token]=result;self.settlements+=1
    self.round={'result':result,'createdAt':'2026-11-11T20:00:00Z','gamble':{'available':win<=50000,'stake':money(win),'attempt':0,'maxAttempts':5}}
    if self.ambiguous:self.ambiguous=False;return await route.fulfill(status=503,json={'detail':'ACTION_UNCONFIRMED'})
    await asyncio.sleep(.5)
   return await route.fulfill(json=self.saved[token])
  if path=='gamble':
   body=route.request.post_data_json;self.gambles.append(body)
   assert body['expectedAttempt']==1 and body['choice']=='RED'
   before=self.balance;stake=minor(body['expectedStake']);payout=stake*2;self.balance=before-stake+payout
   self.round['gamble'].update({'stake':money(payout),'attempt':1,'available':payout<=50000})
   return await route.fulfill(json={'roundId':body['roundId'],'attempt':1,'choice':'RED','revealed':'RED','won':True,
    'payout':money(payout),'balanceAfter':money(self.balance),'walletReceipt':{'currency':'ETB','balanceBefore':money(before),
     'chargedStake':money(stake),'finalWin':money(payout),'balanceAfter':money(self.balance)}})
  raise AssertionError('Unexpected financial fixture request '+path)

async def page_for(browser,fixture):
 context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 page=await context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 await page.route(ORIGIN+'/api/slots/**',fixture.route)
 response=await page.goto(ORIGIN+'/independent74/fresh74.html',wait_until='networkidle',timeout=45000)
 assert response.status==200
 if await page.locator('#sound-no').is_visible():await page.locator('#sound-no').click()
 return context,page,errors

async def main():
 results=[]
 async with async_playwright()as playwright:
  browser=await playwright.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  fixture=Fixture();context,page,errors=await page_for(browser,fixture)
  await page.locator('#spin').click();await page.locator('#spin').click()
  assert await page.locator('.reel.paused').count()==5
  await page.locator('#win-display').wait_for(state='visible')
  assert len(fixture.spins)==1 and fixture.settlements==1
  assert await page.locator('.symbol[alt=seven]').count()==15
  assert (await page.locator('#balance').inner_text())=='199.90'
  results.append('One SPIN and immediate STOP submit exactly one authenticated round; verified grid and balance render')
  await page.locator('#gamble-win').click();await page.locator('#gamble-red').click()
  await expect(page.locator('#gamble-message')).to_contain_text('Guul')
  assert len(fixture.gambles)==1 and await page.locator('#balance').inner_text()=='299.90'
  await page.locator('#gamble-take').click();assert not await page.locator('#gamble-dialog').is_visible()
  results.append('Gamble verifies its receipt, changes the displayed balance once, and Take Win closes the decision')
  await page.locator('#menu').click();await page.locator('[data-tab=history]').click()
  await page.locator('#history li').wait_for();await page.keyboard.press('Escape')
  await page.locator('#bet').click();await page.locator('[data-amount="20"]').click();await page.locator('#bet-confirm').click()
  assert await page.locator('#bet-amount').inner_text()=='0.20'
  results.append('Game-specific history, bet choices, confirmation and footer value work')
  await page.locator('#auto').click();await page.locator('#auto-start').click()
  await expect(page.locator('#auto-count')).to_be_hidden();await expect(page.locator('#spin-label')).to_have_text('SPIN')
  assert fixture.settlements==2
  results.append('Bounded autoplay stops after its first verified win')
  assert not errors,errors
  sizes=[]
  for width,height in [(320,568),(360,640),(390,844),(430,932),(844,390),(932,430),(1280,720)]:
   await page.set_viewport_size({'width':width,'height':height})
   for control in ['spin','bet','menu','sound','bet-display','reels']:
    box=await page.locator('#'+control).bounding_box()
    assert box and box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,(width,height,control,box)
   sizes.append([width,height])
  results.append('All reels and main controls fit seven phone/desktop viewports: '+str(sizes))
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path=str(ROOT/'verified-winning-phone.png'))
  await context.close()
  retry=Fixture(ambiguous=True);context,page,errors=await page_for(browser,retry)
  await page.locator('#spin').click();await page.locator('#retry').wait_for(state='visible')
  await page.locator('#retry').click();await expect(page.locator('#retry')).to_be_hidden()
  assert len(retry.spins)==2 and retry.spins[0]['roundToken']==retry.spins[1]['roundToken']
  assert retry.spins[1]['replayOnly']is True and retry.settlements==1
  assert await page.locator('#balance').inner_text()=='199.90'
  results.append('Ambiguous response retry retains the same round token and restores one settlement')
  assert not errors,errors
  await context.close()
  late=Fixture();context,page,errors=await page_for(browser,late)
  box=await page.locator('#spin').bounding_box()
  # Hold this isolated browser's visual clock, while network fixtures complete.
  # This deterministically leaves the normal 950ms presentation timer pending;
  # host CPU load cannot accidentally turn the STOP tap into a new SPIN.
  await page.clock.install(time='2030-01-01T00:00:00Z')
  await page.clock.pause_at('2030-01-01T00:00:00Z')
  await page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
  for _ in range(150):
   if late.settlements==1 and late.state_reads>=2:break
   await asyncio.sleep(.05)
  assert late.settlements==1 and late.state_reads>=2
  await asyncio.sleep(.1)
  await expect(page.locator('#spin-label')).to_have_text('STOP')
  await page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2,click_count=2,delay=8)
  await expect(page.locator('#spin-label')).to_have_text('SPIN')
  assert late.settlements==1
  results.append('STOP releases the pending 950ms visual timer without advancing the isolated game clock; a native double tap adds no round')
  await context.close();await browser.close()
 report={'status':'passed','location':ORIGIN+'/independent74/fresh74.html','scope':'Real deployed browser UI with isolated financial API fixtures; no real account, wager or database write','checks':results,'realDatabaseWrites':0}
 (ROOT/'browser-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)

if __name__=='__main__':asyncio.run(main())
