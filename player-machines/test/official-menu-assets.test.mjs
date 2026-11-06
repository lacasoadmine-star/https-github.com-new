import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sprites,bookAlt} from '../public/official-menu-assets.mjs';

test('native menu images and font retain exact captured original bytes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../evidence/r13/menu-assets.json',import.meta.url),'utf8'));
 assert.equal(manifest.assets.length,13);
 for(const source of manifest.assets){
  assert.equal(source.status,200);assert(source.url.startsWith('https://static.ssg-public.com/cache/b15/GameLauncher/Content/'));
  const value=source.key==='bookAlt'?bookAlt:sprites[source.key];assert.equal(typeof value,'string',source.key);
  const bytes=Buffer.from(value.slice(value.indexOf(',')+1),'base64');assert.equal(bytes.length,source.bytes,source.key);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256,source.key);
 }
});
