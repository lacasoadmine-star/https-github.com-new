#!/usr/bin/env python3
"""Fresh public-demo research: native interactions, screenshots, video and served assets.

No real-money accounts, existing browser profiles, user recordings, or old game caches
are read. Each title receives an isolated browser context. Missing observations stay
explicitly missing; a screenshot of an error is never counted as successful gameplay.
"""
import argparse
import asyncio
import base64
import hashlib
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]


def now():
    return datetime.now(timezone.utc).isoformat()


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str) + "\n")


SNAPSHOT = r"""() => {
 const out={url:location.href,viewport:{width:innerWidth,height:innerHeight},dom:[],canvas:[],pixi:[],state:{}};
 const visible=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>1&&r.height>1&&s.display!=='none'&&s.visibility!=='hidden'};
 for(const e of document.querySelectorAll('button,a,input:not([type="hidden"]),select,[role="button"],[data-action],.open-menu,.menu-popup-close,.close,[class*="btn"],[class*="button"]')) {
  if(!visible(e))continue;
  const r=e.getBoundingClientRect();
  out.dom.push({tag:e.tagName,id:e.id,classes:String(e.className),text:(e.innerText||'').slice(0,100),title:e.title,ariaLabel:e.getAttribute('aria-label'),action:e.dataset.action,disabled:!!e.disabled,checked:e.type==='checkbox'?e.checked:undefined,value:e.tagName==='INPUT'?e.value:undefined,box:{x:r.x,y:r.y,width:r.width,height:r.height}});
  if(out.dom.length>=240)break;
 }
 for(const e of document.querySelectorAll('canvas')) {const r=e.getBoundingClientRect();if(r.width>10)out.canvas.push({width:e.width,height:e.height,box:{x:r.x,y:r.y,width:r.width,height:r.height}})}
 const primitives=o=>{const r={};if(!o||typeof o!=='object')return r;for(const [k,v]of Object.entries(o)){if(v===null||['number','boolean','string'].includes(typeof v))r[k]=typeof v==='string'?v.slice(0,200):v;else if(Array.isArray(v)&&v.length<150&&v.every(x=>x===null||['number','boolean','string'].includes(typeof x)))r[k]=v;}return r};
 try {if(typeof gameInfo!=='undefined') {
  out.state={...primitives(gameInfo),user:primitives(gameInfo.user),reels:primitives(gameInfo.boxes),autoplay:primitives(gameInfo.autoPlay)};
  for(const [name,b]of Object.entries(gameInfo.buttons||{})) {
   let bounds=null;try{const r=b.image?.getBounds?.();if(r)bounds={x:r.x,y:r.y,width:r.width,height:r.height}}catch(e){}
   out.pixi.push({name,status:b.status,imageName:b.imageName,bounds,visible:b.image?.worldVisible??b.image?.visible,interactive:b.image?.interactive,eventMode:b.image?.eventMode,container:b.containerName});
  }
 }}catch(e){out.inspectError=String(e)}
 try {if(typeof slot!=='undefined'&&slot?.buttons?.buttons){
  for(const[name,b]of Object.entries(slot.buttons.buttons)){const image=b.container||b.image;let r;try{r=image?.getBounds?.()}catch(e){}
   out.pixi.push({name,status:b.mode||b.status,bounds:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null,visible:image?.worldVisible,interactive:image?.interactive,source:'slot.buttons.buttons'});}
  out.slotState=primitives(slot.user||slot.info?.user||slot.data);out.slotInfo=primitives(slot.info);out.slotWin=primitives(slot.win?.info);
 }}catch(e){}
 try{if(typeof gameClass!=='undefined'){out.instantState=primitives(gameClass)}}catch(e){}
 for(const n of ['gameButtons','gameButton','buttons']) {try {const m=eval('typeof '+n+'!=="undefined"?'+n+':null');if(m&&typeof m==='object')out[n+'Names']=Object.keys(m).slice(0,100)}catch(e){}}
 const configured={};for(const id of ['GameId','Currency','BetValues','Bets','PayTable','MinBetAmount','MaxBetAmount','MaxWinAmount','Rtp','Version','DisplayName']) {const e=document.getElementById(id);if(e)configured[id]=e.value}
 out.configuration=configured;
 out.visibleLoaders=Array.from(document.querySelectorAll('.loader-div,#loading,.loading-screen,.preloader')).filter(visible).map(e=>({classes:String(e.className),text:(e.innerText||'').slice(0,100)}));
 out.text=(document.body?.innerText||'').slice(0,13000);
 return out;
}"""


