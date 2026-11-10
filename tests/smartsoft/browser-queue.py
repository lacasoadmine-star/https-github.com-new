"""Read-only browser check of the original Player's upcoming-game inventory."""
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

ORIGIN=os.environ.get('SMARTSOFT_TEST_ORIGIN','http://127.0.0.1:8765')
parsed=urlsplit(os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY') or '')
PROXY=None
if parsed.hostname and urlsplit(ORIGIN).hostname not in ('localhost','127.0.0.1'):
    PROXY={'server':parsed.scheme+'://'+parsed.hostname+(':'+str(parsed.port) if parsed.port else '')}
    if parsed.username:PROXY['username']=parsed.username
    if parsed.password:PROXY['password']=parsed.password
OUT=Path(__file__).resolve().parent/'artifacts'/'queue-r15'
OUT.mkdir(parents=True,exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy=PROXY,args=['--no-sandbox'])
        page=await browser.new_page(viewport={'width':390,'height':844})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto(ORIGIN+'/',wait_until='domcontentloaded',timeout=45000)
        await page.get_by_text('1,000 preparing',exact=True).wait_for(timeout=30000)
        await page.locator('#upcoming-games summary').click()
        cards=page.locator('.construction-cards article');assert await cards.count()==24
        initial=await cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.queueId)')
        for _ in range(100):
            # Images are lazy. Scroll each row into view, then verify decoded artwork.
            await cards.last.scroll_into_view_if_needed()
            await page.wait_for_timeout(100)
            if await page.locator('.construction-cards img').evaluate_all('(nodes)=>nodes.length===24&&nodes.every(n=>n.complete&&n.naturalWidth>0)'):break
            await cards.first.scroll_into_view_if_needed()
        decoded=await page.locator('.construction-cards img').evaluate_all('(nodes)=>nodes.filter(n=>n.complete&&n.naturalWidth>0).length')
        assert decoded==24,decoded
        await page.locator('#upcoming-games').screenshot(path=str(OUT/'upcoming.png'))
        await page.locator('.construction-pages button').last.click()
        await page.get_by_text('2 / 42',exact=True).wait_for()
        following=await cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.queueId)')
        assert not set(initial)&set(following)
        await page.locator('.construction-search input').fill('book of dead')
        await page.locator('.construction-search button').click()
        await page.get_by_role('heading',name='Book of Dead',exact=True).wait_for()
        await page.locator('.construction-search input').fill('')
        await page.locator('.construction-search select').select_option(label='Hacksaw Gaming')
        await page.locator('.construction-search button').click()
        await page.get_by_text('15 games being prepared',exact=True).wait_for()
        assert await cards.count()==15
        assert await page.locator('#upcoming-games a[href]').count()==0
        # The existing new-game card opens the same-origin account page directly.
        button=page.locator('[data-r20-game="multihot100_native"] .r20-native-open').first
        await button.click(timeout=15000)
        await page.wait_for_url(ORIGIN+'/games/multihot100_native')
        assert await page.locator('html').get_attribute('data-reference-display')=='r15'
        assert not errors,errors
        report={'references':1000,'firstPageCoversDecoded':decoded,'pagination':True,'studioFilter':True,
                'nameSearch':True,'directAccountEntry':True,'financialActions':0,'errors':errors}
        (OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report),flush=True)
        await browser.close()

asyncio.run(main())
