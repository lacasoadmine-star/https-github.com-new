import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from '../build.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const presence='/player-v236/presence.63ed199a80b6c700.mjs';
async function fixture(t){
  await mkdir(join(root,'work'),{recursive:true});
  const dir=await mkdtemp(join(root,'work','build-test-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(join(dir,'client'));await mkdir(join(dir,'math'));await mkdir(join(dir,'server'));
  const publicGame={id:'ind74_mineisland2',title:'Original test game',mathVersion:'test-v1',rules:['Test rule'],paytable:[]};
  const futureGame={id:'ind74_future_unfinished',title:'Future math only',mathVersion:'future-v1',rules:['Not client ready'],paytable:[]};
  await writeFile(join(dir,'math','index.mjs'),'export const listGameDefinitions=()=>'+JSON.stringify([publicGame,futureGame])+';\n');
  await writeFile(join(dir,'client','index.html'),'<!doctype html><html><head></head><body><main>Test game</main></body></html>');
  await writeFile(join(dir,'client','style.css'),'body { color: white; background: black; }');
  for(const name of ['app.mjs','api.mjs','audio.mjs'])await writeFile(join(dir,'client',name),'export const testValue=true;\n');
  for(const name of ['machine74-api.mjs','machine74-controller.mjs','machine74-renderer.mjs','machine74-audio.mjs'])await writeFile(join(dir,'client',name),'export const accountOnly=true;\n');
  for(const name of ['machines74.css','machine74-renderer.css'])await writeFile(join(dir,'client',name),'body{color:white}');
  await writeFile(join(dir,'client','machines74.html'),'<!doctype html><html><head></head><body>Server account machines</body></html>');
  const accountDefinitions=Array.from({length:72},(_,i)=>({id:'ind74_official_fixture'+i,currency:'ETB',accepting:false,launchable:false}));
  await writeFile(join(dir,'server','existing-library74-adapter.mjs'),'export const publicLibrary74Definitions=()=>'+JSON.stringify(accountDefinitions)+';\n');
  await writeFile(join(dir,'client','test72-bundle.mjs'),'throw Error("LOCAL_POINT_ENGINE_MUST_NOT_BE_SERVED");\n');
  await writeFile(join(dir,'gateway.mjs'),'export function createGateway({previous}) {return (request,env,ctx)=>previous.fetch(request,env,ctx);}\n');
  return dir;
}

test('build produces isolated modules, fresh gateway, public catalog and stable asset identity',async t=>{
  const dir=await fixture(t),report=await build({rootDir:dir});
  const config=JSON.parse(await readFile(join(dir,'dist','upload-config.json'),'utf8'));
  assert.equal(config.dryRun,true);assert.equal(config.modules.length,4);assert.deepEqual(config.additionalBindings,[]);
  assert.equal(report.preparedV1DefinitionCount,1);assert.equal(report.supportedMachineCount,72);assert.equal(report.realMoneyReleaseEnabledCount,0);assert.equal(report.legacySourcesChanged,false);assert.equal(report.deploymentPerformed,false);
  assert.equal(report.registeredMathDefinitionCount,2);assert.deepEqual(report.gameIds,['ind74_mineisland2']);
  assert.equal(report.accountDefinitionCount,72);assert.equal(report.browserOutcomeEngineServed,false);
  const gateway=await readFile(join(dir,'gateway.mjs'),'utf8');
  assert.equal(config.modules.find(m=>m.name==='independent74-gateway-r1.mjs').source,gateway);
  const {assets}=await import(pathToFileURL(join(dir,'dist','independent74-assets-r1.mjs')).href);
  assert.equal(Object.getPrototypeOf(assets),null);assert.equal(Object.isFrozen(assets),true);
  assert.equal(assets['/index.html'].body.split(presence).length-1,1);
  assert.equal(assets['/machines74.html'].body.split(presence).length-1,1);
  assert.equal(assets['/test72-bundle.mjs'],undefined);
  for(const asset of Object.values(assets)){
    const digest=createHash('sha256').update(asset.body).digest('hex');
    assert.equal(asset.etag,'"independent74-'+digest+'"');assert.ok(asset.type);assert.ok(asset.body.trim());
  }
  const catalog=config.modules.find(m=>m.name==='independent74-catalog-r1.mjs').source;
  assert.ok(!catalog.includes('node:crypto'));assert.ok(!catalog.includes('startMineIslandRound'));
  assert.ok(!catalog.includes('ind74_future_unfinished'));
  const priorSource='export class LocalDemoWallet {}\nconst scheduled=()=>"scheduled-preserved";export default {scheduled,fetch:()=>new Response("legacy-preserved")};';
  await writeFile(join(dir,'dist','presentation-player-entry-r23.mjs'),priorSource);
  const previous=await import(pathToFileURL(join(dir,'dist','presentation-player-entry-r23.mjs')).href);
  const built=await import(pathToFileURL(join(dir,'dist','independent74-entry-r1.mjs')).href);
  assert.equal(built.LocalDemoWallet,previous.LocalDemoWallet);
  assert.equal(built.default.scheduled,previous.default.scheduled);
  assert.equal(await (await built.default.fetch(new Request('https://player.example/existing-game'),{},{})).text(),'legacy-preserved');
});

test('missing, empty or invalid client source never produces a candidate upload',async t=>{
  const dir=await fixture(t);
  await rm(join(dir,'client','style.css'));
  await assert.rejects(build({rootDir:dir}),/Required build input is unavailable/);
  await writeFile(join(dir,'client','style.css'),'   \n');
  await assert.rejects(build({rootDir:dir}),/Required build input is empty/);
  await writeFile(join(dir,'client','style.css'),'body{}');
  await writeFile(join(dir,'client','app.mjs'),'export const = malformed');
  await assert.rejects(build({rootDir:dir}),/Invalid JavaScript in client\/app.mjs/);
  await assert.rejects(readFile(join(dir,'dist','upload-config.json')),/ENOENT/);
});
