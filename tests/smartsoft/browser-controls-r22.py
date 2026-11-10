"""Visible per-title menus and revocable AUTO on the loopback fixture only."""
import asyncio
import importlib.util
import json
import os
import sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('shell',Path(__file__).with_name('browser-shell-r22.py'))
shell=importlib.util.module_from_spec(spec);spec.loader.exec_module(shell)
n=shell.natural

async def main():
    report=[]
    async with n.async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        errors=[]
        ctx.on('page',lambda pg:pg.on('pageerror',lambda e:errors.append(str(e))))
        for game in (sys.argv[1:] or n.IDS):
            pg=await n.open_game(ctx,game,reset_stake=False)
            await shell.set_bet(pg,'1.00')
            menu=pg.locator('[data-control="menu"]:visible:enabled, #nativeControls .native-menu:visible:enabled').first
            await menu.click();await pg.locator('#menuDialog[open]').wait_for()
            for button in ['menuSound','menuMusic','menuTurbo']:
                before=await pg.locator('#'+button).inner_text()
                await pg.locator('#'+button).click()
                assert await pg.locator('#'+button).inner_text()!=before,(game,button)
                await pg.locator('#'+button).click()
                assert await pg.locator('#'+button).inner_text()==before,(game,button)
            await pg.locator('#menuRules').click();await pg.locator('#rulesDialog[open]').wait_for()
            await pg.screenshot(path=str(shell.OUT/(game+'-rules.png')))
            await pg.locator('#closeRules').click()
            await menu.click();await pg.locator('#menuHistory').click()
            await pg.locator('#historyDialog[open]').wait_for();await pg.locator('#closeHistory').click()
            auto=pg.locator('[data-control="autoplay"]:visible:enabled')
            await auto.click();await pg.locator('#autoplayDialog[open]').wait_for()
            choice=pg.locator('[aria-label="25 spins"]:visible')
            if await choice.count():await choice.click()
            else:await pg.locator('#autoplayCount').select_option('25')
            await pg.locator('#startAutoplay').click()
            await n.wait(pg,"()=>!document.querySelector('#autoplayRunning').hidden",10)
            await auto.click()
            await n.wait(pg,"()=>document.querySelector('#autoplayRunning').hidden&&!document.querySelector('#play').disabled&&document.querySelector('#playLabel').textContent!=='STOP'",180)
            count=len(pg.native_start_requests)
            await pg.wait_for_timeout(1200)
            assert len(pg.native_start_requests)==count,game
            result={'game':game,'sound':True,'music':True,'turbo':True,'rules':True,'history':True,'autoplayStartStop':True,'noFurtherWagersAfterStop':True}
            report.append(result);print(json.dumps(result),flush=True)
            await pg.close()
        assert not errors,errors
        final=await n.status(ctx);assert final['outgoingWrites']==0
        (shell.OUT/'controls.json').write_text(json.dumps({'checks':report,'errors':errors,'status':final},indent=2)+'\n')
        await b.close()
asyncio.run(main())
