"""Verify the actual deployed signed-out flow. No API routes are intercepted.

This submits no login, wager or wallet request and creates no account.
"""
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

ORIGIN='https://superwin-player.apdiy61.workers.dev'
IDS=['multihotdeluxe_native','multihot100_native','habeshafortune5_native',
     'multihotwildways_native','multihot5wild_native','multihot5superwilds_native',
     'burningice_native','burningice10_native','burningice40_native']

async def main(ids):
    parsed=urlsplit(os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY') or '')
    proxy=None
    if parsed.hostname:
        proxy={'server':parsed.scheme+'://'+parsed.hostname+(':'+str(parsed.port) if parsed.port else '')}
        if parsed.username:proxy['username']=parsed.username
        if parsed.password:proxy['password']=parsed.password
    report=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy=proxy,args=['--no-sandbox'])
        for game in ids:
            context=await browser.new_context(viewport={'width':390,'height':844})
            page=await context.new_page();errors=[];writes=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:writes.append(urlsplit(r.url).path) if r.method not in ['GET','HEAD','OPTIONS'] else None)
            await page.goto(ORIGIN+'/games/'+game,wait_until='domcontentloaded',timeout=45000)
            await page.wait_for_url(ORIGIN+'/?play='+game,timeout=30000)
            await page.wait_for_function("()=>[...document.querySelectorAll('input')].some(x=>x.type==='password'&&x.getBoundingClientRect().width>0)",timeout=30000)
            saved=await page.evaluate("sessionStorage.getItem('zplay.native.launch.return')")
            assert saved=='/games/'+game,(game,saved)
            identity=await(await context.request.get(ORIGIN+'/api/machine-session')).json()
            assert identity.get('authenticated') is False,identity
            assert not errors,errors
            assert not any('/remaining20/action' in x or '/wallet/' in x or x.endswith('/login') or x.endswith('/register') for x in writes),writes
            row={'game':game,'actualDeployedWebsite':True,'apiInterceptions':0,'originalLoginVisible':True,
                 'sameOriginReturnSaved':True,'signedOutIdentityConfirmed':True,'financialWrites':0,'pageErrors':errors}
            report.append(row);print(json.dumps(row),flush=True)
            await context.close()
        await browser.close()
    output=Path('/workspace/superwin-live/evidence/r18-production-auth-proof.json')
    output.write_text(json.dumps({'games':report,'realMoneyRoundsPlaced':0,'productionAccountsCreated':0},indent=2)+'\n')

if __name__=='__main__':
    import sys
    ids=sys.argv[1:] or IDS
    if any(x not in IDS for x in ids):raise ValueError('UNREVIEWED_GAME')
    asyncio.run(main(ids))
