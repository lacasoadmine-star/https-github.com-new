import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { GAME_ID, GAME_ROUTE } from './page-worker.mjs';

export const MODULE_PREFIX = 'new90superwildsr2/';
const hash = value => createHash('sha256').update(value).digest('hex');
export async function buildSuperWildsPage({ activeMainModule, sourceCommit, esbuild } = {}) {
  if (!/^[-A-Za-z0-9_./]+\.mjs$/.test(activeMainModule ?? '') || activeMainModule.startsWith('/') ||
    activeMainModule.split('/').includes('..') || activeMainModule.startsWith(MODULE_PREFIX) ||
    !/^[a-f0-9]{40}$/.test(sourceCommit ?? '') || typeof esbuild?.build !== 'function') throw Error('SUPERWILDS_PAGE_BUILD_INPUT_INVALID');
  const result = await esbuild.build({ entryPoints: [fileURLToPath(new URL('./client/bootstrap.mjs', import.meta.url))],
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', charset: 'utf8', minify: true,
    sourcemap: false, legalComments: 'none', metafile: true, logLevel: 'silent' });
  if (result.warnings?.length || result.outputFiles?.length !== 1 || Object.values(result.metafile.outputs).some(o => o.imports.length)) throw Error('SUPERWILDS_PAGE_BUNDLE_INVALID');
  const clientSource = result.outputFiles[0].text;
  const stylesheetSource = 'html,body{margin:0;min-height:100%;background:#002d21;color:#fff;font-family:Arial,sans-serif}.sw-boot-message{text-align:center;padding:24px;margin:0}.sw-boot-retry,.sw-boot-back{display:block;box-sizing:border-box;min-height:44px;width:min(280px,90%);margin:12px auto;padding:12px;border:1px solid #c4ac55;border-radius:8px;background:#09412c;color:#fff;text-align:center;text-decoration:none;cursor:pointer}\n' + await readFile(new URL('./client/style.css', import.meta.url), 'utf8');
  const assetRevision = hash(clientSource + '\0' + stylesheetSource).slice(0, 24);
  const records = [['mjs',clientSource,'text/javascript; charset=utf-8'],['css',stylesheetSource,'text/css; charset=utf-8']].map(([ext,value,contentType]) => ({
    key:`new90/superwilds/${assetRevision}/game.${ext}`,value,base64:false,
    metadata:{gameId:GAME_ID,sourceCommit,bytes:Buffer.byteLength(value),sha256:hash(value),contentType}
  }));
  const config = {gameId:GAME_ID,route:GAME_ROUTE,assetRevision,
    assetPins:records.map(record=>({key:record.key,...record.metadata}))};
  const from = JSON.stringify('../' + activeMainModule);
  const entry = `import previous from ${from};export {LocalDemoWallet,NativeGameResources} from ${from};import {createSuperWildsPageWorker} from './page-worker.mjs';import config from './page-assets.mjs';export default createSuperWildsPageWorker(previous,config);\n`;
  const modules = [ ['entry.mjs', entry], ['page-worker.mjs', await readFile(new URL('./page-worker.mjs', import.meta.url), 'utf8')],
    ['page-assets.mjs', 'export default ' + JSON.stringify(config) + ';\n'] ].map(([name, source]) => ({
      name: MODULE_PREFIX + name, source, bytes: Buffer.byteLength(source), sha256: hash(source), contentType: 'application/javascript+module' }));
  const bytes = modules.reduce((n, m) => n + m.bytes, 0);
  if (bytes > 130000) throw Error('SUPERWILDS_PAGE_BUDGET_EXCEEDED');
  return { config, modules, records, report: { schema: 'zplay/superwilds-page-build/v1', sourceCommit, activeMainModule,
    gameId: GAME_ID, route: GAME_ROUTE, assetRevision, bytes, modules: modules.map(({ source, ...pin }) => pin),
    storedAssets:config.assetPins,financialAuthority: 'Existing authenticated same-site server only; no fixture or local wallet', liveVerified: false } };
}

export async function writeSuperWildsPage(directory, build) {
  await mkdir(resolve(directory, MODULE_PREFIX), { recursive: true });
  for (const module of build.modules) await writeFile(resolve(directory, module.name), module.source);
  await writeFile(resolve(directory, 'superwilds-kv-records.json'), JSON.stringify(build.records) + '\n');
  await writeFile(resolve(directory, 'superwilds-page-report.json'), JSON.stringify(build.report, null, 2) + '\n');
}
