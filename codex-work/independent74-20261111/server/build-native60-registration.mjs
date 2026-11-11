import { build, version as esbuildVersion } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
export async function buildNative60Registration({outdir=resolve(root,'server/artifacts')}={}){
  const artifactPath=resolve(outdir,'native60-registration-installer.mjs');
  const built=await build({absWorkingDir:root,entryPoints:['server/native60-registration.mjs'],outfile:artifactPath,
    bundle:true,format:'esm',platform:'node',target:'es2022',write:false,metafile:true,minify:false,sourcemap:false,logLevel:'silent',
    banner:{js:'// Additive existing native60 registration. No server, wallet, financial class or migration is created. New stakes default disabled.'}});
  const inputs=Object.keys(built.metafile.inputs).sort();
  const allowedServer=new Set(['server/native60-registration.mjs','server/existing-library74-adapter.mjs','server/existing-library74-service.mjs','server/existing-library74-http.mjs']);
  for(const file of inputs)if(!allowedServer.has(file)&&file!=='client/existing-wallet-routes.mjs'&&!file.startsWith('math/')&&!/^scope\/(official74|requested74)\.json$/.test(file))throw Error('UNEXPECTED_NATIVE60_BUNDLE_INPUT:'+file);
  const imports=[...new Set(Object.values(built.metafile.outputs).flatMap(o=>o.imports.filter(i=>i.external).map(i=>i.path)))].sort();
  if(imports.some(path=>!['node:crypto','node:async_hooks'].includes(path)))throw Error('UNEXPECTED_NATIVE60_RUNTIME_IMPORT');
  const bytes=built.outputFiles.find(f=>f.path===artifactPath)?.contents;if(!bytes)throw Error('NATIVE60_ARTIFACT_MISSING');
  const loaded=await import('data:text/javascript;base64,'+Buffer.from(bytes).toString('base64'));
  if(loaded.NATIVE60_GAME_IDS.length!==60||loaded.native60Math.listGameDefinitions().length!==60)throw Error('EXACT60_BUILD_REQUIRED');
  const sources=await Promise.all(inputs.map(async path=>{const source=await readFile(resolve(root,path));return{path,bytes:source.length,sha256:hash(source)};}));
  const models=loaded.native60Math.listGameDefinitions().map(g=>({id:g.id,version:'library74-v1:'+g.mathVersion,family:g.family,
    realMoneyAdmissionBlocked:g.releaseReview?.realMoneyAdmissionBlocked===true,reviewCodes:g.releaseReview?.codes??[]}));
  const manifest={format:'native60-existing-service-registration-v1',artifact:'native60-registration-installer.mjs',bytes:bytes.length,sha256:hash(bytes),
    buildTool:'esbuild@'+esbuildVersion,runtimeImports:imports,models,preservedExistingOfficialIds:14,defaultNewRoundsEnabled:false,
    publicCheckpoint:{generatedInstallerIncluded:false,rebuildCommand:'node server/build-native60-registration.mjs',privateHostMetadataIncluded:false},
    financialImplementationsBundled:false,createsService:false,createsDatabase:false,createsFinancialClass:false,createsMigration:false,
    modelMathReviewBlockedIds:models.filter(g=>g.realMoneyAdmissionBlocked).map(g=>g.id),providerPrivateMathVerified:false,
    createsWalletAtInstallation:false,createsScheduler:false,usesExistingInitializedService:true,hostContract:loaded.NATIVE60_HOST_CONTRACT,
    missingProofs:['Actual native/protected pool identity equality','Canonical trigger semantics review','Reciprocal protected guard installed and verified','Versioned per-game operator policy'],
    transport:{publicHealth:'/v2/independent74/health',authenticated:['GET /v2/independent74/state?game_id','GET /v2/independent74/history?game_id','POST /v2/independent74/action'],auth:'Existing native signature verifier plus existing canonical session resolver'},sources};
  await mkdir(outdir,{recursive:true});await writeFile(artifactPath,bytes);const manifestPath=artifactPath+'.manifest.json';await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  return{artifactPath,manifestPath,manifest};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await buildNative60Registration();console.log(JSON.stringify({artifact:relative(process.cwd(),result.artifactPath),sha256:result.manifest.sha256,bytes:result.manifest.bytes,models:result.manifest.models.length}));
}
