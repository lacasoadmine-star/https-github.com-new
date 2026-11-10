"""Use only credits demos on loopback or the existing public Player origin."""
import asyncio
import importlib.util
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
spec=importlib.util.spec_from_file_location('shell',Path(__file__).with_name('browser-shell-r22.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
n=s.natural
ORIGIN=os.environ.get('SMARTSOFT_DEMO_ORIGIN','http://127.0.0.1:8877')
if urlsplit(ORIGIN).hostname not in ['127.0.0.1','localhost','superwin-player.apdiy61.workers.dev']:
    raise ValueError('EXISTING_DEMO_OR_LOOPBACK_ONLY')
OUT=Path(os.environ.get('SMARTSOFT_DEMO_EVIDENCE','/workspace/work/demo-r22'))
OUT.mkdir(parents=True,exist_ok=True)
async def main():
    results=[]
    async with n.async_playwright() as p:
        remote=urlsplit(ORIGIN).hostname not in ['127.0.0.1','localhost']
        launch={'executable_path':'/usr/bin/chromium','headless':True,'args':['--no-sandbox']}
        if remote:launch['proxy']={'server':os.environ['HTTPS_PROXY']}
        b=await p.chromium.launch(**launch)
        ctx=await b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,
            record_video_dir=str(OUT/'video'),record_video_size={'width':390,'height':844})
        errors=[];forbidden=[]
        async def guard(route):
            req=route.request
            if req.method not in ['GET','HEAD'] and req.url!=ORIGIN+'/api/remaining20/demo/action':
                forbidden.append({'method':req.method,'url':req.url});await route.abort();return
            await route.continue_()
        await ctx.route('**/*',guard)
        async def state(game):
            r=await ctx.request.get(ORIGIN+'/api/remaining20/demo/state?game_id='+game)
            assert r.ok,await r.text()
            return await r.json()
        for game in n.IDS:
            pg=await ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)))
            posts=[]
            pg.on('request',lambda req:posts.append(req.post_data_json) if req.method=='POST' and req.url.endswith('/api/remaining20/demo/action') else None)
            await pg.goto(ORIGIN+'/demo/games/'+game,wait_until='domcontentloaded',timeout=45000)
            await n.wait(pg,"()=>document.querySelector('#startupCover')?.dataset.phase==='open'||document.querySelector('#startupYes')&&!document.querySelector('#startupYes').disabled",90)
            if await pg.locator('#startupYes').is_visible():await pg.locator('#startupYes').click()
            await n.wait(pg,"()=>!document.querySelector('#play').disabled",90)
            d=await state(game)
            if (d.get('round') or {}).get('status')=='active':await n.collect_visible(pg)
            rounds=[]
            for amount in ['1.00','2.00','5.00']:
                await n.wait(pg,"()=>!document.querySelector('#stake').disabled",90)
                await s.set_bet(pg,amount,'CREDITS')
                before=await state(game)
                await pg.locator('[data-control="play"]:visible:enabled').click()
                samples=[]
                for _ in range(4):
                    samples.append(await pg.locator('#scene').evaluate('(c)=>c.toDataURL()'))
                    await pg.wait_for_timeout(160)
                await n.wait(pg,"()=>!document.querySelector('#play').disabled&&!['STOP','CONFIRMING','RESULT SEQUENCE','CONFIRM ACTION'].includes(document.querySelector('#playLabel').textContent)",180)
                after=await state(game)
                assert after['round']['round_id']!=(before.get('round') or {}).get('round_id'),game
                assert after['demo'] is True and after['currency']=='CREDITS',game
                payout=int(after['round'].get('payoutMinor') or 0) if after['round']['status']=='settled' else 0
                assert s.minor(after['balance'])==s.minor(before['balance'])-s.minor(amount)+payout,game
                assert len(set(samples))>1,(game,'no motion')
                rounds.append({'stake':amount,'naturalCompletion':True,'balanceCorrect':True,'canvasChanged':True})
                if after['round']['status']=='active':await n.collect_visible(pg)
            for selector in ['.player-bar','.title-row','.feature-strip','.result-strip']:
                assert not await pg.locator(selector).is_visible(),(game,selector)
            assert pg.url.startswith(ORIGIN+'/demo/games/'),pg.url
            assert len([r for r in posts if r['type']=='start'])==3,(game,posts)
            await pg.screenshot(path=str(OUT/(game+'.png')))
            result={'game':game,'rounds':rounds,'demoCreditsOnly':True,'genericCabinetVisible':False}
            results.append(result);print(json.dumps(result),flush=True)
            await pg.close();await pg.video.save_as(str(OUT/'video'/(game+'.webm')))
        await b.close()
        assert not errors,errors
        assert not forbidden,forbidden
        (OUT/'results.json').write_text(json.dumps({'checks':results,'pageErrors':errors,'forbiddenRequests':forbidden,'realMoneyRoundsPlaced':0},indent=2)+'\n')
asyncio.run(main())
