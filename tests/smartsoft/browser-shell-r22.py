"""Exercise the actual nine account apps against the isolated native evaluator.

The local-review server is loopback only and rejects every outgoing write.
Checks visible inputs, consecutive rounds, receipt accounting and both sizes.
"""
import asyncio
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys

spec=importlib.util.spec_from_file_location('natural',Path(__file__).with_name('browser-natural-r17.py'))
natural=importlib.util.module_from_spec(spec)
spec.loader.exec_module(natural)
OUT=Path(os.environ.get('SMARTSOFT_SHELL_EVIDENCE','/workspace/work/shell-r22'))
OUT.mkdir(parents=True,exist_ok=True)

def minor(value):
    return int(value.replace('.',''))

async def set_bet(page,amount,currency='ETB'):
    await page.locator('[data-control="bet"]:visible:enabled').click()
    await page.locator('#betDialog[open]').wait_for()
    if await page.locator('#betDialog #stake:visible').count():
        await page.locator('#stake').select_option(amount)
        await page.locator('#closeBet').click()
    else:
        choice=page.locator('#betDialog [aria-label="'+amount+' '+currency+'"]:visible')
        for _ in range(15):
            if await choice.count():break
            values=await page.locator('#betDialog button[aria-label$=" '+currency+'"]:visible').evaluate_all('(es)=>es.map(e=>Number(e.getAttribute("aria-label").split(" ")[0].replaceAll(",","")))')
            direction='Previous' if values and float(amount)<min(values) else 'Next'
            await page.get_by_role('button',name=direction+' bet levels',exact=True).click()
        await choice.click()
    assert await page.locator('#stake').input_value()==amount

async def main(selected):
    reports=[]
    async with natural.async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
            record_video_dir=str(OUT/'video'),record_video_size={'width':390,'height':844})
        errors=[]
        context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
        for game in selected:
            page=await natural.open_game(context,game)
            for selector in ['.title-row','.feature-strip','.result-strip','.player-bar']:
                assert not await page.locator(selector).is_visible(),(game,selector)
            bet=page.locator('[data-control="bet"]:visible:enabled')
            await set_bet(page,'2.00')
            assert await page.locator('#stake').input_value()=='2.00',game
            await set_bet(page,'1.00')
            rounds=[]
            for index in range(6):
                target=['1.00','1.00','1.00','2.00','5.00','10.00'][index]
                if await page.locator('#stake').input_value()!=target:
                    latest=await natural.state(context,game)
                    if (latest.get('round') or {}).get('status')=='active':
                        await natural.collect_visible(page)
                        await natural.wait(page,"()=>!document.querySelector('#stake').disabled")
                    await set_bet(page,target)
                before=await natural.state(context,game)
                count=len(page.native_start_requests)
                await page.locator('[data-control="play"]:visible:enabled').click()
                samples=[]
                for _ in range(5):
                    samples.append(await page.locator('#scene').evaluate('(c)=>c.toDataURL()'))
                    await page.wait_for_timeout(140)
                await natural.wait(page,"()=>!document.querySelector('#play').disabled&&!['STOP','CONFIRMING','RESULT SEQUENCE','CONFIRM ACTION'].includes(document.querySelector('#playLabel').textContent)",180)
                after=await natural.state(context,game)
                old=before.get('round') or {}
                award=int(old.get('currentCashoutMinor') or 0) if old.get('status')=='active' else 0
                payout=int(after['round'].get('payoutMinor') or 0) if after['round']['status']=='settled' else 0
                assert minor(after['balance'])==minor(before['balance'])+award-minor(target)+payout,(game,before,after)
                assert after['round']['round_id']!=old.get('round_id'),game
                assert len(page.native_start_requests)==count+1,(game,count,len(page.native_start_requests))
                unique=len({hashlib.sha256(s.encode()).hexdigest() for s in samples})
                assert unique>1,(game,'no reel movement')
                rounds.append({'spin':index+1,'stake':target,'uniqueCanvasSamples':unique,'status':after['round']['status'],'collectThenSpin':old.get('status')=='active','balanceCorrect':True})
            await page.screenshot(path=str(OUT/(game+'-portrait.png')))
            await page.set_viewport_size({'width':844,'height':390})
            await page.wait_for_timeout(1200)
            bounds=await page.locator('#stage').bounding_box()
            assert 0<bounds['width']<=844 and 0<bounds['height']<=390,(game,bounds)
            await page.screenshot(path=str(OUT/(game+'-landscape.png')))
            result={'game':game,'rounds':rounds,'genericCabinetVisible':False,'landscapeFits':True}
            reports.append(result)
            print(json.dumps(result),flush=True)
            await page.close()
            await page.video.save_as(str(OUT/'video'/(game+'.webm')))
        final=await natural.status(context)
        assert final['outgoingWrites']==0,final
        assert not errors,errors
        (OUT/'results.json').write_text(json.dumps({'checks':reports,'errors':errors,'status':final},indent=2)+'\n')
        await browser.close()

if __name__=='__main__':
    asyncio.run(main(sys.argv[1:] or natural.IDS))
