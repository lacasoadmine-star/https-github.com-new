import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Source-mounted viewport/input regression only. The renderer is an explicit
// inert fixture: no account, native-media, gameplay or production acceptance.
const directory=dirname(fileURLToPath(import.meta.url)),repository=resolve(directory,'../../..');
const {chromium}=createRequire(import.meta.url)('playwright');
const output=process.env.ZPLAY_M20_VIEWPORT_QA_OUTPUT?resolve(process.env.ZPLAY_M20_VIEWPORT_QA_OUTPUT):null;
if(output)assert(!output.startsWith(repository+'/'),'Use output outside the repository');
const hostStyle=resolve(directory,'../m20-release/host.css'),requests=[],blocked=[],reports=[];
const html=loading=>`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/viewport.css"></head><body>
<header class="m20-host-header"><a href="/">← ZPLAY</a><h1>Multi Hot 20</h1></header>
<p id="m20-connection"${loading?'':' hidden'}>Loading your game…</p><main id="m20-game"></main>
<script type="module">
import {mountMultiHot20} from '/codex-work/new-games90-20261123/m20/main.mjs';
window.viewportGame=mountMultiHot20({root:document.getElementById('m20-game'),assets:{},rendererFactory:({canvas})=>{
 canvas.width=1363;canvas.height=766;
 return {setDisplay(){},snapshot(){return {phase:'IDLE'};},render(){},dispose(){}};
}});
</script></body></html>`;
const server=createServer(async(request,response)=>{
  const url=new URL(request.url,'http://fixture');
  try{
    requests.push({path:url.pathname,method:request.method});
    if(request.method!=='GET'){response.writeHead(405);response.end();return;}
    if(url.pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html(url.searchParams.has('loading')));return;}
    if(url.pathname==='/viewport.css'){
      response.setHeader('Content-Type','text/css');
      response.end(await readFile(resolve(directory,'style.css'),'utf8')+'\n'+await readFile(hostStyle,'utf8'));return;
    }
    if(url.pathname==='/favicon.ico'){response.writeHead(204);response.end();return;}
    const path=resolve(repository,'.'+url.pathname);
    if(!path.startsWith(directory+'/')||!path.endsWith('.mjs')){response.writeHead(404);response.end();return;}
    response.setHeader('Content-Type','text/javascript');response.end(await readFile(path));
  }catch(error){response.writeHead(500);response.end(error.message);}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
  if(output)await mkdir(output,{recursive:true});
  browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const [width,height] of [[240,240],[390,320],[430,350],[640,360],[700,400],[768,400],[844,390],[1280,240],[390,844],[1280,900]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<700}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();blocked.push(route.request().url());return route.abort();});
    await page.goto(origin+'/');await page.locator('.m20-spin').waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('.m20-control')].every(node=>{
      const rect=node.getBoundingClientRect();return rect.bottom<=innerHeight+1&&rect.right<=innerWidth+1;
    }));
    const geometry=await page.evaluate(()=>{
      const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const stage=document.querySelector('.m20-stage'),scene=document.querySelector('.m20-scene');
      return {stage:box(stage),scene:box(scene),portrait:stage.dataset.portrait,compact:stage.dataset.compact,
        controls:[...document.querySelectorAll('.m20-control')].map(node=>{const r=box(node),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
          return {name:node.dataset.action,...r,centerHit:node===hit||node.contains(hit),disabled:node.disabled};}),
        pageHeight:document.documentElement.scrollHeight,pageWidth:document.documentElement.scrollWidth};
    });
    assert.equal(geometry.controls.length,8);assert(geometry.pageHeight<=height+1);assert(geometry.pageWidth<=width+1);
    for(const r of geometry.controls){assert(r.width>=44&&r.height>=44,r.name);assert(r.x>=-1&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1,r.name);assert(r.centerHit,r.name);}
    for(let i=0;i<geometry.controls.length;i++)for(let j=i+1;j<geometry.controls.length;j++){
      const a=geometry.controls[i],b=geometry.controls[j];assert(!(Math.min(a.right,b.right)-Math.max(a.x,b.x)>.001&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>.001),`${a.name}/${b.name}`);
    }
    assert(Math.abs(geometry.scene.x+geometry.scene.width/2-(geometry.stage.x+geometry.stage.width/2))<=1);
    // Chromium quantizes CSS bounds to subpixels, including very small scenes.
    assert(Math.abs(geometry.scene.width-geometry.scene.height*(geometry.portrait==='true'?724/740:1363/766))<.05);
    for(const name of ['spin','take','double','auto'])assert(geometry.controls.find(r=>r.name===name).disabled,'Fixture must not enable '+name);
    await page.getByRole('button',{name:'Menu',exact:true}).click();
    const panel=page.getByRole('dialog');assert(await panel.isVisible());
    const panelBounds=await panel.boundingBox();assert(panelBounds.y>=0&&panelBounds.y+panelBounds.height<=height+1);
    await page.keyboard.press('Escape');assert.equal(await panel.count(),0);
    await page.getByRole('button',{name:'Bet',exact:true}).click();await page.getByRole('button',{name:'0.20',exact:true}).click();
    const sound=page.getByRole('button',{name:'Sound',exact:true}),before=await sound.getAttribute('aria-pressed');
    await sound.click();assert.notEqual(await sound.getAttribute('aria-pressed'),before);
    assert.deepEqual(errors,[]);
    if(output)await page.screenshot({path:resolve(output,`m20-viewport-${width}x${height}.png`)});
    reports.push({width,height,compact:geometry.compact==='true',viewportTargetsVerified:8,nonFinancialControlsResponded:true,pageErrors:errors});
    await page.close();
  }
  // The existing boot hides its connection banner after mounting. That changes
  // the root's top even though the root width stays constant.
  const page=await browser.newPage({viewport:{width:844,height:390}});
  await page.goto(origin+'/?loading');await page.locator('.m20-spin').waitFor();
  const before=await page.locator('.m20-stage').evaluate(node=>node.getBoundingClientRect().height);
  await page.locator('#m20-connection').evaluate(node=>{node.hidden=true;});
  await page.waitForFunction(previous=>document.querySelector('.m20-stage').getBoundingClientRect().height>previous+1,before);
  const after=await page.locator('.m20-stage').evaluate(node=>node.getBoundingClientRect().height);
  assert(after>before);await page.close();
  assert.deepEqual(blocked,[]);assert.deepEqual(requests.filter(r=>r.method!=='GET'||r.path.startsWith('/api/')),[]);
  const report={schema:'zplay/m20-host-viewport-qa/v1',testedAt:new Date().toISOString(),scope:'Source mount, exact host CSS, inert renderer, no account/transport/media or financial acceptance',
    reports,hostBannerResizeVerified:true,blockedExternal:blocked,financialRequests:0};
  if(output)await writeFile(resolve(output,'viewport-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}
