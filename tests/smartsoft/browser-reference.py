import asyncio
import os
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright
from urllib.parse import urlsplit
_proxy_url=os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
PROXY=None
if _proxy_url:
    _proxy=urlsplit(_proxy_url)
    PROXY={'server':_proxy.scheme+'://'+_proxy.hostname+(':'+str(_proxy.port) if _proxy.port else '')}
    if _proxy.username:PROXY['username']=_proxy.username
    if _proxy.password:PROXY['password']=_proxy.password

# Explicit isolated UI fixtures. No money is created in any remote database.
IDS = {'multihot100_native':'5fddea498e1f0d39','habeshafortune5_native':'7161514f85b0565e','multihotwildways_native':'b930310f3d5338cd','multihot5wild_native':'b930310f3d5338cd','multihot5superwilds_native':'3d420e4fe5830b46','multihotdeluxe_native':'fe6fe5c2996189a2','burningice_native':'3d420e4fe5830b46','coinminer_native':'6d57eebb88faa105','burningice10_native':'cc0f22635df0e9c7','burningice40_native':'cc0f22635df0e9c7'}
ORIGIN = os.environ.get('SMARTSOFT_TEST_ORIGIN','http://127.0.0.1:8765')
ARTIFACTS=Path(__file__).resolve().parent/'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
os.chdir(ARTIFACTS)
Path('evidence').mkdir(exist_ok=True)

