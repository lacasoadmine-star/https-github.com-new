import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
const source=readFileSync(new URL('../source/runtime-before.mjs',import.meta.url),'utf8');
const match=source.match(/const coreBytes=gunzipSync\(Buffer.from\('([^']+)'/);if(!match)throw Error('EMBEDDED_CORE_MISSING');
const bytes=gunzipSync(Buffer.from(match[1],'base64'));
const loaded=await import('data:text/javascript;base64,'+bytes.toString('base64'));
export const {MATH,getGame,spin,toUnits,mathSha256}=loaded;
