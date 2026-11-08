#!/usr/bin/env node
// Run against serve-preview.mjs only. Fresh context, localhostGETs only.
import{createRequire}from'node:module';
import{writeFile}from'node:fs/promises';
import{dirname,join}from'node:path';
import{fileURLToPath}from'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{const request=route.request();requests.push({method:request.method(),url:request.url()});if(request.method()!=='GET'||!request.url().startsWith('http://127.0.0.1:8768/'))return route.abort();return route.continue();});
  await page.goto('http://127.0.0.1:8768/arcade/');
  const rows=[];
  for(const id of ['towerx_native','towerrush_native','coinminer_native']){
    await page.locator('[data-game="'+id+'"]').click();
    await page.waitForFunction(expected=>document.querySelector('[data-game="'+expected+'"]').getAttribute('aria-pressed')==='true'&&document.getElementById('status').textContent.startsWith('Static review'),id);
    const state=await page.evaluate(()=>({status:document.getElementById('status').textContent,canvasWidth:document.getElementById('scene').width,canvasHeight:document.getElementById('scene').height,controls:[...document.querySelectorAll('#controls button')].map(button=>({label:button.textContent,disabled:button.disabled}))}));
    if(!state.controls.length||!state.controls.every(control=>control.disabled))throw new Error('Unexpected enabled game control');
    const file=id+'-browser-390.png';await page.locator('.stage').screenshot({path:join(root,'evidence',file)});rows.push({id,...state,file});
  }
  const result={schemaVersion:1,method:'Fresh isolated local browser; no provider session or wallet',viewport:[390,844],scenes:rows,pageErrors:errors,nonGetRequests:requests.filter(request=>request.method!=='GET'),externalRequests:requests.filter(request=>!request.url.startsWith('http://127.0.0.1:8768/')),requestCount:requests.length,productionLaunchEnabled:false};
  await writeFile(join(root,'evidence/browser-verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));if(errors.length||result.nonGetRequests.length||result.externalRequests.length)process.exitCode=1;
}finally{await browser.close();}
