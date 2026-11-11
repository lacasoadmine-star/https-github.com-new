import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,mkdir,copyFile,readFile,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {build as bundle} from 'esbuild';
import {captureFixedRequestedModel,fixedRequestedModelPlugin} from '../build.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function snapshot(t){
 const dir=await mkdtemp(join(root,'work','packing-parity-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await cp(join(root,'math'),join(dir,'math'),{recursive:true});await cp(join(root,'scope'),join(dir,'scope'),{recursive:true});
 await mkdir(join(dir,'server'));await copyFile(join(root,'server','demo74-rng.mjs'),join(dir,'server','demo74-rng.mjs'));
 return dir;
}
const load=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const rng=seed=>{let state=seed>>>0;return bound=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%bound;};};

test('packing capture fails closed on changed IDs, dynamic aliases or escaped references',async()=>{
 const source=await readFile(join(root,'math','official72.mjs'),'utf8'),captured=await captureFixedRequestedModel();
 assert.equal(captured.fixedCallCount,2);assert.equal(captured.definition.id,'ind74_multihot100');assert.deepEqual(JSON.parse(captured.serialized),captured.definition);
 for(const altered of [
  source.replace("revisedModel('ind74_multihot100')","revisedModel('ind74_other')"),
  source+'\nconst futureAlias = revisedModel;\n',
  source+'\nconst futureDynamic = id => revisedModel(id);\n',
  source+String.raw`\nconst escapedAlias = revised\u004dodel;`.replace(/^\\n/,'\n'),
 ])await assert.rejects(captureFixedRequestedModel({sourceOverride:altered}));
 const comments=await captureFixedRequestedModel({sourceOverride:source+'\n// revisedModel(anything) in a comment is not a consumer.\n'});assert.equal(comments.definitionSha256,captured.definitionSha256);
});

test('fixed import-edge packing preserves all72definitions and216seededraw/public rounds, plus exact MH100large-stake behavior',async t=>{
 // Freeze the source set because other authorized agents may be preparing
 // independent titles concurrently. Both bundles use this same snapshot.
 const dir=await snapshot(t),mathPath=join(dir,'math','official72.mjs'),packing=await fixedRequestedModelPlugin({rootDir:dir});
 const options={stdin:{contents:'export * from '+JSON.stringify(mathPath)+';',resolveDir:dir,sourcefile:'packing-math-parity.mjs'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,metafile:true,alias:{'node:crypto':join(dir,'server','demo74-rng.mjs')}};
 const [plain,packed]=await Promise.all([bundle(options),bundle({...options,plugins:[packing.plugin]})]);
 const original=await import(pathToFileURL(mathPath).href),baseline=await load(plain.outputFiles[0].text),optimized=await load(packed.outputFiles[0].text);
 assert.equal(packing.report.interceptedImports,1);
 assert(Object.keys(plain.metafile.inputs).some(name=>name.endsWith('/math/requested72.mjs')));
 assert(!Object.keys(packed.metafile.inputs).some(name=>name.endsWith('/math/requested72.mjs')));
 const definitions=original.listGameDefinitions();assert.equal(definitions.length,72);assert.deepEqual(baseline.listGameDefinitions(),definitions);assert.deepEqual(optimized.listGameDefinitions(),definitions);
 assert.equal(digest(optimized.listGameDefinitions()),digest(definitions));
 for(const game of definitions)for(const seed of[1,42,0xffffffff]){
  // Isolated first-spin transaction context, identical for both bundles. No
  // live carry is reset, and the browser never supplies this trusted input.
  const context=game.chargingFeature?{bucket:{baseBetMinor:'100',ante:1},priorCarry:{schemaVersion:1,initialized:false,paidSpins:'0',wilds:[]}}:undefined;
  const args={gameId:game.id,betMinor:'100',now:1700000000000,context};
  const expected=original.startRound({...args,rng:rng(seed)}),actual=optimized.startRound({...args,rng:rng(seed)});
  assert.deepEqual(actual,expected,game.id+' raw round '+seed);assert.deepEqual(optimized.publicRound(actual,args.now),original.publicRound(expected,args.now),game.id+' public round '+seed);
 }
 const id='ind74_official_multihot100';
 for(const betMinor of['100','2000','4000100']){
  const args={gameId:id,betMinor,now:1700000000000,rng:bound=>bound===5?4:0};assert.deepEqual(optimized.startRound(args),original.startRound(args));
 }
 const first=optimized.getGameDefinition(id),label=first.symbols[0].label;first.symbols[0].label='MUTATED_COPY';assert.equal(optimized.getGameDefinition(id).symbols[0].label,label);
 assert(packed.outputFiles[0].contents.length<plain.outputFiles[0].contents.length,'Packing must actually remove unrelated requested-list bytes.');
 t.diagnostic(JSON.stringify({baselineMathBytes:plain.outputFiles[0].contents.length,packedMathBytes:packed.outputFiles[0].contents.length,savedBytes:plain.outputFiles[0].contents.length-packed.outputFiles[0].contents.length,definitions:72,seededRawAndPublicCases:216,largeMH100Stakes:3,catalogueSha256:digest(definitions)}));
});

test('the plugin leaves another requester of the full requested72 API unchanged',async t=>{
 const dir=await snapshot(t),packing=await fixedRequestedModelPlugin({rootDir:dir});
 const result=await bundle({stdin:{contents:'export {getGameDefinition} from "./requested72.mjs";',resolveDir:join(dir,'math'),sourcefile:'unrelated-consumer.mjs'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,alias:{'node:crypto':join(dir,'server','demo74-rng.mjs')},plugins:[packing.plugin]});
 assert.equal(packing.report.interceptedImports,0);
 const expected=await import(pathToFileURL(join(dir,'math','requested72.mjs')).href),actual=await load(result.outputFiles[0].text);
 const other=expected.listGameDefinitions().find(game=>game.id!=='ind74_multihot100');assert(other);assert.deepEqual(actual.getGameDefinition(other.id),expected.getGameDefinition(other.id));
});
