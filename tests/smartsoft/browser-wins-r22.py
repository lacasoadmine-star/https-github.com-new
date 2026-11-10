"""Known native evaluator wins: collect+spin, red/black and final collection."""
import asyncio
import importlib.util
import json
from pathlib import Path
spec=importlib.util.spec_from_file_location('shell',Path(__file__).with_name('browser-shell-r22.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
n=s.natural
async def main():
    results=[]
    async with n.async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        for game in n.IDS:
            pg=await n.open_game(ctx,game,reset_stake=False)
            for index in range(2):
                before=await n.state(ctx,game)
                async with pg.expect_response(lambda r:r.request.method=='POST' and r.url.endswith('/api/remaining20/action') and r.request.post_data_json.get('type')=='start',timeout=20000):
                    await pg.locator('[data-control="play"]:visible:enabled').click()
                await pg.wait_for_timeout(100)
                await n.wait(pg,"()=>!document.querySelector('#play').disabled&&!['STOP','CONFIRMING','RESULT SEQUENCE','CONFIRM ACTION'].includes(document.querySelector('#playLabel').textContent)",180)
                after=await n.state(ctx,game)
                assert after['round']['status']=='active',game
                assert after['round']['round_id']!=(before.get('round') or {}).get('round_id'),game
                award=int((before.get('round') or {}).get('currentCashoutMinor') or 0) if (before.get('round') or {}).get('status')=='active' else 0
                assert s.minor(after['balance'])==s.minor(before['balance'])+award-100,game
            gamble=pg.locator('[data-control="gamble"]:visible:enabled,#gamble:visible:enabled').first
            await gamble.click();await pg.locator('#gambleDialog[open]').wait_for()
            before=await n.state(ctx,game)
            async with pg.expect_response(lambda r:r.request.method=='POST' and r.url.endswith('/api/remaining20/action') and r.request.post_data_json.get('action')=='gamble',timeout=20000):
                await pg.locator('#red:visible:enabled').click()
            await n.wait(pg,"()=>!document.querySelector('#refresh').disabled",30)
            after=await n.state(ctx,game)
            assert after['round']['round_id']==before['round']['round_id'],game
            assert after['round']['version']==before['round']['version']+1,game
            assert after['balance']==before['balance'],game
            if after['round']['status']=='active':
                assert int(after['round']['currentCashoutMinor'])==int(before['round']['currentCashoutMinor'])*2,game
                await pg.locator('#gambleCollect:visible:enabled').click()
                await n.wait(pg,"()=>!document.querySelector('#stake').disabled",30)
                settled=await n.state(ctx,game)
                assert s.minor(settled['balance'])==s.minor(after['balance'])+int(after['round']['currentCashoutMinor']),game
            else:
                assert after['round']['payoutMinor']=='0',game
                await pg.locator('#closeGamble').click()
            result={'game':game,'seededNativeWinFixture':True,'takeWinThenSpin':True,'gambleChangesVersionOnce':True,'noGambleDebit':True,'collectAccounting':True}
            results.append(result);print(json.dumps(result),flush=True)
            (s.OUT/'wins.json').write_text(json.dumps({'checks':results,'status':await n.status(ctx)},indent=2)+'\n')
            await pg.close()
        (s.OUT/'wins.json').write_text(json.dumps({'checks':results,'status':await n.status(ctx)},indent=2)+'\n')
        await b.close()
asyncio.run(main())
