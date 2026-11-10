import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']})
  page=await b.new_page(viewport={'width':390,'height':844});errors=[];posts=[];assets=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
  await page.goto('https://superwin-player.apdiy61.workers.dev/native-library/remaining20/20261110-ice-audio-r10/demo-mode.mjs')
  catalog=await page.evaluate('''async()=>{
   const prefix='/native-library/remaining20/20261110-ice-audio-r10/';
   const {createDemoMode}=await import(prefix+'demo-mode.mjs');const rows=[];
   for(const id of ['burningice10_native','burningice40_native']){
    const seen=[],mode=createDemoMode({location:{origin:location.origin,pathname:'/demo/games/'+id},fetchImpl:(u,o)=>{seen.push(u);return fetch(u,o);}});
    const games=await (await mode.fetch(location.origin+prefix+'games.json')).json(),game=games.find(g=>g.id===id);
    const manifest=await fetch(game.referencePresentation.manifestURL).then(r=>r.arrayBuffer());
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',manifest)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==game.referencePresentation.manifestSha256||!seen[0].endsWith('/demo-games.json'))throw Error('CANONICAL_CATALOG_MISMATCH');
    const html=await fetch('/demo/games/'+id).then(r=>r.text());if(!html.includes(prefix+'app.mjs'))throw Error('DEMO_ENTRY_NOT_CURRENT');
    rows.push({id,catalogURL:seen[0],manifestURL:game.referencePresentation.manifestURL,manifestSha256:hash,entryCurrent:true});
   }return rows;
  }''')
  shells=[]
  for id in ['burningice10_native','burningice40_native']:
   r=await page.goto('https://superwin-player.apdiy61.workers.dev/games/'+id,wait_until='networkidle')
   await page.wait_for_timeout(700)
   text=await page.locator('body').inner_text()
   assert 'CREDITS' not in text and '100,000' not in text,text
   state=await page.evaluate('(id)=>fetch("/api/remaining20/state?game_id="+id).then(async r=>({status:r.status,body:await r.json()}))',id)
   assert state['status']==401,state
   await page.screenshot(path=str(ROOT/(id+'-live-signed-out.png')))
   shells.append({'id':id,'status':r.status,'signedOutState':state,'displayedNoFabricatedBalance':True})
  assert not errors,errors
  assert not any('/remaining20/' in u for u in posts),posts
  report={'dateUTC':'2026-11-10','playerVersion':353,'libraryVersion':32,'canonicalDemoCatalog':catalog,'cashShells':shells,'javascriptErrors':errors,'financialPosts':[],'scope':'Published paths and signed-out authentication; not authenticated real-money wagers'}
  (ROOT/'live-final-evidence.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True);await b.close()
asyncio.run(main())
