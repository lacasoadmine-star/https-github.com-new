import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
export async function renderUpload({configPath=join(root,'dist','upload-config.json'),outputPath=join(root,'dist','cloudflare-upload-code.js')}={}) {
  const config=JSON.parse(await readFile(configPath,'utf8'));
  if(typeof config.dryRun!=='boolean')throw new Error('Upload config must explicitly declare dryRun.');
  const template=await readFile(join(root,'deploy','cloudflare-upload-template.js'),'utf8');
  // A function replacement preserves literal $', $& and $$ in embedded client source.
  const source=template.replace('__UPLOAD_CONFIG__',()=>JSON.stringify(config));
  const check=spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
  if(check.status!==0)throw new Error('Rendered upload function has invalid syntax: '+check.stderr);
  await writeFile(outputPath,source,{mode:0o600});
  return {config,source,outputPath};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const r=await renderUpload();console.log(JSON.stringify({rendered:r.outputPath,dryRun:r.config.dryRun,modules:r.config.modules.length}));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
