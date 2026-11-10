import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
ORIGIN='https://superwin-player.apdiy61.workers.dev'
PREFIX='/native-library/remaining20/20261110-ice-receipt-r11/'
OLD='/native-library/remaining20/20261110-ice-audio-r9/cash/'
LIVE=os.environ.get('ICE_RECEIPT_LIVE')=='1'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']})
  page=await browser.new_page(viewport={'width':960,'height':600});errors=[];posts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
  async def route_handler(route):
   name=route.request.url.split(PREFIX)[1].split('cash/',1)[1].split('?')[0];f=ROOT/'client'/name
   if f.is_file():await route.fulfill(status=200,body=f.read_bytes(),content_type='application/javascript; charset=utf-8')
   else:await route.continue_(url=ORIGIN+OLD+name)
  if not LIVE:await page.route('**'+PREFIX+'cash/**',route_handler)
  await page.goto(ORIGIN+OLD+'reference-presentation.mjs',wait_until='domcontentloaded')
  await page.set_content('<canvas id="screen" width="960" height="600"></canvas>')
  receipts=json.loads((ROOT/'observed-component-receipts.json').read_text())
  receipt=next(r for r in receipts if len(r['frames'])>=3)
  # Scale the public0.40 DMO reference to an isolated2.00 component input.
  # No signed session, wallet API, wager, or fake live account is created.
  for key in ['stakeMinor','currentCashoutMinor','baseWinMinor']:receipt[key]=str(int(receipt[key])*5)
  for frame in receipt['frames']:
   frame['payoutMinor']=str(int(frame['payoutMinor'])*5)
   for win in frame['wins']:win['payoutMinor']=str(int(win['payoutMinor'])*5)
  for win in receipt['wins']:win['payoutMinor']=str(int(win['payoutMinor'])*5)
  result=await page.evaluate('''async ({old,prefix,receipt})=>{
   const games=await fetch(old+'games.json').then(r=>r.json());
   const game=games.find(g=>g.id==='burningice40_native');
   receipt.model_version=game.version;
   const state={connected:true,authenticated:true,sessionId:'isolated-render-replay',currency:'ETB',balance:'0.00',game,round:receipt,accepting:false};
   const run=async moduleURL=>{
    const {ReferencePresentationHost}=await import(moduleURL),canvas=document.getElementById('screen');
    const host=new ReferencePresentationHost(canvas.getContext('2d'),{origin:location.origin});
    const binding=host.setGame(game);if(binding.status!=='configured')throw Error(JSON.stringify(binding));
    const draw=await host.draw(state,{selectedStake:'2.00',width:960,height:600});
    if(draw.status!=='painted')throw Error(JSON.stringify(draw));
    const wins=draw.scene.nativeVisual.wins;
    const result={wins:wins.length,payoutMinor:String(wins.reduce((n,w)=>n+BigInt(w.payoutMinor),0n)),financialActions:draw.scene.financialActions};
    return {host,result};
   };
   const before=await run(old+'reference-presentation.mjs');before.host.dispose();
   const after=await run(prefix+'cash/reference-presentation.mjs');
   if(before.result.wins!==0||after.result.wins===0||after.result.payoutMinor!==receipt.baseWinMinor)throw Error('TERMINAL_LINE_REPLAY_FAILED');
   const original=JSON.stringify(state);
   const intermediate=await after.host.draw(state,{selectedStake:'2.00',frameIndex:0,width:960,height:600});
   if(intermediate.scene.nativeVisual.wins.length!==0)throw Error('EARLY_LINE_REVEAL');
   await after.host.draw(state,{selectedStake:'2.00',width:960,height:600});
   if(JSON.stringify(state)!==original)throw Error('RECEIPT_MUTATED');
   window.replay={host:after.host,state};
   return {before:before.result,after:after.result,intermediateWins:0,receiptUnchanged:true};
  }''',{'old':OLD,'prefix':PREFIX,'receipt':receipt})
  await page.screenshot(path=str(ROOT/('live-component-landscape.png' if LIVE else 'component-landscape.png')))
  await page.set_viewport_size({'width':390,'height':844})
  mobile=await page.evaluate('''async()=>{const canvas=document.getElementById('screen');canvas.width=390;canvas.height=844;const d=await replay.host.draw(replay.state,{selectedStake:'2.00',width:390,height:844});return {status:d.status,wins:d.scene?.nativeVisual?.wins.length,width:d.viewport?.width,height:d.viewport?.height};}''')
  assert mobile['status']=='painted' and mobile['wins']==result['after']['wins']
  await page.screenshot(path=str(ROOT/('live-component-portrait.png' if LIVE else 'component-portrait.png')))
  assert not errors,errors
  assert not posts,posts
  report={'mode':'isolated component replay using public official observations','liveModules':LIVE,'result':result,'mobile':mobile,'javascriptErrors':errors,'financialPOSTs':posts,'notAuthenticatedWalletE2E':True}
  (ROOT/('live-component-evidence.json' if LIVE else 'browser-evidence.json')).write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
  await browser.close()
asyncio.run(main())
