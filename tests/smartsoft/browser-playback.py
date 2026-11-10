"""Exercise actual native rounds in the loopback-only review, never production."""
import asyncio
import json
import os
from pathlib import Path
import time
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

ORIGIN=os.environ.get('SMARTSOFT_REVIEW_ORIGIN','http://127.0.0.1:8765')
if urlsplit(ORIGIN).hostname not in ('127.0.0.1','localhost'):
    raise ValueError('LOOPBACK_REVIEW_ONLY')
ARTIFACTS=Path(__file__).resolve().parent/'artifacts'/'playback-r15'
ARTIFACTS.mkdir(parents=True,exist_ok=True)
IDS=['multihot100_native','habeshafortune5_native','multihotwildways_native',
     'multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native',
     'burningice_native','burningice10_native','burningice40_native']

async def until(page,js,timeout=60):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        if await page.evaluate(js):return
        await page.wait_for_timeout(200)
    raise AssertionError(await page.locator('#notice').inner_text())

async def main(ids):
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
            args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        context=await browser.new_context(viewport={'width':390,'height':844})
        await context.add_init_script('''window.__reviewAudio=[];
          {const original=AudioBufferSourceNode.prototype.start;
           AudioBufferSourceNode.prototype.start=function(...args){
            window.__reviewAudio.push({at:performance.now(),duration:this.buffer?.duration,loop:this.loop});
            return original.apply(this,args);};}''')
        report=[]
        for game in ids:
            page=await context.new_page();await page.bring_to_front();errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            await page.goto(ORIGIN+'/games/'+game,wait_until='domcontentloaded',timeout=45000)
            await until(page,"()=>document.body.classList.contains('integrated-reference')&&document.querySelector('#presentationNote')?.hidden===true",120)
            await until(page,"()=>document.querySelector('#startupYes')&&!document.querySelector('#startupYes').disabled",30)
            await page.locator('#startupYes').click()
            await until(page,"()=>document.querySelector('#startupCover')?.dataset.phase==='open'&&!document.querySelector('#play').disabled",30)
            # The native renderer intentionally hides the HTML select. Choose
            # through its visible title-specific bet dialog when needed.
            if await page.locator('#stake').input_value()!='1.00':
                await page.locator('[data-control="bet"]:visible').click()
                await page.locator('#betDialog [aria-label="1.00 ETB"]:visible').click()
            before=await (await context.request.get(ORIGIN+'/api/remaining20/state?game_id='+game)).json()
            await page.screenshot(path=str(ARTIFACTS/(game+'-before.png')))
            play=page.locator('[data-control="play"]:visible')
            if not await play.count():play=page.locator('#play')
            await play.click()
            await page.wait_for_timeout(350)
            await page.screenshot(path=str(ARTIFACTS/(game+'-motion.png')))
            await until(page,"()=>!document.querySelector('#play').disabled&&!['STOP','RESULT SEQUENCE','CONFIRMING'].includes(document.querySelector('#playLabel')?.textContent)",60)
            after=await (await context.request.get(ORIGIN+'/api/remaining20/state?game_id='+game)).json()
            assert after['round'] and after['round']['stakeMinor']=='100',after
            credited=int(after['round']['payoutMinor']) if after['round']['status']=='settled' else 0
            assert round(float(after['balance'])*100)==round(float(before['balance'])*100)-100+credited
            if after['round']['status']=='active':
                await page.locator('#collect').click()
                await page.wait_for_timeout(500)
            sound=page.locator('[data-control="sound"]:visible')
            if await sound.count() and await sound.is_enabled():
                before_sound=await page.locator('#menuSound').text_content()
                await sound.click();assert before_sound!=await page.locator('#menuSound').text_content()
                await sound.click()
                sound_checked=True
            else:
                # The legacy Ice reference has its sound control in the menu.
                await page.locator('.native-menu:visible').click()
                await page.locator('#menuDialog[open]').wait_for(state='visible')
                before_sound=await page.locator('#menuSound').text_content()
                await page.locator('#menuSound').click()
                assert before_sound!=await page.locator('#menuSound').text_content()
                await page.locator('#menuSound').click()
                await page.evaluate("document.querySelector('#menuDialog').close()")
                sound_checked=True
            # AUTO is tested through its real visible native dialog and controller.
            auto=page.locator('[data-control="autoplay"]:visible')
            if not await auto.count():auto=page.locator('#autoplay')
            await auto.click()
            await page.locator('#autoplayDialog[open]').wait_for(state='visible',timeout=20000)
            count=page.locator('[aria-label="25 spins"]:visible')
            if await count.count():await count.click()
            await page.locator('#startAutoplay').click()
            await until(page,"()=>!document.querySelector('#autoplayRunning').hidden",10)
            await page.wait_for_timeout(750)
            await page.locator('#stopAutoplay').click()
            await until(page,"()=>document.querySelector('#autoplayRunning').hidden",10)
            await until(page,"()=>!document.querySelector('#play').disabled&&!['STOP','RESULT SEQUENCE','CONFIRMING'].includes(document.querySelector('#playLabel')?.textContent)",60)
            await page.screenshot(path=str(ARTIFACTS/(game+'-after.png')))
            audio=await page.evaluate('window.__reviewAudio')
            assert audio,game
            assert not errors,errors
            record={'id':game,'nativeRoundStarted':True,'autoplayStartedAndStopped':True,
                    'soundControl':sound_checked,'audioStarts':len(audio),
                    'errors':errors,'realMoneyRoundsPlaced':0}
            report.append(record);print(json.dumps(record),flush=True)
            await page.close()
        status=await (await context.request.get(ORIGIN+'/__review/status')).json()
        assert status['outgoingWrites']==0,status
        (ARTIFACTS/'results.json').write_text(json.dumps({'games':report,'status':status},indent=2)+'\n')
        await browser.close()

if __name__=='__main__':
    import sys
    ids=sys.argv[1:] or IDS
    if any(game not in IDS for game in ids):raise ValueError('UNSUPPORTED_REVIEW_TITLE')
    asyncio.run(main(ids))
