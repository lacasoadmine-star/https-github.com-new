"""Observe public free demos through their visible controls. Never visits Player.

Captures rendered frames, public control geometry, sampled round state and
audio-start events. Unseen wins and features remain unverified.
"""
import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
import time
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
INIT = r"""(() => {
 const observation = window.__officialObservation = {audio: []};
 const start = AudioBufferSourceNode.prototype.start;
 AudioBufferSourceNode.prototype.start = function(...args) {
   observation.audio.push({at: performance.now(), when: args[0] || 0,
     duration: this.buffer?.duration, sampleRate: this.buffer?.sampleRate,
     loop: this.loop});
   return start.apply(this, args);
 };
})();"""
SNAPSHOT = r"""() => {
 const machine = typeof slot !== 'undefined' ? slot : null;
 const bounds = item => {try {const b=(item?.image || item?.container || item)?.getBounds?.();
   return b ? {x:b.x,y:b.y,width:b.width,height:b.height}:null;}catch{return null;}};
 const scalar = value => Object.fromEntries(Object.entries(value || {}).filter(([k,v]) =>
   /bet|balance|win|spinn|state|status|multi|board|amount|index|count/i.test(k) &&
   (v === null || ['string','boolean','number'].includes(typeof v))));
 return {at:performance.now(), body:document.body.innerText.slice(0,20000),
   info:scalar(machine?.info), data:scalar(machine?.data), dataNew:scalar(machine?.dataNew),
   keys:{info:Object.keys(machine?.info || {}),data:Object.keys(machine?.data || {})},
   publicResult:{board:machine?.data?.Board,currentBoard:machine?.dataBoard,
     nextBoard:machine?.dataNew?.Board,common:scalar(machine?.info?.common)},
   buttons:Object.fromEntries(Object.entries(machine?.buttons?.buttons || {}).map(([k,v])=>[k,
     {bounds:bounds(v),visible:v?.container?.worldVisible,interactive:v?.container?.interactive,
       properties:scalar(v)}])),
   componentKeys:Object.fromEntries(['bets','common','autoPlay','double','win'].map(k=>[k,Object.keys(machine?.[k]||{})])),
   backgrounds:[...document.querySelectorAll('body,body *')].map(node=>{
     const style=getComputedStyle(node),r=node.getBoundingClientRect();
     return {tag:node.tagName,id:node.id,className:typeof node.className==='string'?node.className:'',
       image:style.backgroundImage,size:style.backgroundSize,position:style.backgroundPosition,
       repeat:style.backgroundRepeat,filter:style.filter,width:r.width,height:r.height};
   }).filter(item=>item.width>0&&item.height>0&&(item.image!=='none'||item.filter!=='none')).slice(0,35),
   audio:window.__officialObservation?.audio || []};
}"""


CONTROL_TARGET = r"""name => {
 const machine=typeof slot!=='undefined'?slot:null;
 const item=machine?.buttons?.buttons?.[name];
 let image=item?.image || item?.container;
 if(!image?.worldVisible){
  let root=machine?.startItems?.headerContainer;
  if(!root)return null;while(root.parent)root=root.parent;
  const wanted={spin:'Buttons/SpinVertical',plus:'Buttons/PlusVertical',minus:'Buttons/MinusVertical',bet:'Buttons/Bet'}[name];
  if(!wanted)return null;
  const visit=n=>{if(!n.worldVisible)return null;const ids=n.texture?.textureCacheIds||[];
   if(ids.includes(wanted)){const b=n.getBounds();if(b.width>2&&b.x+b.width/2>0&&b.x+b.width/2<566)return n;}
   for(const child of n.children||[]){const found=visit(child);if(found)return found;}return null;};
  image=visit(root);
 }
 if(!image?.worldVisible)return null;const b=image.getBounds();
 return {x:b.x+b.width/2,y:b.y+b.height/2};
}"""
READY = "()=>typeof slot!=='undefined'&&(slot.buttons?.buttons?.spin?.image?.width>1||!!slot.startItems?.headerContainer?.parent)"


def proxy_config():
    value = os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
    if not value:
        return None
    parsed = urlsplit(value)
    proxy = {'server': parsed.scheme + '://' + parsed.hostname + (':' + str(parsed.port) if parsed.port else '')}
    if parsed.username:
        proxy['username'] = parsed.username
    if parsed.password:
        proxy['password'] = parsed.password
    return proxy


