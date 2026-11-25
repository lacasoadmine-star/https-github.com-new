import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadM100Release} from './build.mjs';
import {createM100ReleaseWorker,GAME_PATH} from './worker.mjs';

/** Actual built JS/CSS under actual page CSP, against an isolated401 host.
 * No account, financial action, balance, generated result or production request.
 */
export async function verifyM100GuestArtifact(directory){
  const build=await loadM100Release(directory),{chromium}=createRequire(import.meta.url)('playwright');
  const records=new Map(build.records.map(record=>[record.key,record])),kvReads=[],apiRequests=[];
  const env={SSG_OFFICIAL_REFERENCES:{get(key){kvReads.push(key);const record=records.get(key);return record?.data.buffer.slice(record.data.byteOffset,record.data.byteOffset+record.data.byteLength);}}};
  const previous={fetch(request){const url=new URL(request.url);if(url.pathname==='/api/remaining20/state'){
    apiRequests.push({path:url.pathname,game:url.searchParams.get('game_id'),method:request.method});
    return new Response(JSON.stringify({error:'Authentication required'}),{status:401,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  }return new Response('isolated retained host',{status:404});}};
  const worker=createM100ReleaseWorker(previous,{...build.config,enabled:true});
  const server=createServer(async(req,res)=>{try{
    const response=await worker.fetch(new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method}),env,{});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Isolated verification host error');}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const report={schema:'zplay/m100-compiled-guest-browser/v1',revision:build.config.revision,sourceCommit:build.report.sourceCommit,
    sourceCommitVerified:build.report.sourceCommitVerified,artifactHashVerified:true,fixtureHost:true,productionRequests:0,
    financialActions:0,gameplayVerified:false,liveVerified:false,widths:[]};
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.ZPLAY_QA_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox']});
    for(const width of [360,390,430,1280]){
      const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.name));
      await page.addInitScript(()=>{globalThis.m100CspViolations=[];document.addEventListener('securitypolicyviolation',event=>globalThis.m100CspViolations.push(event.violatedDirective));});
      const before=kvReads.length,apiBefore=apiRequests.length;
      await page.goto('http://127.0.0.1:'+server.address().port+GAME_PATH,{waitUntil:'networkidle'});
      await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();
      assert.equal(await page.getByRole('link',{name:'Sign in',exact:true}).getAttribute('href'),'/player/login');
      assert.equal(await page.getByRole('link',{name:'Return to lobby',exact:true}).getAttribute('href'),'/');
      assert.equal(await page.locator('canvas').count(),0);assert.equal(await page.locator('[data-action=spin]').count(),0);
      assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>globalThis.m100CspViolations),[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.deepEqual(apiRequests.slice(apiBefore),[{path:'/api/remaining20/state',game:'multihot100_native',method:'GET'}]);
      const loaded=kvReads.slice(before).map(key=>records.get(key)?.name).sort();assert.deepEqual(loaded,['app.mjs','page.css']);
      report.widths.push({width,compiledBootstrapExecuted:true,originalWireAccount401:true,noGameplayBeforeAuthentication:true,
        noNativeMediaBeforeAuthentication:true,noCspViolations:true,noOverflow:true});
      await context.close();
    }
    await writeFile(resolve(directory,'m100-guest-browser-report.json'),JSON.stringify(report,null,2)+'\n');return report;
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}

if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
  const directory=process.argv[2];if(!directory)throw Error('Usage: node browser-qa.mjs BUILD_DIRECTORY');
  console.log(JSON.stringify(await verifyM100GuestArtifact(directory)));
}
