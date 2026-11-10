"""Natural completion and revocable input on the loopback review only.

Never presses STOP in the natural or finite AUTO cases. No production wagers,
production account cookies or databases are available through this fixture.
"""
import asyncio
import json
import os
from pathlib import Path
import time
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

ORIGIN=os.environ.get('SMARTSOFT_REVIEW_ORIGIN','http://127.0.0.1:8873')
if urlsplit(ORIGIN).hostname not in ('127.0.0.1','localhost'):
    raise ValueError('LOOPBACK_REVIEW_ONLY')
IDS=['multihot100_native','habeshafortune5_native','multihotwildways_native',
     'multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native',
     'burningice_native','burningice10_native','burningice40_native']
OUT=Path(__file__).resolve().parent/'artifacts'/'natural-r17'
OUT.mkdir(parents=True,exist_ok=True)

async def wait(page,js,timeout=90):
    until=time.monotonic()+timeout
    while time.monotonic()<until:
        if await page.evaluate(js):return
        await page.wait_for_timeout(100)
    state=await page.evaluate("()=>({label:document.querySelector('#playLabel')?.textContent,notice:document.querySelector('#notice')?.textContent,errors:window.__naturalErrors})")
    raise AssertionError(state)

async def status(context):
    return await(await context.request.get(ORIGIN+'/__review/status')).json()

async def state(context,game):
    return await(await context.request.get(ORIGIN+'/api/remaining20/state?game_id='+game)).json()

async def collect_visible(page):
    # Native Ice layouts paint their own collect control and hide the retained
    # HTML control. Exercise the visible target that the player can actually tap.
    control=page.locator('[data-control="collect"]:visible:enabled, #collect:visible:enabled').first
    await control.wait_for(state='visible')
    await control.click()

async def open_game(context,game):
    page=await context.new_page()
    page.native_start_requests=set()
    def track_request(request):
        if request.method=='POST' and request.url==ORIGIN+'/api/remaining20/action':
            body=request.post_data_json
            if body.get('type')=='start':page.native_start_requests.add(body['request_id'])
    page.on('request',track_request)
    await page.goto(ORIGIN+'/games/'+game,wait_until='domcontentloaded',timeout=45000)
    await wait(page,"()=>document.querySelector('#startupCover')?.dataset.phase==='open'||document.querySelector('#startupYes')&&!document.querySelector('#startupYes').disabled")
    if await page.locator('#startupCover').get_attribute('data-phase')!='open':
        await page.locator('#startupYes').click()
    await wait(page,"()=>document.querySelector('#startupCover')?.dataset.phase==='open'&&!document.querySelector('#play').disabled")
    existing=await state(context,game)
    if (existing.get('round') or {}).get('status')=='active':
        await collect_visible(page)
    if await page.locator('#stake').input_value()!='1.00':
        await page.locator('[data-control="bet"]:visible').click()
        await page.locator('#betDialog [aria-label="1.00 ETB"]:visible').click()
    return page

async def natural_round(context,page,game,start=None):
    before=await state(context,game);count=len(page.native_start_requests);began=time.monotonic()
    if start:await start()
    else:await page.locator('[data-control="play"]:visible').click()
    await wait(page,"()=>!document.querySelector('#play').disabled&&!['STOP','CONFIRMING','RESULT SEQUENCE','CONFIRM ACTION'].includes(document.querySelector('#playLabel').textContent)",180)
    after=await state(context,game)
    assert after['round'] and after['round']['round_id']!=(before.get('round') or {}).get('round_id'),after
    assert len(page.native_start_requests)==count+1,(game,len(page.native_start_requests),count)
    report={'game':game,'elapsedSeconds':round(time.monotonic()-began,3),'frames':len(after['round'].get('frames',[])),
            'naturalCompletion':True,'wagers':1,'stopClicked':False,'realMoneyRoundsPlaced':0}
    if after['round']['status']=='active':await collect_visible(page)
    await wait(page,"()=>!document.querySelector('#stake').disabled")
    return report

