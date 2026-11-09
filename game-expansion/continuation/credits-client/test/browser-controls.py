import asyncio, json
from decimal import Decimal
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://127.0.0.1:8789'
GAMES = ['burningice10_native', 'burningice40_native']
def minor(value):
    return int(Decimal(value) * 100)

async def state(page, game):
    return await page.evaluate('(id)=>fetch("/api/remaining20/demo/state?game_id="+id).then(r=>r.json())', game)

async def idle(page):
    await page.locator('[data-control=play][aria-label=SPIN]').wait_for()
    await page.wait_for_function('!document.querySelector("[data-control=play]").disabled')

async def collect(page, game):
    before = await state(page, game)
    if before['round'] and before['round']['status'] == 'active':
        win = int(before['round']['currentCashoutMinor'])
        async with page.expect_response(lambda r: r.request.method == 'POST' and '/api/remaining20/demo/action' in r.url) as received:
            await page.get_by_role('button', name='Take confirmed win', exact=True).click()
        response = await received.value
        result = await response.json()
        assert response.status == 200
        assert minor(result['balance']) == minor(before['balance']) + win
        assert result['round']['status'] == 'settled'
    await idle(page)

async def main():
    reports = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        for game in GAMES:
            context = await browser.new_context(viewport={'width':1365,'height':850}, reduced_motion='reduce', extra_http_headers={'X-Test-Subject':'pair-qa-' + game})
            page = await context.new_page()
            errors, posts = [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('request', lambda r: posts.append(r) if r.method == 'POST' and '/api/remaining20/demo/action' in r.url else None)
            await page.goto(ORIGIN + '/demo/games/' + game)
            await page.locator('#startupNo').click()
            await idle(page)
            assert await page.locator('[data-control=bet]').count() == 0
            assert await page.get_by_role('button', name='No lower bet', exact=True).is_disabled()
            initial = await state(page, game)
            assert initial['currency'] == 'CREDITS' and initial['demoCreditsOnly'] is True

            # Two synchronous DOM clicks must submit exactly one accepted round.
            count = len(posts)
            async with page.expect_response(lambda r: r.request.method == 'POST' and '/api/remaining20/demo/action' in r.url) as received:
                await page.locator('[data-control=startNext]').evaluate('(b)=>{b.click();b.click()}')
            response = await received.value
            first = await response.json()
            assert response.status == 200 and first['round']['stakeMinor'] == '200'
            await collect(page, game)
            manual_posts = posts[count:]
            assert len([r for r in manual_posts if json.loads(r.post_data)['type'] == 'start']) == 1
            assert await page.locator('#betDialog').evaluate('(d)=>d.open') is False
            assert await page.locator('#stake').input_value() == '2.00'
            assert await page.get_by_role('button', name='Spin at 5.00 CREDITS', exact=True).is_enabled()

            # Replay the exact accepted start. Its request ID may never debit twice.
            before_replay = await state(page, game)
            replay = await page.evaluate('async ({body,session})=>{const r=await fetch("/api/remaining20/demo/action",{method:"POST",headers:{"content-type":"application/json","X-Zplay-Library-Session":session},body});return {status:r.status,body:await r.json()}}',
                                        {'body':manual_posts[0].post_data, 'session':first['sessionId']})
            assert replay['status'] == 200 and replay['body']['request_id'] == first['request_id']
            assert (await state(page, game))['balance'] == before_replay['balance']

            # The lower neighbor starts with the previous configured stake.
            async with page.expect_response(lambda r: r.request.method == 'POST' and '/api/remaining20/demo/action' in r.url) as received:
                await page.get_by_role('button', name='Spin at 1.00 CREDITS', exact=True).click()
            lower = await (await received.value).json()
            assert lower['round']['stakeMinor'] == '100'
            await collect(page, game)
            prior_reload = await state(page, game)
            await page.reload()
            await page.locator('#startupNo').click()
            await idle(page)
            after_reload = await state(page, game)
            assert after_reload['balance'] == prior_reload['balance'] and after_reload['round'] == prior_reload['round']

            # Exercise the real app AUTO handler and the current R6 SQLite actor.
            await page.get_by_role('button', name='Autoplay', exact=True).click()
            await page.locator('#autoplayCount').select_option('25')
            auto_responses = []
            async def capture(response):
                if response.request.method == 'POST' and '/api/remaining20/demo/action' in response.url:
                    body = json.loads(response.request.post_data)
                    if body['type'] == 'start':
                        auto_responses.append(await response.json())
            page.on('response', capture)
            await page.locator('#startAutoplay').click()
            for _ in range(300):
                if len(auto_responses) >= 25 and await page.locator('#autoplayRunning').is_hidden():
                    break
                await page.wait_for_timeout(100)
            assert len(auto_responses) == 25, len(auto_responses)
            assert await page.locator('#autoplayRunning').is_hidden()
            page.remove_listener('response', capture)
            balance_minor = minor(after_reload['balance'])
            for receipt in auto_responses:
                assert receipt['round']['status'] == 'settled'
                balance_minor += int(receipt['round']['payoutMinor']) - int(receipt['round']['stakeMinor'])
                assert minor(receipt['balance']) == balance_minor
            assert minor((await state(page,game))['balance']) == balance_minor
            assert len({r['request_id'] for r in auto_responses}) == 25
            await idle(page)
            assert not errors, errors
            reports.append({'game':game,'manualNeighborStarts':2,'autoStarts':25,'duplicateClickRejected':True,'requestReplayNoSecondDebit':True,
                            'reloadPreservedBalanceAndReceipt':True,'receiptBalanceArithmeticVerified':True,'javascriptErrors':errors})
            print(json.dumps(reports[-1]),flush=True)
            await context.close()
        await browser.close()
    result={'scope':'Local browser controls and unchanged live R6 Coin credits actor; presentation stub; no visual/audio parity claim',
            'libraryVersion':22,'libraryVersionId':'2535be54-ed2a-4bb2-8ab1-1a268ff7a545',
            'productionRuntimeDate':'2026-11-07','localRuntimeDate':'2026-08-06','productionWagers':0,'reports':reports}
    (ROOT/'evidence/browser-controls.json').write_text(json.dumps(result,indent=2)+'\n')

asyncio.run(main())