class Session:
    def __init__(self, browser, game):
        self.browser = browser
        self.game = game
        self.directory = ROOT / "games" / game["id"]
        self.context = None
        self.page = None
        self.tasks = set()
        self.assets = []
        self.requests = []
        self.failures = []
        self.actions = []
        self.captures = []
        self.errors = []
        self.started = now()
        self.origin = time.monotonic()
        self.seen_urls = set()
        self.play_attempted = False
        self.play_observed = False
        self.game_frame = None
        self.status = "not_started"
        self.cdp = None
        self.owns_browser = False

    def is_game_frame(self,frame):
        # The official launcher owns the rules/settings overlay above its game iframe.
        return "ssgportal.com" in urlsplit(frame.url).netloc

    async def states(self):
        async def inspect(index,frame):
            if not self.is_game_frame(frame):return None
            try:
                snapshot=await asyncio.wait_for(frame.evaluate(SNAPSHOT),timeout=3)
                snapshot['frame_index']=index
                return snapshot
            except Exception as exc:
                self.errors.append({"operation":"inspect","url":frame.url,"error":type(exc).__name__+': '+str(exc)[:120]})
                return None
        return [v for v in await asyncio.gather(*(inspect(i,f)for i,f in enumerate(self.page.frames)))if v]

    def queue_response(self, response):
        task = asyncio.create_task(self.on_response(response))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def on_response(self, response):
        url = response.url
        host = urlsplit(url).netloc
        if not any(host.endswith(domain) for domain in ["ssgportal.com", "ssg-public.com"]):
            return
        kind = response.request.resource_type
        content_type = response.headers.get("content-type", "")
        record = {"elapsed": round(time.monotonic() - self.origin, 3), "url": url, "method": response.request.method,
                  "status": response.status, "resource_type": kind, "content_type": content_type}
        self.requests.append(record)
        if response.status != 200 or url in self.seen_urls:
            return
        self.seen_urls.add(url)
        path = urlsplit(url).path.lower()
        if "audio/" in content_type or re.search(r"\.(mp3|ogg|wav|m4a|aac)$", path):
            group = "03-sound"
        elif "video/" in content_type or re.search(r"\.(mp4|webm|atlas(?:\.txt)?|skel|json|bin)$", path):
            group = "04-video-animation"
        elif kind == "font" or re.search(r"\.(woff2?|ttf|otf)$", path):
            group = "11-fonts"
        elif kind == "image" or content_type.startswith("image/"):
            group = "06-artwork"
        elif kind in ("script", "stylesheet"):
            group = "12-client-code"
        elif kind == "document":
            group = "01-source"
        elif kind in ("xhr", "fetch"):
            # Capture a bounded sample of actual demo responses, never additional API calls.
            if sum(a.get("group") == "09-network" for a in self.assets) >= 24:
                return
            group = "09-network"
        else:
            return
        try:
            body = await asyncio.wait_for(response.body(), timeout=25)
            if len(body) > 50 * 1024 * 1024:
                record["save_error"] = "Resource exceeds per-file capture limit"
                return
            basename = unquote(urlsplit(url).path.rsplit("/", 1)[-1]) or "index"
            basename = re.sub(r"[^a-zA-Z0-9._-]", "_", basename)[:120]
            if "." not in basename:
                basename += ".json" if "json" in content_type else ".txt"
            digest = hashlib.sha256(url.encode()).hexdigest()[:12]
            destination = self.directory / group / (digest + "-" + basename)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(body)
            self.assets.append({"source_url": url, "retrieved_at": now(), "group": group,
                                "path": str(destination.relative_to(ROOT)), "bytes": len(body),
                                "sha256": hashlib.sha256(body).hexdigest(), "content_type": content_type})
        except Exception as exc:
            record["save_error"] = str(exc)[:200]

    async def capture(self, label):
        number = len(self.captures) + 1
        destination = self.directory / "02-screenshots" / f"{number:02d}-{label}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        # Capture the screen actually rendered by Chromium. Its fonts loader can
        # remain pending on an unrelated provider help frame; CDP avoids waiting
        # for that frame without changing the game or its fonts.
        if self.cdp is None:
            self.cdp = await self.context.new_cdp_session(self.page)
        screenshot = await asyncio.wait_for(self.cdp.send('Page.captureScreenshot', {
            'format': 'png', 'fromSurface': True, 'captureBeyondViewport': False
        }), timeout=20)
        destination.write_bytes(base64.b64decode(screenshot['data']))
        states = await self.states()
        record = {"number": number, "label": label, "captured_at": now(),
                  "elapsed": round(time.monotonic() - self.origin, 3),
                  "path": str(destination.relative_to(ROOT)), "frames": states}
        self.captures.append(record)
        save_json(self.directory / "09-network" / f"state-{number:02d}-{label}.json", record)
        return states

    async def find(self, selectors):
        for frame in self.page.frames:
            if not self.is_game_frame(frame):continue
            try:
                point=await asyncio.wait_for(frame.evaluate(r"""selectors=>{
                  for(const selector of selectors){let elements;try{elements=document.querySelectorAll(selector)}catch{continue}
                   for(const e of elements){const r=e.getBoundingClientRect(),s=getComputedStyle(e),x=r.x+r.width/2,y=r.y+r.height/2;
                    if(r.width<=2||r.height<=2||x<0||y<0||x>=innerWidth||y>=innerHeight||s.display==='none'||s.visibility==='hidden'||e.disabled||e.classList.contains('disable-main-button')||e.classList.contains('disabled')||e.classList.contains('disable'))continue;
                    const top=document.elementFromPoint(x,y);if(top!==e&&!e.contains(top))continue;
                    return {x,y,selector,control:{tag:e.tagName,id:e.id,classes:String(e.className),text:(e.innerText||'').slice(0,150),ariaLabel:e.getAttribute('aria-label'),title:e.title}};
                   }
                  } return null;
                }""",selectors),timeout=3)
                if point:return frame,point
            except Exception:continue
        return None

    async def dom_click(self,label,selectors,capture=True,delay=0.45):
        found=await self.find(selectors)
        if not found:return False
        frame,point=found
        try:
            frame_element=await frame.frame_element() if frame.parent_frame else None
            box=await frame_element.bounding_box() if frame_element else {"x":0,"y":0}
            await asyncio.wait_for(self.page.mouse.click(box['x']+point['x'],box['y']+point['y']),timeout=5)
            await asyncio.sleep(delay)
            self.actions.append({"label":label,"at":now(),"method":"native_dom_pointer_click","selector":point['selector'],"frame_url":frame.url,"control":point['control'],"outcome":"clicked"})
            if capture:await self.capture(label)
            return True
        except Exception as exc:
            self.actions.append({"label":label,"at":now(),"outcome":"failed","error":type(exc).__name__+': '+str(exc)[:400]})
            return False

    async def pixi_click(self, name, capture=True, label=None, delay=0.4, required_status=None):
        for frame in self.page.frames:
            if not self.is_game_frame(frame):
                continue
            try:
                point = await asyncio.wait_for(frame.evaluate(r"""(name)=>{
                    let button=null,applicationCanvas=null;
                    if(typeof gameInfo!=='undefined')button=gameInfo.buttons?.[name];
                    if((!button?.image)&&typeof slot!=='undefined'&&slot?.buttons?.buttons){
                     const key=Object.keys(slot.buttons.buttons).find(k=>k.toLowerCase()===name.toLowerCase());
                     button=slot.buttons.buttons[key];applicationCanvas=slot.canvas?.canvas?.view;
                    }
                    if(!button?.image&&typeof gameClass!=='undefined'&&['Play','Start','Bet','Collect'].includes(name)){
                     const el=gameClass.button||gameClass.startButton; if(el?.interactive)button={image:el,status:'Native'};
                    }
                    const image=button?.image||button?.container;const interactive=button?.container?.interactive?button.container:image;
                    if(!image||!image.worldVisible||(!interactive?.interactive&&interactive?.eventMode!=='static')||button.status==='disabled'||button.mode==='Disabled')return null;
                    const b=image.getBounds();const c=applicationCanvas||document.querySelector('canvas');
                    if(!c||b.width<3||b.height<3)return null;
                    const r=c.getBoundingClientRect();
                    const x=r.x+(b.x+b.width/2)*r.width/c.width;const y=r.y+(b.y+b.height/2)*r.height/c.height;
                    if(x<0||y<0||x>innerWidth||y>innerHeight)return null;
                    if(document.elementFromPoint(x,y)!==c)return null;
                    return {x,y,status:button.mode||button.status,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},canvas:{width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height}};
                }""", name), timeout=3)
                if not point:
                    continue
                if required_status and point.get('status') != required_status:
                    continue
                frame_element = await frame.frame_element() if frame.parent_frame else None
                box = await frame_element.bounding_box() if frame_element else {"x": 0, "y": 0}
                x, y = box["x"] + point["x"], box["y"] + point["y"]
                await self.page.mouse.click(x, y)
                await asyncio.sleep(delay)
                self.actions.append({"label": label or name, "at": now(), "method": "native_canvas_click",
                                     "button": name, "point": {"x": x, "y": y}, "observed_control": point,
                                     "outcome": "clicked"})
                if capture:
                    await self.capture(label or name.lower())
                return True
            except Exception as exc:
                self.errors.append({"operation": "canvas_click", "button": name, "error": str(exc)[:200]})
        return False

    async def close_overlays(self):
        await self.dom_click("close-overlay", [".menu-popup-close", ".autoplay .head .close", "#help .close", ".popup .close", ".autoplay-popup .close", "#autoplay .close", "[data-popup-close]", ".close-version-popup", ".close-autoplay"], capture=False, delay=0.4)

    async def observe_play(self):
        # Public slot demos expose the actual rendered Spin control through PIXI.
        before = await self.states()
        clicked = False
        for attempt in range(3):
            clicked = await self.pixi_click("Spin", label="spin-start", delay=0.15)
            if clicked:
                break
            await asyncio.sleep(0.8)
        if not clicked:
            clicked = await self.dom_click("play-start", [
                'button[data-action="bet"]', '[data-action="place-bet"]',
                '.bet-button', '.button-bet', '.place-bet-button', '.start-button', '.play-button', '.BetSlot', '.spin-button:not(.disable-main-button)', '.bet-btn', '.bet.place-bet', '.buttons-col.place-bet .bet', '.buttons .bet', '.button.bet', '#bet-button', '#bet', '#start',
                '[data-bet-button]', '[data-action="play"]'
            ], delay=0.2)
        if not clicked:
            for name in ["Start", "Bet", "Play", "Drop", "Shoot", "Go"]:
                if await self.pixi_click(name, label="play-start", delay=0.15):
                    clicked = True
                    break
        self.play_attempted = clicked
        if clicked:
            await asyncio.sleep(1.5)
            await self.pixi_click('Spin',label='stop-reels',delay=0.2,required_status='Stop')
            await asyncio.sleep(1.5)
            after = await self.capture("play-response")
            # Mark observable user-state changes; a click alone is not proof of a completed round.
            initial_users = [f.get("slotInfo") or f.get("state", {}).get("user", {}) for f in before]
            after_users = [f.get("slotInfo") or f.get("state", {}).get("user", {}) for f in after]
            self.play_observed = bool(initial_users != after_users and any(after_users))
            await self.dom_click("collect-response", ['button:has-text("Cash out")', 'button:has-text("Collect")', '[data-action="cashout"]'], delay=0.3)

    async def menu(self):
        opened = await self.dom_click("menu-rules", [".menu-icon-without-line.open-menu", ".menu-line-open-icon.open-menu", '.menu-icon-bt', '.menu-icon', '.Menu', '.menu-button', '[data-menu-toggle]', '[data-action="menu"]', '[aria-label="Menu"]', 'button[title="Menu"]'])
        if not opened:
            opened = await self.pixi_click("Menu", label="menu-rules")
        if not opened:
            return
        if self.game['id'] == 'jetx':
            for popup in ['rules','how-to-play','my-bets']:
                if await self.dom_click(popup, [f'[data-popup-open="{popup}"]']):
                    await self.close_overlays()
                    await self.dom_click('reopen-menu', ['[data-menu-toggle]'], capture=False)
            await self.dom_click('menu-close', ['[data-menu-toggle]'], capture=False)
            await self.dom_click('four-bet-layout', ['[data-switch-to-four]'])
            await self.dom_click('autoplay-controls', ['[aria-label="Autoplay"]'])
            await self.close_overlays()
            return
        # Rules are part of the game UI; scroll the actual visible content.
        await self.dom_click("rules-tab", ['.footer-navigation [data-page="rules"]', '[data-action="rules"]'], capture=False)
        if len(self.captures) < 8:
            await self.page.mouse.move(650, 440)
            await self.page.mouse.wheel(0, 500)
            await asyncio.sleep(0.35)
            await self.capture("rules-scroll")
        await self.dom_click("settings-tab", ['.footer-navigation [data-page="setting"]', '.footer-page-setting', '[data-action="settings"]', 'button:has-text("Settings")'])
        for label, selectors in [
            ("sound-toggle", ['.game-sound-bt', '.menu-line-sound-icon', '[data-action="sound"]', 'input[name="sound"]']),
            ("music-toggle", ['.game-music-bt', '.menu-setting-background-music .switch', '.menu-line-music-icon', '[data-action="music"]', 'input[name="music"]']),
            ("history-tab", ['.footer-navigation [data-page="history"]', '.footer-page-spin-history', '[data-action="history"]'])
        ]:
            await self.dom_click(label, selectors)
        await self.close_overlays()

    async def run(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        # Separate browser processes keep one heavy WebGL title from stalling
        # every other title's native clicks on the shared software GPU queue.
        self.browser=await self.browser.browser_type.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--disable-dev-shm-usage'])
        self.owns_browser=True
        video_dir = self.directory / "04-video-animation" / "recording"
        self.context = await self.browser.new_context(viewport={"width": 1180, "height": 720},
                                                      locale="en-US", record_video_dir=str(video_dir),
                                                      record_video_size={"width": 640, "height": 390})
        await self.context.add_init_script("""window.__referencePointerEvents=[];for(const type of ['pointerdown','click','change'])document.addEventListener(type,e=>{window.__referencePointerEvents.push({type,time:performance.now(),x:e.clientX,y:e.clientY,tag:e.target?.tagName,id:e.target?.id,classes:String(e.target?.className||'')});},true);""")
        self.page = await self.context.new_page()
        self.page.set_default_timeout(3500)
        self.websocket_frames=[]
        def socket_open(socket):
            if 'ssgportal.com' not in urlsplit(socket.url).netloc:return
            def frame_received(payload):
                if len(self.websocket_frames)<800:
                    if isinstance(payload,bytes):payload=payload.decode('utf-8',errors='replace')
                    self.websocket_frames.append({"elapsed":round(time.monotonic()-self.origin,3),"url":socket.url,"payload":str(payload)[:12000]})
            socket.on('framereceived',frame_received)
        self.page.on('websocket',socket_open)
        self.page.on("response", self.queue_response)
        self.page.on("requestfailed", lambda req: self.failures.append({"elapsed": round(time.monotonic()-self.origin, 3), "url": req.url, "error": req.failure}))
        self.page.on("dialog", lambda dialog: asyncio.create_task(dialog.dismiss()))
        try:
            self.status = "loading"
            await self.page.goto(self.game["demo_url"], wait_until="domcontentloaded", timeout=45000)
            # Wait for actual rendered controls and assets, with a fixed upper bound.
            ready = False
            for i in range(20):
                await asyncio.sleep(1)
                for frame in self.page.frames:
                    if "ssgportal.com" not in frame.url:
                        continue
                    try:
                        ready = await asyncio.wait_for(frame.evaluate("() => (typeof gameInfo!=='undefined'&&!!gameInfo.resourceLoaded)||(typeof slot!=='undefined'&&!!slot?.buttons?.buttons?.spin)||!!document.querySelector('canvas')&&/Bet|PLAY/.test(document.body.innerText)"),timeout=2)
                        if ready:
                            break
                    except Exception:
                        pass
                if ready and i >= 4:
                    break
            # Cap only the local render frame rate for this software GPU capture.
            # Inputs and round requests still go through the actual public demo.
            for frame in self.page.frames:
                if not self.is_game_frame(frame):continue
                try:
                    await asyncio.wait_for(frame.evaluate("""()=>{
                     const tickers=[];
                     try{if(typeof PIXI!=='undefined'){tickers.push(PIXI.Ticker?.shared,PIXI.Ticker?.system)}}catch{}
                     try{if(typeof game!=='undefined')tickers.push(game.ticker)}catch{}
                     try{if(typeof slot!=='undefined')tickers.push(slot?.canvas?.canvas?.ticker)}catch{}
                     try{if(typeof gameClass!=='undefined')tickers.push(gameClass?.canvas?.canvas?.ticker)}catch{}
                     for(const ticker of tickers)if(ticker&&typeof ticker.maxFPS==='number')ticker.maxFPS=20;
                    }"""),timeout=2)
                except Exception:pass
            for frame in self.page.frames:
                if not self.is_game_frame(frame):continue
                try:
                    await asyncio.wait_for(frame.wait_for_function("""()=> !Array.from(document.querySelectorAll('.loader-div,#loading,.loading-screen,.preloader')).some(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>30&&r.height>30&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0})""",timeout=22000),timeout=23)
                except Exception:pass
            await asyncio.sleep(1)
            configurations=[]
            for frame in self.page.frames:
                if not self.is_game_frame(frame):continue
                try:
                    value=await asyncio.wait_for(frame.evaluate(r"""()=>{
                     const skipped=new Set(['texture','textures','canvas','view','image','container','sound','parent','children','baseTexture']);
                     const seen=new WeakSet();
                     const clean=(value,depth=0)=>{
                      if(value===null||['number','boolean','string'].includes(typeof value))return typeof value==='string'?value.slice(0,1200):value;
                      if(typeof value!=='object'||depth>6||seen.has(value))return undefined;
                      seen.add(value);if(Array.isArray(value))return value.slice(0,256).map(v=>clean(v,depth+1));
                      const result={};for(const[k,v]of Object.entries(value).slice(0,700)){if(skipped.has(k))continue;const c=clean(v,depth+1);if(c!==undefined)result[k]=c;}return result;
                     };
                     const out={url:location.href};
                     try{if(typeof game!=='undefined')out.resources={url:clean(game.url),images:clean(game.images),sounds:clean(game.sounds),spines:clean(game.spines),sprites:clean(game.sprites)}}catch{}
                     try{if(typeof slot!=='undefined')out.slot={info:clean(slot.info),buttons:clean(slot.buttons?.config),boxes:clean(slot.boxes?.config),lines:clean(slot.lines?.config)}}catch{}
                     try{if(typeof gameClass!=='undefined')out.instantConfig=clean(gameClass.config)}catch{}
                     return out;
                    }"""),timeout=4)
                    if len(value)>1:configurations.append(value)
                except Exception:pass
            save_json(self.directory/'05-reels-system/public-client-configuration.json',{'source':'Official public browser client configuration; no server code or proprietary RNG recovered','frames':configurations})
            initial = await self.capture("initial-demo")
            text = " ".join(frame.get("text", "") for frame in initial)
            blocked = any(s in text.lower() for s in ["you can create up to", "not available in your", "access denied", "game is not available", "your session has expired"])
            if blocked:
                self.status = "blocked_by_provider"
                self.errors.append({"operation": "launch", "error": "Provider displayed a restriction or session error; see initial screenshot"})
            else:
                self.status = "loaded" if any(f["canvas"] or f["pixi"] for f in initial) else "unverified_load"
                await self.dom_click('start-playing', ['[data-welcome-start]', '.info-button', '.how-to-play-popup .ok-button', '.version-btn[data-option="option1"]'])
                await self.dom_click('choose-low-risk', ['.version-btn[data-option="option1"]'])
                await self.close_overlays()
                if self.game['category'] != 'Slots':
                    await self.dom_click('jump-or-play', ['.start-button.jump', '.jump-button', '[data-action="jump"]'])
                    await self.dom_click('collect-demo', ['.collect-button', '.cashout-button', '.cash-out-button'])
                if not await self.pixi_click("Plus", label="bet-increase"):
                    await self.dom_click('bet-increase', ['button[aria-label="Increase bet"]', '.bet-plus', '.Plus', '.bet-container .plus', '.bet-input-container .plus', 'a.plus'])
                if not await self.pixi_click("Minus", capture=False):
                    await self.dom_click('bet-decrease', ['button[aria-label="Decrease bet"]', '.bet-minus', '.Minus', '.bet-container .minus', '.bet-input-container .minus', 'a.minus'], capture=False)
                await self.menu()
                await self.pixi_click('SoundOn',label='sound-off')
                await self.pixi_click('SoundOff',label='sound-on')
                if not await self.pixi_click("AutoPlay", label="autoplay-controls"):
                    await self.dom_click('autoplay-controls', ['.autoplay-button', '.autoplay-icon', '.ToggleAutoplay', '.auto-play-button', '[aria-label="Autoplay"]'])
                await self.close_overlays()
                for label, selectors in [
                    ('mode-options',['.choose-mode-button','.game-version-button','.version-lvl','.risk-selector']),
                    ('bet-options',['.bet-list-arrow','.bet-arrow','.BetArrow','.bet-amount-button']),
                    ('sound-switch',['.sound-icon','.sound-button','[data-sound-toggle]']),
                ]:
                    if len(self.captures)<9:
                        await self.dom_click(label,selectors)
                        await self.close_overlays()
                # Test available payline controls and help without inventing disabled buttons.
                for control in ["LinePlus", "LineMinus", "Config", "Help"]:
                    if len(self.captures) >= 10:
                        break
                    if await self.pixi_click(control, label=control.lower()):
                        await self.close_overlays()
                if self.game['id'] in ['multi-hot-wheel','wheel-of-destiny']:
                    await self.dom_click('choose-wheel-field',['.bet-field-item.item1'])
                await self.observe_play()
                if len(self.captures) < 9:
                    for n in range(2):
                        if await self.pixi_click("Spin", label=f"spin-{n+2}-animation", delay=0.15):
                            await asyncio.sleep(2.5)
                            await self.capture(f"spin-{n+2}-result")
                        if len(self.captures) >= 9:
                            break
                await self.close_overlays()
                while len(self.captures)<8:
                    await asyncio.sleep(0.8)
                    await self.capture(f"live-animation-{len(self.captures)+1:02d}")
                await asyncio.wait_for(self.page.set_viewport_size({"width": 390, "height": 844}),timeout=8)
                await asyncio.sleep(1)
                await self.capture("mobile-390x844")
                await asyncio.wait_for(self.page.set_viewport_size({"width": 1280, "height": 720}),timeout=8)
                await asyncio.sleep(0.6)
                if len(self.captures) < 10:
                    await self.capture("desktop-1280x720")
                # Close a demo through its own native Exit when available, releasing its table.
                if not await self.dom_click('session-exit-menu',['.menu-icon-bt','.menu-icon','.Menu','.menu-icon-without-line.open-menu'],capture=False):
                    await self.pixi_click('Menu',capture=False)
                await self.dom_click('exit-official-demo',['.menu-popup-exit-game','.exit-game','.exit-button'],capture=False)
                await self.dom_click('confirm-exit',['.exit-popup .confirm','.exit-game-yes'],capture=False)
        except asyncio.CancelledError:
            self.errors.append({"operation":"session-timeout","error":"Capture reached its time limit; observations are partial"})
            self.status="partial_timeout"
        except Exception as exc:
            self.errors.append({"operation": "capture", "error": str(exc)[:500]})
            if not self.captures:
                try:
                    await self.capture("launch-error")
                except Exception:
                    pass
            self.status = "failed" if self.status == "loading" else self.status
        finally:
            if self.page:
                for i, frame in enumerate(self.page.frames):
                    if "ssgportal.com" not in frame.url:
                        continue
                    try:
                        save_json(self.directory / "07-buttons" / f"pointer-events-frame-{i}.json", await asyncio.wait_for(frame.evaluate("window.__referencePointerEvents||[]"),timeout=2))
                    except Exception:
                        pass
            if self.tasks:
                done, pending = await asyncio.wait(list(self.tasks), timeout=30)
                for task in pending:
                    task.cancel()
            video = self.page.video if self.page else None
            try:
                await asyncio.wait_for(self.context.close(), timeout=12)
            except Exception as exc:
                self.errors.append({"operation":"close-context","error":type(exc).__name__})
            if video:
                try:
                    await asyncio.wait_for(video.save_as(str(self.directory / "04-video-animation/demo-session.webm")),timeout=12)
                    await asyncio.wait_for(video.delete(),timeout=3)
                except Exception as exc:
                    self.errors.append({"operation": "video", "error": str(exc)})
            result = {"provider": "SmartSoft Gaming", "game": self.game, "started_at": self.started,
                      "finished_at": now(), "status": self.status, "isolated_fresh_context": True,
                      "play_clicked": self.play_attempted, "round_state_change_observed": self.play_observed,
                      "screenshot_target": 10, "screenshot_count": len(self.captures),
                      "video_contains_audio": False, "local_render_fps_cap":20, "audio_files": sum(a["group"] == "03-sound" for a in self.assets),
                      "assets": self.assets, "actions": self.actions,
                      "captures": [{k:v for k,v in c.items() if k!='frames'} for c in self.captures],
                      "errors": self.errors, "failed_requests": self.failures}
            save_json(self.directory / "09-network/capture-manifest.json", result)
            save_json(self.directory / "09-network/requests.json", self.requests)
            save_json(self.directory / "09-network/websocket-frames.json", self.websocket_frames)
            save_json(self.directory / "08-rules-paytable/observed-rules.json", {
                "official_math_inferred": False,
                "source": "Text and configuration visible in this official demo session",
                "observations": [{"label":c["label"],"frames":[{"url":f["url"],"text":f.get("text",""),"configuration":f.get("configuration",{})} for f in c["frames"]]} for c in self.captures if any(w in c['label'] for w in ['rule','help','menu','initial'])]
            })
            save_json(self.directory / "07-buttons/actions.json", self.actions)
            save_json(self.directory / "05-reels-system/observed-states.json", [{"label":c["label"],"elapsed":c["elapsed"],"frames":[{"url":f["url"],"state":f["state"],"configuration":f.get("configuration")} for f in c["frames"]]} for c in self.captures])
            save_json(self.directory / "10-layout-mobile/viewports.json", [{"label":c["label"],"frames":[{"viewport":f["viewport"],"canvas":f["canvas"]} for f in c["frames"]]} for c in self.captures])
            inventories = []
            for capture in self.captures:
                for frame in capture["frames"]:
                    if frame["dom"] or frame["pixi"]:
                        inventories.append({"state":capture["label"],"frame_url":frame["url"],"dom_controls":frame["dom"],"canvas_controls":frame["pixi"]})
            save_json(self.directory / "07-buttons/control-inventory.json", inventories)
            print(json.dumps({"id":self.game["id"],"status":self.status,"screenshots":len(self.captures),
                              "play_clicked":self.play_attempted,"state_change":self.play_observed,
                              "audio_files":result["audio_files"],"assets":len(self.assets),"errors":len(self.errors)}), flush=True)
            if self.owns_browser:
                try:await asyncio.wait_for(self.browser.close(),timeout=10)
                except Exception:pass
            return result


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", nargs="*")
    parser.add_argument("--concurrency", type=int, default=3)
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()
    catalogue = json.loads((ROOT / "catalogues/smartsoft-games.json").read_text())
    games = [g for g in catalogue["games"] if not args.ids or g["id"] in args.ids]
    if args.skip_existing:
        games = [g for g in games if not (ROOT/"games"/g["id"]/"09-network/capture-manifest.json").exists()]
    semaphore = asyncio.Semaphore(args.concurrency)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
                                           args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required", "--disable-dev-shm-usage"])
        async def collect(game):
            async with semaphore:
                # Load collector improvements between titles without restarting unrelated captures.
                import runpy
                session_type = runpy.run_path(str(Path(__file__)), run_name='capture_plugin')['Session']
                return await asyncio.wait_for(session_type(browser, game).run(), timeout=210)
        results = await asyncio.gather(*(collect(game) for game in games), return_exceptions=True)
        await browser.close()
    summary = [{"id":r["game"]["id"],"status":r["status"],"screenshots":r["screenshot_count"],"play_clicked":r["play_clicked"]} if isinstance(r,dict) else {"error":str(r)} for r in results]
    save_json(ROOT / "reports/latest-capture-batch.json", {"finished_at":now(),"games":summary})


if __name__ == "__main__":
    asyncio.run(main())
