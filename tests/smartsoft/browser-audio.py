import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
from urllib.parse import urlsplit
_proxy_url=os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')
PROXY=None
if _proxy_url:
    _proxy=urlsplit(_proxy_url)
    PROXY={'server':_proxy.scheme+'://'+_proxy.hostname+(':'+str(_proxy.port) if _proxy.port else '')}
    if _proxy.username:PROXY['username']=_proxy.username
    if _proxy.password:PROXY['password']=_proxy.password

ORIGIN=os.environ.get('SMARTSOFT_TEST_ORIGIN','http://127.0.0.1:8765')
ARTIFACTS=Path(__file__).resolve().parent/'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
PREFIX='/native-library/remaining20/20261110-reference-mobile-r14/'
IDS={'multihot100_native':'5fddea498e1f0d39','habeshafortune5_native':'7161514f85b0565e','multihot5superwilds_native':'3d420e4fe5830b46','multihotdeluxe_native':'fe6fe5c2996189a2'}

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,proxy=PROXY,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  page=await browser.new_page()
  await page.route(ORIGIN+'/isolated-audio-fixture',lambda route:route.fulfill(content_type='text/html',body='<title>Isolated reference audio verification</title>'))
  await page.goto(ORIGIN+'/isolated-audio-fixture')
  await page.bring_to_front()
  report=[]
  for game,group in IDS.items():
   result=await page.evaluate('''async ({game,group,prefix})=>{
    const {ReferenceAudio}=await import(prefix+group+'/reference-audio.mjs');
    const {ReferenceAssetStore}=await import(prefix+group+'/presentation/machine-renderer.mjs');
    const {smartSoftWinTier}=await import(prefix+group+'/presentation/smartsoft-native-presentation.mjs');
    const manifest=await (await fetch(prefix+'manifests/'+game+'.json')).json();
    const store=new ReferenceAssetStore(manifest,{baseURL:new URL(prefix+'assets/'+game+'/',location.origin).href});
    const audio=new ReferenceAudio();audio.bind(manifest,store);audio.musicEnabled=false;const unlocked=await audio.unlock();
    const sounds=[];
    for(const [event,key]of [['win-nice','Win2'],['win-big','Win3'],['win-super','Win4'],['win-fantastic','Win5'],['win-end','WinEnd']]){
     const ok=await audio.play(event);const buffer=await audio.buffer('Start/'+key+'.mp3');
     sounds.push({event,ok,duration:buffer?.duration,sha256:manifest.audio['Start/'+key+'.mp3'].sha256});audio.stop();
    }
    const tiers=[];for(const stake of ['100','4000000'])for(const multiple of [10,20,30,40]){
     const tier=smartSoftWinTier(game,String(BigInt(stake)*BigInt(multiple)),stake);tiers.push({stakeMinor:stake,multiple,level:tier?.level,cue:tier?.cue});
    }
    audio.dispose();store.dispose();return {game,sounds,tiers,audioInfo:{unlocked,visible:document.visibilityState,secure:isSecureContext}};
   }''',{'game':game,'group':group,'prefix':PREFIX})
   assert all(x['ok'] and x['duration']>0 for x in result['sounds']),result
   assert len({x['sha256'] for x in result['sounds']})==5,result
   assert [x['level'] for x in result['tiers']]==[1,2,3,4,1,2,3,4],result
   report.append(result);print(json.dumps({'game':game,'decodedDistinctSounds':5,'scaledTierChecks':8}),flush=True)
  (ARTIFACTS/'r14-audio-browser.json').write_text(json.dumps(report,indent=2))
  await browser.close()
asyncio.run(main())
