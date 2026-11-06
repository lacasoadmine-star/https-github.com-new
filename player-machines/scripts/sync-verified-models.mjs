import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {legacyGameConfig} from '../public/registry.mjs';
const source=new URL('../../server-fixes/native-rules-20261107/artifacts/client-models.json',import.meta.url);
const models=JSON.parse(await readFile(source,'utf8'));
assert.deepEqual(Object.keys(models.active).sort(),['foxy_hot_20_native','multi_hot_5_native']);
for(const [id,family]of Object.entries({foxy_hot_20_native:'hot_foxy_20',multi_hot_5_native:'multi_hot_5_video'})){
 assert.equal(models.active[id].id,id);assert.equal(models.active[id].presentationGameId,family);
}
for(const [id,model]of Object.entries(models.legacy)){
 const old=legacyGameConfig(id),strips=model.stripCodes.map(strip=>Array.from(strip,code=>model.symbolNames[code.charCodeAt(0)-65]));
 assert.deepEqual(strips,old.strips,id+' legacy strips changed');
 for(const key of ['mathVersion','engineVersion','mathSha256','linePaths','rules','features','betLevels','maxWinMultiplier','paytable'])assert.deepEqual(model[key],old[key],id+' legacy '+key+' changed');
}
await writeFile(new URL('../public/verified-models.mjs',import.meta.url),'// Generated from server-fixes/native-rules-20261107/artifacts/client-models.json.\nexport const verifiedDefinitions='+JSON.stringify(models.active)+';\n');
console.log(JSON.stringify({games:Object.keys(models.active),hash:models.active.foxy_hot_20_native.mathSha256}));