async def main(selected,advanced,touch_only=False,native_stop_only=False):
    report=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        errors=[]
        context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
        for game in ([] if touch_only or native_stop_only else selected):
            page=await open_game(context,game)
            result=await natural_round(context,page,game);report.append(result);print(json.dumps(result),flush=True)
            await page.close()
        if native_stop_only:
            for game in selected:
                page=await open_game(context,game)
                auto=page.locator('[data-control="autoplay"]:visible')
                await auto.click();await page.locator('#autoplayDialog[open]').wait_for()
                option=page.locator('[aria-label="25 spins"]:visible')
                if await option.count():await option.click()
                await page.locator('#startAutoplay').click()
                await wait(page,"()=>!document.querySelector('#autoplayRunning').hidden",10)
                await page.wait_for_timeout(300)
                assert await auto.is_enabled(),game
                assert await auto.get_attribute('aria-label')=='Stop autoplay',game
                await auto.click()
                await wait(page,"()=>document.querySelector('#autoplayRunning').hidden",10)
                await wait(page,"()=>document.querySelector('#playLabel').textContent!=='STOP'",180)
                count=len(page.native_start_requests);await page.wait_for_timeout(3000)
                assert len(page.native_start_requests)==count,(game,count,len(page.native_start_requests))
                result={'game':game,'case':'native_autoplay_stop','stoppedThroughOriginalNativeButton':True,
                        'noFurtherWagersAfterStop':True,'acceptedWagers':count,'realMoneyRoundsPlaced':0}
                report.append(result);print(json.dumps(result),flush=True);await page.close()
        elif touch_only:
            game='multihot100_native';page=await open_game(context,game)
            client=await context.new_cdp_session(page)
            async def touch_release():
                box=await page.locator('[data-control="play"]:visible').bounding_box()
                point={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':1}
                await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[point]})
                await page.wait_for_timeout(700)
                await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            result=await natural_round(context,page,game,touch_release)
            count=len(page.native_start_requests);await page.wait_for_timeout(3000)
            assert len(page.native_start_requests)==count
            result.update(case='mobile_touch_hold_released',noFurtherWagersAfterRelease=True)
            report.append(result);print(json.dumps(result),flush=True);await page.close()
        elif advanced:
            game='multihot100_native';page=await open_game(context,game)
            async def hold_release():
                box=await page.locator('[data-control="play"]:visible').bounding_box()
                await page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
                await page.mouse.down();await page.wait_for_timeout(700);await page.mouse.up()
            result=await natural_round(context,page,game,hold_release)
            count=len(page.native_start_requests);await page.wait_for_timeout(3000)
            assert len(page.native_start_requests)==count
            result.update(case='hold_released',noFurtherWagersAfterRelease=True);report.append(result);print(json.dumps(result),flush=True)

            async def delayed(route,request):
                if request.method=='POST':
                    response=await route.fetch();await asyncio.sleep(3);await route.fulfill(response=response)
                else:await route.continue_()
            await page.route('**/api/remaining20/action',delayed)
            result=await natural_round(context,page,game)
            await page.unroute('**/api/remaining20/action',delayed)
            result['case']='delayed_acceptance_response';report.append(result);print(json.dumps(result),flush=True)

            async def hidden():
                await page.locator('[data-control="play"]:visible').click()
                await page.wait_for_timeout(300)
                await page.evaluate("()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));}")
                await page.wait_for_timeout(1500)
                await page.evaluate("()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));}")
            result=await natural_round(context,page,game,hidden)
            result['case']='visibility_resume';report.append(result);print(json.dumps(result),flush=True)
            await page.close()

            game='multihotwildways_native';page=await open_game(context,game)
            count=len(page.native_start_requests);await page.locator('[data-control="autoplay"]:visible').click()
            await page.locator('#autoplayDialog[open]').wait_for()
            await page.locator('[aria-label="25 spins"]:visible').click()
            await page.locator('#startAutoplay').click()
            await wait(page,"()=>!document.querySelector('#autoplayRunning').hidden",10)
            await wait(page,"()=>document.querySelector('#autoplayRunning').hidden&&!document.querySelector('#play').disabled&&document.querySelector('#playLabel').textContent!=='STOP'",240)
            total=len(page.native_start_requests)-count
            assert total==25,{'finiteAutoplayWagers':total}
            await page.wait_for_timeout(3000);assert len(page.native_start_requests)-count==25
            result={'game':game,'case':'finite_autoplay','requestedSpins':25,'actualWagers':25,'stopClicked':False,'realMoneyRoundsPlaced':0}
            report.append(result);print(json.dumps(result),flush=True);await page.close()
        assert not errors,errors
        final=await status(context);assert final['outgoingWrites']==0,final
        mode='native-auto-stop' if native_stop_only else 'mobile-touch' if touch_only else 'advanced' if advanced else 'natural'
        (OUT/('results-'+mode+'.json')).write_text(json.dumps({'checks':report,'errors':errors,'status':final},indent=2)+'\n')
        await browser.close()

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('games',nargs='*',choices=IDS)
    parser.add_argument('--advanced',action='store_true')
    parser.add_argument('--touch-hold-only',action='store_true')
    parser.add_argument('--native-auto-stop-only',action='store_true')
    args=parser.parse_args()
    asyncio.run(main(args.games or IDS,args.advanced,args.touch_hold_only,args.native_auto_stop_only))
