import asyncio,os,json,base64,hashlib
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
LIVE=os.environ.get('ICE_AUDIO_LIVE')=='1'
ASSETS=json.loads((ROOT/'remaining20-ice-audio-assets-r9.mjs').read_text().removeprefix('export const ASSETS=').rstrip(';\n'))
ORIGIN='https://superwin-player.apdiy61.workers.dev'
PREFIX='/native-library/remaining20/20261110-ice-audio-r9/'
OLD={'demo':'/native-library/remaining20/20261110-new-release-r8/ice/','cash':'/native-library/remaining20/20261110-ice-wallet-entry-r8/'}
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']} if os.environ.get('HTTPS_PROXY') else None)
  page=await browser.new_page();errors=[];posts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
  async def route_handler(route):
   suffix=route.request.url.split(PREFIX)[1].split('?')[0];mode,name=suffix.split('/',1)
   a=ASSETS.get('shared/'+name) or ASSETS.get(mode+'/'+name)
   if a:
    body=base64.b64decode(a['body']) if a.get('encoding')=='base64' else a['body'].encode()
    assert hashlib.sha256(body).hexdigest()==a['sha256']
    await route.fulfill(status=200,body=body,content_type=a['type'])
   else:await route.continue_(url=ORIGIN+OLD[mode]+name)
  if not LIVE:await page.route('**'+PREFIX+'**',route_handler)
  await page.goto(ORIGIN+PREFIX+'cash/reference-audio.mjs',wait_until='domcontentloaded')
  await page.set_content('<button id="unlock">Enable component audio verification</button>')
  await page.click('#unlock')
  result=await page.evaluate('''async ({prefix})=>{
   const {ReferenceAudio}=await import(prefix+'cash/reference-audio.mjs');
   const {SmartSoftMotion}=await import(prefix+'cash/presentation/smartsoft-motion.mjs');
   const {IceReelAudioClock}=await import(prefix+'cash/presentation/ice-reel-audio.mjs');
   const {smartSoftSoundCue}=await import(prefix+'cash/presentation/smartsoft-event-media.mjs');
   const results=[];
   for(const id of ['burningice10_native','burningice40_native']){
    const manifest=await fetch(prefix+'cash/presentation/manifests/'+id+'.json').then(r=>r.json());
    const audio=new ReferenceAudio(),clock=new IceReelAudioClock(),events=[];
    const store={async loadBytes(file){const b=await fetch(prefix+'cash/art/'+file).then(r=>r.arrayBuffer());const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');if(digest!==manifest.files[file].sha256)throw Error('AUDIO_HASH_MISMATCH');return b;}};
    audio.bind(manifest,store);audio.settings({sound:true,music:false});
    if(!await audio.unlock())throw Error('AUDIO_NOT_UNLOCKED');
    const starts=[],stops=[],create=audio.context.createBufferSource.bind(audio.context);
    audio.context.createBufferSource=()=>{const node=create(),start=node.start.bind(node),stop=node.stop.bind(node);node.start=(...a)=>{starts.push({loop:node.loop});return start(...a);};node.stop=(...a)=>{stops.push({loop:node.loop});return stop(...a);};return node;};
    const motion=new SmartSoftMotion({id,symbols:Object.keys(manifest.symbols),onEvent:event=>{events.push(event.type);clock.handle({id,event,play:(cue,options)=>audio.play(cue,options),isCurrent:()=>motion.state?.sequence===event.sequence});}});
    const grid=Array.from({length:manifest.grid.columns},()=>Array.from({length:manifest.grid.rows},()=>Object.keys(manifest.symbols)[0]));
    motion.begin(0);if(!motion.accept(grid,0,{roundId:'component-only-no-wager',finalFrame:true}))throw Error('GRID_REJECTED');motion.sample(20);
    await new Promise(r=>setTimeout(r,700));
    if(starts.filter(x=>x.loop).length!==1||audio.musicNode!==null)throw Error('REEL_LOOP_MUST_BE_INDEPENDENT_OF_MUSIC');
    const last=motion.sample(6000);await new Promise(r=>setTimeout(r,30));
    if(!last.complete||JSON.stringify(last.grid)!==JSON.stringify(grid)||stops.filter(x=>x.loop).length!==1)throw Error('REEL_END_OR_GRID_CHANGED');
    for(const cue of ['autoplay-number','freeze-logo','unfreeze-logo'])if(!await audio.play(cue))throw Error('SOURCE_AUDIO_MISSING:'+cue);
    const duplicate=events.filter(e=>e==='reel-move').length;if(duplicate!==1)throw Error('DUPLICATE_LOOP');
    const delayed=new AbortController();delayed.abort();if(await audio.play('reels-loop',{signal:delayed.signal}))throw Error('CANCELLED_AUDIO_RESTARTED');
    const original={...manifest,id:'multihot5_native'};if(smartSoftSoundCue(original,'autoplay-number'))throw Error('UNRELATED_GAME_CHANGED');
    results.push({id,decoded:audio.buffers.size,loopStarts:starts.filter(x=>x.loop).length,loopStops:stops.filter(x=>x.loop).length,settledGridPreserved:true,independentMusicToggle:true,staleAudioPrevented:true});
    clock.cancel();audio.dispose();
   }
   return results;
  }''',{'prefix':PREFIX})
  controls=[]
  for game_id in ['burningice10_native','burningice40_native']:
   await page.evaluate('''async ({prefix,id})=>{
    const {SmartSoftDialogs}=await import(prefix+'cash/smartsoft-dialogs.mjs');
    document.body.innerHTML='<dialog id="autoplayDialog" open><form id="autoplayForm"><select id="autoplayCount"><option>10</option><option>25</option><option>50</option><option>75</option><option>continuous</option></select><input id="autoplayGain"><input id="autoplayLoss"><input type="checkbox" id="autoplayBigWin"><button id="startAutoplay">Start</button><p id="autoplayError"></p></form><button id="closeAutoplay">Close</button></dialog>';
    window.cueLog=[];window.dialogs=new SmartSoftDialogs({gameId:id,document,onSound:cue=>window.cueLog.push(cue)});window.dialogs.create('auto');
   }''',{'prefix':PREFIX,'id':game_id})
   await page.get_by_role('button',name='25 spins',exact=True).click()
   state=await page.evaluate('()=>({value:document.getElementById("autoplayCount").value,cues:window.cueLog})')
   assert state=={'value':'25','cues':['autoplay-number']},state
   controls.append({'id':game_id,'nativeAutoplay25Click':state})
   await page.evaluate('()=>window.dialogs.dispose()')
  assert not errors,errors
  assert not posts,posts
  report={'type':'Live Chromium component and source audio verification' if LIVE else 'Chromium actual audio decode and component flow; no wagers','results':result,'controls':controls,'javascriptErrors':errors,'posts':posts}
  if LIVE:
   report['liveAssets']=await page.evaluate('''async ({prefix,assets})=>{
    const checked=[];
    for(const [name,a] of Object.entries(assets)){
     const path=name.startsWith('shared/')?'cash/'+name.slice(7):name;
     const r=await fetch(prefix+path),b=await r.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
     if(r.status!==200||sha!==a.sha256||b.byteLength!==a.bytes)throw Error('LIVE_ASSET_MISMATCH:'+name);
     checked.push({name,status:r.status,sha256:sha});
    }
    const shells=[];
    for(const id of ['burningice10_native','burningice40_native'])for(const mode of ['demo','cash']){
     const r=await fetch((mode==='demo'?'/demo':'')+'/games/'+id),body=await r.text();
     if(r.status!==200||!body.includes(prefix+mode+'/app.mjs'))throw Error('LIVE_SHELL_NOT_UPDATED:'+id+mode);
     shells.push({id,mode,status:r.status});
    }
    return {checked,shells};
   }''',{'prefix':PREFIX,'assets':{k:{'bytes':v['bytes'],'sha256':v['sha256']} for k,v in ASSETS.items()}})
  (ROOT/('live-browser-evidence.json' if LIVE else 'browser-evidence.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
  await browser.close()
asyncio.run(main())
