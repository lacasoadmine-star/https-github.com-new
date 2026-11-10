import asyncio,os,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent
ORIGIN='https://superwin-player.apdiy61.workers.dev'
PREFIX='/native-library/remaining20/20261110-accepted-controls-r12/'
ICE='/native-library/remaining20/20261110-ice-receipt-r11/'
LIVE=os.environ.get('BATCH_LIVE')=='1'
def module_json(path):return json.loads(path.read_text().removeprefix('export const ASSETS=').rstrip(';\n'))
ASSETS=module_json(ROOT/'remaining20-accepted-controls-assets-r12.mjs')
ICEASSETS=module_json(ROOT.parent/'ice-receipt-r11/remaining20-ice-receipt-assets-r11.mjs')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'],proxy={'server':os.environ['HTTPS_PROXY']})
  page=await b.new_page();errors=[];posts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
  index=(ROOT/'remaining20-accepted-controls-index-r12.mjs').read_text()
  groups=json.loads(index.split('export const GROUPS=')[1].split(';\n')[0])
  pages=json.loads(index.split('export const PAGES=')[1].split(';\n')[0])
  async def handler(route):
   path=route.request.url.split(ORIGIN,1)[1].split('?')[0];a=None
   if path.startswith(PREFIX):
    group,name=path[len(PREFIX):].split('/',1)
    a=ASSETS.get(group+'/app.mjs') if name=='app.mjs' else ASSETS.get('accepted-controls.mjs') if name=='accepted-controls.mjs' else None
    if not a:path=groups[group]['old']+name
   if path.startswith(ICE):
    mode,name=path[len(ICE):].split('/',1);a=ICEASSETS.get('shared/'+name)
    if not a:path=('/native-library/remaining20/20261110-ice-audio-r10/' if mode=='demo' else '/native-library/remaining20/20261110-ice-audio-r9/cash/')+name
   if a:await route.fulfill(status=200,body=a['body'],content_type=a['type'])
   else:await route.continue_(url=ORIGIN+path)
  if not LIVE:
   await page.route('**'+PREFIX+'**',handler)
   await page.route('**'+ICE+'**',handler)
  await page.goto(ORIGIN,wait_until='domcontentloaded');await page.set_content('<main id="checks"></main>')
  results=await page.evaluate('''async ({prefix,pages,live})=>{
   const results=[];
   for(const[path,group]of Object.entries(pages)){
    const base=prefix+group+'/',id=path.split('/').at(-1);
    let shellStatus=null;if(live){const r=await fetch(path),html=await r.text();shellStatus=r.status;if(r.status!==200||!html.includes(base+'app.mjs'))throw Error('LIVE_ENTRY_NOT_COMPOSED:'+path);}
    const {createDemoMode}=await import(base+'demo-mode.mjs');
    const mode=createDemoMode({location:{origin:location.origin,pathname:path}});
    const catalog=await mode.fetch(location.origin+base+'games.json').then(r=>r.json()),game=catalog.find(g=>g.id===id);
    if(!game)throw Error('CANONICAL_CATALOG_MISSING:'+id);
    const {restoreAcceptedControls}=await import(base+'accepted-controls.mjs');
    const source=await fetch(base+'app.mjs').then(r=>r.text());
    if(!source.includes('if(restoreAcceptedControls(state,game,ui))renderCost();'))throw Error('APP_BOUNDARY_MISSING');
    const run=(restore,ui,game,state)=>({renders:restore(state,game,ui)?1:0,stake:ui.stake.value,mines:ui.mines.value});
    const stake=document.createElement('select'),mines=document.createElement('select');
    for(const value of ['1.00','2.00','40000.00'])stake.add(new Option(value,value));
    for(const value of ['3','5','24'])mines.add(new Option(value,value));
    const ui={stake,mines},state={game,connected:true,authenticated:true,sessionId:'component-only',round:{game_id:id,model_version:game.version,round_id:'component',version:1,status:'active',stakeMinor:'200',mines:5}};
    const two=run(restoreAcceptedControls,ui,game,state);if(two.stake!=='2.00'||id==='coinminer_native'&&two.mines!=='5')throw Error('RECOVERY_2_FAILED');
    state.round.stakeMinor='4000000';state.round.mines=24;
    const maximum=run(restoreAcceptedControls,ui,game,state);if(maximum.stake!=='40000.00'||id==='coinminer_native'&&maximum.mines!=='24')throw Error('RECOVERY_MAX_FAILED');
    const unchanged=run(restoreAcceptedControls,ui,game,state);if(unchanged.renders!==0)throw Error('DUPLICATE_REPAINT');
    state.connected=false;state.round.stakeMinor='100';const disconnected=run(restoreAcceptedControls,ui,game,state);if(disconnected.stake!=='40000.00')throw Error('UNCONFIRMED_STATE_CHANGED_CONTROLS');
    results.push({id,path,shellStatus,canonicalCatalog:true,two,maximum,unchanged,disconnected,launchable:game.launchable,published:game.published});
   }
   return results;
  }''',{'prefix':PREFIX,'pages':pages,'live':LIVE})
  assert not errors,errors
  # The lobby GET before the isolated test can include its existing telemetry.
  assert not [u for u in posts if '/remaining20/' in u or '/action' in u],posts
  report={'mode':'browser component checks through canonical client adapters','liveModules':LIVE,'games':len(set(r['id'] for r in results)),'entryPaths':len(results),'results':results,'javascriptErrors':errors,'financialPOSTs':[],'notAuthenticatedWalletE2E':True}
  (ROOT/('live-browser-evidence.json' if LIVE else 'browser-evidence.json')).write_text(json.dumps(report,indent=2));print(json.dumps({'games':report['games'],'entryPaths':len(results),'javascriptErrors':errors,'financialPOSTs':[]}),flush=True)
  await b.close()
asyncio.run(main())
