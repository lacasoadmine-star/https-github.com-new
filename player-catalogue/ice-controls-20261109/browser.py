import asyncio,json,os,mimetypes,traceback
from decimal import Decimal
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).parent
PREFIX='/native-library/remaining20/20261109-ice-controls-r4/'
OLD='/native-library/remaining20/20261109-r5-seven-review1/'
ART='/native-library/remaining20/reference-art/r1/smartsoft/assets/'
ORIGIN='https://superwin-player.apdiy61.workers.dev'
LIVE=bool(os.environ.get('LIVE'))
LABEL='live' if LIVE else 'preview'

async def main():
 reports=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']} if os.environ.get('HTTPS_PROXY') else None)
  for game in ['burningice10_native','burningice40_native']:
   context=await browser.new_context(viewport={'width':1365,'height':850})
   async def intercept(route):
    url=route.request.url
    if PREFIX in url:
     name=url.split(PREFIX)[1].split('?')[0];path=ROOT/'client'/name
     if path.is_file():
      await route.fulfill(path=str(path),content_type='application/javascript' if path.suffix=='.mjs' else mimetypes.guess_type(str(path))[0]);return
     target=ORIGIN+(ART+name[4:] if name.startswith('art/') else OLD+name)
     response=await route.fetch(url=target);await route.fulfill(response=response);return
    response=await route.fetch();body=(await response.text()).replace(OLD,PREFIX);await route.fulfill(response=response,body=body)
   if not LIVE:
    await context.route('**'+PREFIX+'**',intercept)
    await context.route(ORIGIN+'/demo/games/'+game,intercept)
   page=await context.new_page();errors=[];http=[];actions=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('response',lambda r:http.append({'path':r.url.split(ORIGIN)[-1],'status':r.status}) if r.status>=400 else None)
   page.on('request',lambda r:actions.append(json.loads(r.post_data)) if '/api/remaining20/demo/action' in r.url and r.method=='POST' else None)
   report={'game':game,'scope':LABEL,'checks':[]}
   async def state():return await page.evaluate('(id)=>fetch("/api/remaining20/demo/state?game_id="+id).then(r=>r.json())',game)
   try:
    await page.goto(ORIGIN+'/demo/games/'+game,wait_until='domcontentloaded',timeout=60000)
    await page.locator('#startupYes').click(timeout=45000)
    next_bet=page.get_by_role('button',name='Select next bet',exact=True)
    previous_bet=page.get_by_role('button',name='Select previous bet',exact=True)
    await next_bet.wait_for(timeout=30000)
    initial=await state();assert initial['currency']=='CREDITS' and initial['demoCreditsOnly'] is True
    await page.locator('#stake').select_option('1.00',force=True)
    assert await previous_bet.is_disabled()
    await next_bet.click();assert await page.locator('#stake').input_value()=='2.00';assert not await page.locator('#betDialog').is_visible()
    await previous_bet.click();assert await page.locator('#stake').input_value()=='1.00'
    await page.locator('#stake').select_option('40000.00',force=True);assert await next_bet.is_disabled()
    await page.locator('#stake').select_option('1.00',force=True)
    await next_bet.click();assert await page.locator('#stake').input_value()=='2.00'
    assert not actions and (await state())['balance']==initial['balance']
    report['checks'].append('next/previous native stake rows select1/2;40000 boundary disabled; no dialog/debit')
    await page.wait_for_timeout(500)
    await page.screenshot(path=str(ROOT/(game+'-'+LABEL+'-ready.png')))
    async with page.expect_response(lambda r:'/api/remaining20/demo/action' in r.url and r.request.method=='POST',timeout=25000) as pending:
     await page.get_by_role('button',name='SPIN',exact=True).click()
    response=await pending.value;spin=await response.json();assert response.status==200 and spin['round']['stakeMinor']=='200'
    stop=page.get_by_role('button',name='Stop animation',exact=True)
    if await stop.is_visible():await stop.click()
    await page.wait_for_timeout(6500)
    if spin['round']['status']=='active':
     collect=page.locator('[data-control="collect"]');await collect.click(timeout=45000)
     await page.wait_for_timeout(800)
     report['checks'].append('original native COLLECT button settles confirmed win')
    final=await state();assert final['round']['status']=='settled'
    assert final['round']['round_id']==spin['round']['round_id']
    expected=Decimal(initial['balance'])-Decimal('2.00')+Decimal(final['round']['payoutMinor'])/100
    assert Decimal(final['balance'])==expected
    starts=[a for a in actions if a.get('type')=='start'];assert len(starts)==1,actions
    report['checks'].append('SPIN/STOP produces one accepted2.00 debit; balance conserves stake/payout')
    report['round']={'stakeMinor':final['round']['stakeMinor'],'payoutMinor':final['round']['payoutMinor'],'before':initial['balance'],'after':final['balance']}
    await page.reload(wait_until='domcontentloaded')
    yes=page.locator('#startupYes')
    try:await yes.click(timeout=7000)
    except:pass
    await page.get_by_role('button',name='Select next bet',exact=True).wait_for(timeout=30000)
    recovered=await state();assert recovered['round']['round_id']==final['round']['round_id'];assert recovered['balance']==final['balance']
    report['checks'].append('reload retains settled receipt and exact balance')
    await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(1200)
    assert await page.locator('#scene').is_visible()
    await page.screenshot(path=str(ROOT/(game+'-'+LABEL+'-portrait.png')))
    assert not errors and not http,(errors,http)
    report['checks'].append('portrait renders without JavaScript/HTTP failures')
    report['errors']=errors;report['http']=http
   except Exception as e:
    report['error']=str(e);report['errors']=errors;report['http']=http
    await page.screenshot(path=str(ROOT/(game+'-'+LABEL+'-failure.png')))
   reports.append(report);(ROOT/(LABEL+'-browser.json')).write_text(json.dumps(reports,indent=2));print(json.dumps(report),flush=True)
   await context.close()
  await browser.close()

asyncio.run(main())
