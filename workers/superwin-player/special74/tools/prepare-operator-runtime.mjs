// Offline packaging only. Never starts a runtime, changes variables or deploys.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {brotliCompressSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';

export const RETAINED_RUNTIME_SHA256='04958b621f95b817ed63c608163c6cc6e92a258afd49d265c4cd2993fb4013fc';
const hash=text=>createHash('sha256').update(text).digest('hex');
function replaceOnce(text,from,to){if(text.split(from).length!==2)throw Error('RETAINED_SOURCE_CHANGED:'+from.slice(0,70));return text.replace(from,to);}
export function prepareOperatorRuntime({runtime,adapterBundle,modelSha256}){
 if(hash(runtime)!==RETAINED_RUNTIME_SHA256)throw Error('RETAINED_RUNTIME_HASH_MISMATCH');
 if(!/^[a-f0-9]{64}$/.test(modelSha256??''))throw Error('MODEL_HASH_REQUIRED');
 if(!adapterBundle.includes('createOperatorSlotCore')||!adapterBundle.includes('operatorGambleDraw'))throw Error('OPERATOR_BUNDLE_REQUIRED');
 const encoded=Buffer.from(adapterBundle).toString('base64');
 let patched=replaceOnce(runtime,'const versioned=safariModule.createSafariSlotCore(', 'const retainedVersioned=safariModule.createSafariSlotCore(');
 const marker='const { MATH, mathSha256, publicGames: retainedPublicGames, spin, toUnits, fromUnits, gambleDraw, bonusRewards, getGame, modelIdentity, receiptGame } = versioned;';
 patched=replaceOnce(patched,marker,`const special74Operator=await import("data:text/javascript;base64,${encoded}");\nconst versioned=special74Operator.createOperatorSlotCore(retainedVersioned,{sha256:"${modelSha256}",enabled:process.env.SPECIAL74_RELEASE==="all74-v1"});\n${marker}`);
 patched=replaceOnce(patched,'const isFreshBuilt=id=>id==="fresh_multihot10"||id==="fresh_safarisimba";', 'const isFreshBuilt=id=>id==="fresh_multihot10"||id==="fresh_safarisimba"||id==="special74_multi_hot_5_v1";');
 patched=replaceOnce(patched,'result = isFreshBuilt(parent.game_id) ? fresh74.freshGambleDraw(body.choice, cash(stake)) : gambleDraw(body.choice, cash(stake));', 'result = parent.game_id === "special74_multi_hot_5_v1" ? special74Operator.operatorGambleDraw(body.choice, cash(stake), attempt - 1) : isFreshBuilt(parent.game_id) ? fresh74.freshGambleDraw(body.choice, cash(stake)) : gambleDraw(body.choice, cash(stake));');
 return {runtime:patched,report:{retainedRuntimeSha256:RETAINED_RUNTIME_SHA256,candidateRuntimeSha256:hash(patched),adapterBundleSha256:hash(adapterBundle),modelSha256,
  deploymentPerformed:false,productionEnabled:false,activationVariable:'SPECIAL74_RELEASE',activationValue:'all74-v1',
  existingLedgerCodeChanged:false,existingModelIdsChanged:false,
  integration:'Existing fresh-release hooks provide session/version checks, transaction, house reserve, account cap, active-game lock, idempotent spin/gamble and durable receipts.',
  limitation:'Offline source integration only; authenticated settlement against the retained database remains unverified.'}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,bundle,output]=process.argv.slice(2);if(!input||!bundle||!output)throw Error('Usage: prepare-operator-runtime.mjs retained-runtime.mjs adapter.bundle.mjs output-runtime.mjs');
 const modelSource=await readFile(new URL('../operator-math/multi-hot-5.mjs',import.meta.url));
 const result=prepareOperatorRuntime({runtime:await readFile(input,'utf8'),adapterBundle:await readFile(bundle,'utf8'),modelSha256:hash(modelSource)});
 await writeFile(output,result.runtime,{mode:0o600});
 await writeFile(output+'.report.json',JSON.stringify(result.report,null,2)+'\n',{mode:0o600});
 // Preserve the existing Railway function package (pg/ioredis) and integrity guard.
 const archive=brotliCompressSync(Buffer.from(result.runtime)).toString('base64');
 const functionSource=`import pg from 'pg';\nimport Redis from 'ioredis';\nimport { brotliDecompressSync } from 'node:zlib';\nimport { createHash } from 'node:crypto';\nimport { writeFile } from 'node:fs/promises';\nvoid pg; void Redis;\nconst runtimeBytes=brotliDecompressSync(Buffer.from('${archive}','base64'));\nif(runtimeBytes.length!==${Buffer.byteLength(result.runtime)}||createHash('sha256').update(runtimeBytes).digest('hex')!=='${result.report.candidateRuntimeSha256}')throw Error('NATIVE_RUNTIME_INTEGRITY_MISMATCH');\nconst runtimeURL=new URL('./native-slot-runtime.mjs',import.meta.url);\nawait writeFile(runtimeURL,runtimeBytes,{mode:0o600});\nawait import(runtimeURL.href);\n`;
 await writeFile(output+'.function.ts',functionSource,{mode:0o600});
 console.log(JSON.stringify(result.report));
}