async def observe(browser, game, out, spins, manifest_root):
    manifest = json.loads((manifest_root / (game + '.json')).read_text())
    source = manifest['source']
    query = parse_qs(urlsplit(source).query)
    if urlsplit(source).hostname != 'eu-server.ssgportal.com' or not query.get('Token', [''])[0].startswith('DEMO'):
        raise ValueError('PUBLIC_FREE_DEMO_REQUIRED')
    directory = out / game
    directory.mkdir(parents=True, exist_ok=True)
    context = await browser.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True,
        record_video_dir=str(directory / 'video'),
        user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36')
    await context.add_init_script(INIT)
    page = await context.new_page()
    report = {'id':game, 'officialDemo':source, 'freeDemoOnly':True, 'realMoneyRoundsPlaced':0,
              'steps':[], 'audioFiles':[], 'completeFeatureCoverage':False, 'errors':[]}
    tasks = []

    async def media(response):
        if urlsplit(response.url).path.lower().endswith(('.mp3','.ogg','.wav')) and response.status == 200:
            try:
                body = await response.body()
                report['audioFiles'].append({'url':response.url, 'sha256':hashlib.sha256(body).hexdigest(), 'bytes':len(body)})
            except Exception:
                pass
    page.on('response', lambda r: tasks.append(asyncio.create_task(media(r))))
    page.on('pageerror', lambda e: report['errors'].append(str(e)[:300]))
    frame = None

    async def checkpoint(label):
        state = await frame.evaluate(SNAPSHOT)
        state['step'] = label
        report['steps'].append(state)
        await page.screenshot(path=str(directory / (label + '.png')))
        print(json.dumps({'id':game,'step':label,'audioStarts':len(state['audio']), 'info':state['info'], 'data':state['data']}), flush=True)
        return state

    async def click_native(name):
        target = await frame.evaluate(CONTROL_TARGET, name)
        if not target:
            return False
        canvas = frame.locator('canvas').first
        scale = await canvas.evaluate('(c)=>({x:c.getBoundingClientRect().width/c.width,y:c.getBoundingClientRect().height/c.height})')
        await canvas.click(position={'x':target['x']*scale['x'],'y':target['y']*scale['y']}, timeout=3000, force=True)
        return True

    try:
        await page.goto(source, wait_until='domcontentloaded', timeout=45000)
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            for candidate in page.frames:
                if '/Game.aspx' not in candidate.url:
                    continue
                frame = candidate
                yes = frame.get_by_text('Yes', exact=True).first
                if await yes.count() and await yes.is_visible():
                    await yes.click(force=True)
                if await frame.evaluate(READY):
                    break
            else:
                await page.wait_for_timeout(300)
                continue
            break
        if not frame or not await frame.evaluate(READY):
            raise ValueError('OFFICIAL_DEMO_NOT_READY')
        await page.wait_for_timeout(1200)
        if game.startswith('burningice'):
            await frame.wait_for_function("()=>typeof slot!=='undefined'&&Number.isFinite(slot.data?.GameState)",timeout=30000)
        await checkpoint('00-entry')
        for i in range(spins):
            if not await click_native('spin'):
                break
            await page.wait_for_timeout(600)
            await checkpoint(f'{i+1:02d}-spin-start')
            await page.wait_for_timeout(5500)
            if game.startswith('burningice'):
                until=time.monotonic()+90
                while time.monotonic()<until and not await frame.evaluate(CONTROL_TARGET,'spin'):
                    await page.wait_for_timeout(500)
            await checkpoint(f'{i+1:02d}-spin-result')
        # These are visible native buttons. No hidden methods or forced outcomes.
        for name in (['plus', 'minus', 'bet'] if game.startswith('burningice') else ['bet', 'menu']):
            if await click_native(name):
                await page.wait_for_timeout(600)
                await checkpoint('control-' + name)
                if not game.startswith('burningice') and name=='bet':
                    await click_native('bet')
                else:
                    await page.keyboard.press('Escape')
        report['ready'] = True
    except Exception as error:
        report['error'] = str(error)[:600]
        try:
            await page.screenshot(path=str(directory / 'failure.png'))
        except Exception:
            pass
    await asyncio.gather(*tasks, return_exceptions=True)
    await context.close()
    report['audioStarted'] = bool(report['steps'] and report['steps'][-1]['audio'])
    (directory / 'observations.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    return report


async def main(args):
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            proxy=proxy_config(), args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        for game in args.games:
            report = await observe(browser, game, args.out, args.spins, args.manifest_root)
            print(json.dumps({'id':game,'ready':report.get('ready',False),'error':report.get('error'),
                              'steps':len(report['steps']),'audioFiles':len(report['audioFiles'])}), flush=True)
        await browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('games', nargs='+', choices=['multihot100_native','habeshafortune5_native',
        'multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native',
        'burningice_native','burningice10_native','burningice40_native'])
    parser.add_argument('--manifest-root', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--spins', type=int, choices=range(0, 11), default=4)
    asyncio.run(main(parser.parse_args()))