import sys
if len(sys.argv)>1:IDS={k:IDS[k] for k in sys.argv[1:]}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, proxy=PROXY, args=['--no-sandbox'])
        context = await browser.new_context(viewport={'width':int(os.environ.get('SMARTSOFT_TEST_WIDTH','390')),'height':int(os.environ.get('SMARTSOFT_TEST_HEIGHT','844'))})
        report = []
        for game, group in IDS.items():
            page = await context.new_page()
            errors, writes = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            response = await context.request.get(ORIGIN + '/native-library/remaining20/20261110-reference-mobile-r14/' + group + '/games.json')
            assert response.status == 200, await response.text()
            config = next(x for x in await response.json() if x['id'] == game)
            # The real server retains its old descriptor. Exercise the client
            # merge instead of pretending the backend already knows R14.
            previous_namespace='20261110-accepted-controls-r12' if group=='cc0f22635df0e9c7' else '20261110-account-entry-r13'
            previous_response=await context.request.get(ORIGIN+'/native-library/remaining20/'+previous_namespace+'/'+group+'/games.json')
            config=next(x for x in await previous_response.json() if x['id']==game)
            fixture = {'balance':'137.25', 'session':'isolated-account-A'}
            # This script is an explicit isolated account fixture. Actual
            # signed-out deployment checks live in browser-auth-r18.py.
            await page.route('**/api/machine-session',lambda route:route.fulfill(json={'authenticated':True}))
            async def route(request_route, request, *, config=config, fixture=fixture):
                if request.method != 'GET':
                    writes.append(request.url)
                    await request_route.fulfill(status=409, json={'error':'ISOLATED_TEST_READ_ONLY'})
                elif '/history?' in request.url:
                    await request_route.fulfill(json={'rows':[], 'currency':'ETB'})
                else:
                    await request_route.fulfill(json={'authenticated':True, 'sessionId':fixture['session'], 'game':config, 'currency':'ETB', 'balance':fixture['balance'], 'round':None, 'accepting':False, 'server_now':int(time.time()*1000)})
            await page.route('**/api/remaining20/**', route)
            response = await page.goto(ORIGIN + '/games/' + game, wait_until='domcontentloaded', timeout=30000)
            deadline = time.monotonic() + 100
            while time.monotonic() < deadline:
                ready = await page.evaluate("()=>document.body.classList.contains('integrated-reference')&&document.querySelector('#nativeControls')?.children.length>0&&document.querySelector('#presentationNote')?.hidden===true")
                if ready:
                    break
                await page.wait_for_timeout(250)
            assert ready, await page.evaluate("()=>({note:document.querySelector('#presentationNote')?.textContent,phase:document.querySelector('#startupCover')?.dataset.phase,body:document.body.className})")
            yes = page.locator('#startupYes:visible')
            if await yes.count() and await yes.is_enabled():
                await yes.click(timeout=2000)
            await page.wait_for_timeout(500)
            for _ in range(80):
                if await page.evaluate("()=>document.querySelector('#startupCover')?.dataset.phase==='open'||document.body.classList.contains('coin-reference')"):break
                yes=page.locator('#startupYes:visible')
                if await yes.count() and await yes.is_enabled():await yes.click()
                await page.wait_for_timeout(250)
            await page.screenshot(path='evidence/r14-initial-'+game+'.png')
            visible = await page.locator('body').inner_text()
            record = {'notice':await page.locator('#notice').inner_text(),'frame':await page.locator('html').get_attribute('data-reference-frame'),'canvas':await page.locator('#scene').evaluate('(x)=>x.getBoundingClientRect().toJSON()'),'phase':await page.locator('#startupCover').get_attribute('data-phase'),'native':await page.locator('#nativeControls button').evaluate_all('(xs)=>xs.filter(x=>!x.hidden).map(x=>({name:x.dataset.control,disabled:x.disabled,rect:x.getBoundingClientRect().toJSON()}))'),'game':game, 'http':response.status, 'wallet':await page.locator('#wallet').inner_text(), 'creditsVisible':'CREDITS' in visible, 'demoBanner':await page.locator('.demo-credits-banner').count(), 'bets':await page.locator('#stake').evaluate('(x)=>[...x.options].map(o=>o.value)'), 'play':await page.locator('#play').evaluate('(x)=>({disabled:x.disabled,text:x.textContent})'), 'errors':list(errors), 'writes':list(writes)}
            assert record['wallet'] == '137.25', record
            assert not record['creditsVisible'] and record['demoBanner'] == 0, record
            assert record['bets'][0] == '1.00' and record['bets'][-1] == '40000.00', record
            assert record['play']['disabled'] and 'PAUSED' in record['play']['text'], record
            assert not errors and not writes, record
            record['controlsChecked'] = []
            increase = page.locator('[data-control="increase"]:visible')
            if await increase.count() and await increase.is_enabled():
                before = await page.locator('#stake').input_value()
                await increase.click()
                after = await page.locator('#stake').input_value()
                assert before != after, game
                await page.locator('[data-control="decrease"]:visible').click()
                assert await page.locator('#stake').input_value() == before, game
                record['controlsChecked'].append('increase/decrease')
            bet = page.locator('[data-control="bet"]:visible')
            if await bet.count() and await bet.is_enabled():
                await bet.click()
                await page.wait_for_timeout(300)
                assert await page.locator('#betDialog').evaluate('(x)=>x.open'), game
                choices=page.locator('#betDialog .smartsoft-native-stage button[aria-label$=" ETB"]:visible')
                if await choices.count() > 1:
                    before=await page.locator('#stake').input_value()
                    await choices.nth(1).click()
                    assert await page.locator('#stake').input_value() != before, game
                    record['controlsChecked'].append('native bet selection')
                await page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
                record['controlsChecked'].append('bet dialog')
            menu=page.locator('[data-control="menu"]:visible')
            if not await menu.count():menu=page.locator('.native-menu:visible')
            if await menu.count() and await menu.is_enabled():
                await menu.click()
                await page.locator('#menuDialog[open]').wait_for(state='visible',timeout=8000)
                sound=page.locator('#menuSound:visible')
                if await sound.count():
                    before=await sound.inner_text()
                    await sound.click()
                    assert await sound.inner_text()!=before,game
                    record['controlsChecked'].append('sound toggle')
                await page.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
                record['controlsChecked'].append('menu')
            assert not writes,record

            # A later server identity and balance replace the previous account.
            fixture.update({'balance':'47.35', 'session':'isolated-account-B'})
            await page.evaluate("document.querySelector('#refresh').click()")
            for attempt in range(20):
                if await page.locator('#wallet').inner_text() == '47.35':
                    break
                await page.wait_for_timeout(100)
            assert await page.locator('#wallet').inner_text() == '47.35', game
            record['changedAccountBalance'] = '47.35'
            await page.screenshot(path='evidence/r14-account-' + game + '.png')
            print(json.dumps(record), flush=True)
            report.append(record)
            await page.close()
        Path('evidence/r14-account-browser.json').write_text(json.dumps(report, indent=2))
        await browser.close()

asyncio.run(main())
