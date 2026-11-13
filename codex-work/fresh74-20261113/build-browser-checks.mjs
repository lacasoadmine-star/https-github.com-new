import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.dirname(fileURLToPath(import.meta.url));
const [manifestPath,outputPath]=process.argv.slice(2);
if(!manifestPath || !outputPath)throw new Error('Supply the fresh observation manifest and the local test HTML output path');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const gameIds=manifest.games.map(game=>game.providerGameName);
if(gameIds.length!==74 || new Set(gameIds).size!==74)throw new Error('Expected 74 distinct observed catalogue identities');
const files=['round-journal.mjs','round-controller.mjs','canvas-reels.mjs','browser-checks.mjs'];
const source=(await Promise.all(files.map(f=>readFile(path.join(root,f),'utf8')))).map(s=>s.replace(/^export /gm,'')).join('\n');
const script=source+`\nconst gameIds=${JSON.stringify(gameIds)};
document.querySelector('button').onclick=async()=>{
const button=document.querySelector('button'), list=document.querySelector('ol'), status=document.querySelector('[role=status]');
button.disabled=true;list.replaceChildren();status.textContent='Running isolated checks…';
try{const result=await runBrowserChecks({gameIds,log:(kind,message)=>{const li=document.createElement('li');li.textContent=kind+' — '+message;li.dataset.kind=kind;list.append(li);}});
status.textContent=result.passed+' passed; '+result.failed+' failed. '+result.catalogueIdentities+' catalogue identities checked; 0 completed game engines.';
}catch(error){status.textContent='FAILED — '+error.message;}finally{button.disabled=false;}
};`;
await writeFile(outputPath,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZPLAY isolated runtime checks</title>
<style>body{font:18px system-ui;background:#09131c;color:#e1f5ee;max-width:880px;margin:60px auto;padding:24px}h1{font-size:30px}p{line-height:1.6;color:#b6c7cd}button{background:#35c66f;color:#06110b;border:0;border-radius:8px;padding:15px 24px;font:700 17px system-ui;cursor:pointer}button:disabled{opacity:.5}li{margin:18px 0;line-height:1.4}[data-kind=PASS]{color:#5de194}[data-kind=FAIL]{color:#ff8b8b}[role=status]{border-top:1px solid #335;padding-top:20px}</style>
<h1>ZPLAY · isolated runtime checks</h1><p>Disposable local fixtures only. No network requests, provider access, accounts, wallet changes or wagers. Catalogue checks validate shared recovery behavior; they do not certify any completed game.</p>
<button>Run local checks</button><ol></ol><p role="status">Ready. The 74 game engines remain incomplete.</p><script>${script.replaceAll('</script','<\\/script')}</script></html>`);
console.log(outputPath);
