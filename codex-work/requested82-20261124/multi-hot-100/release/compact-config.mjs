import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {validConfig} from './worker.mjs';

export const CONFIG_MODULE='requested82m100r1/config.mjs';
export const EXPECTED_PREVIOUS_SHA256='140539170057e1e4bfd56cea2a002bf4d5d7a74202ebeddc362d978941d9811c';
const hash=value=>createHash('sha256').update(value).digest('hex'),require=createRequire(import.meta.url);
const moduleValue=async source=>(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;

/** Change representation only for the one accepted476 configuration module.
 * The expanded default object's ordered JSON must remain byte-identical.
 */
export async function compactM100Config(source,{esbuild=require('esbuild')}={}){
  const previousBytes=Buffer.byteLength(source),previousSha256=hash(source);
  if(previousBytes!==9311||previousSha256!==EXPECTED_PREVIOUS_SHA256)throw Error('M100_COMPACTION_PREVIOUS_PIN');
  const original=await moduleValue(source);if(!validConfig(original))throw Error('M100_COMPACTION_CONFIG_INVALID');
  const tuples=original.resources.map(record=>[record.name,record.bytes,record.sha256]);
  const properties=Object.entries(original).map(([name,value])=>JSON.stringify(name)+':'+(name==='resources'?
    'r.map(([name,bytes,sha256])=>({name,key:p+sha256+"/"+name,bytes,sha256,contentType:t(name)}))':JSON.stringify(value)));
  const generated='import{resourceType as t,KV_PREFIX as p}from"./worker.mjs";const r='+JSON.stringify(tuples)+';export default{'+properties.join(',')+'};';
  const compiled=await esbuild.transform(generated,{loader:'js',format:'esm',target:'es2022',minify:true,charset:'utf8',legalComments:'none'});
  if(compiled.warnings.length)throw Error('M100_COMPACTION_COMPILE');
  const compactSource=compiled.code,workerURL=JSON.stringify(pathToFileURL(fileURLToPath(new URL('./worker.mjs',import.meta.url))).href);
  if(compactSource.split('"./worker.mjs"').length!==2)throw Error('M100_COMPACTION_IMPORT_CLOSURE');
  const expanded=await moduleValue(compactSource.replace('"./worker.mjs"',workerURL));
  const oldJSON=JSON.stringify(original),newJSON=JSON.stringify(expanded);
  if(!validConfig(expanded)||oldJSON!==newJSON)throw Error('M100_COMPACTION_RUNTIME_CONFIG_CHANGED');
  const bytes=Buffer.byteLength(compactSource),sha256=hash(compactSource);
  if(bytes>=previousBytes)throw Error('M100_COMPACTION_NOT_SMALLER');
  const proof={schema:'zplay/m100-config-representation-proof/v1',name:CONFIG_MODULE,
    previousBytes,previousSha256,newBytes:bytes,newSha256:sha256,savedBytes:previousBytes-bytes,
    originalConfigurationJsonSha256:hash(oldJSON),expandedConfigurationJsonSha256:hash(newJSON),
    configurationJsonBytes:Buffer.byteLength(oldJSON),resourceCount:original.resources.length,
    unchangedRuntimeConfiguration:true,sourceCommit:original.sourceCommit,revision:original.revision};
  return {name:CONFIG_MODULE,source:compactSource,bytes,sha256,contentType:'application/javascript+module',
    expectedPreviousSha256:EXPECTED_PREVIOUS_SHA256,previousBytes,proof};
}

export async function compactM100ConfigFile(input,output){
  const result=await compactM100Config(await readFile(input,'utf8'));
  if(output){const destination=resolve(output),file=resolve(destination,CONFIG_MODULE);await mkdir(dirname(file),{recursive:true});
    await writeFile(file,result.source);await writeFile(resolve(destination,'m100-config-compaction-proof.json'),JSON.stringify(result.proof,null,2)+'\n');}
  return result;
}
