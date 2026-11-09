import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {ASSETS as r4} from '../controls-recovered/remaining20-ice-controls-assets-r4.mjs';
import {ASSETS as r5} from '../ice-controls-r5/remaining20-ice-controls-assets-r5.mjs';

const root='/workspace/scratch/14a9686e6662/',sha=value=>createHash('sha256').update(value).digest('hex');
const inventory=JSON.parse(await fs.readFile(new URL('../controls-recovered/active-baseline.json',import.meta.url))).find(w=>w.worker==='superwin-library-100').inventory;
export const sources=[];
async function verified(path){const bytes=await fs.readFile(path),name=path.split('/').at(-1),expected=inventory.find(m=>m.name===name);assert(expected,name);assert.equal(bytes.length,expected.size);assert.equal(sha(bytes),expected.sha256);sources.push({name,sha256:expected.sha256});return bytes.toString();}
const body=await verified(root+'remaining20-r4-credits-do/library/remaining20-credits-r4.mjs');
const offset=body.indexOf('var ASSETS = '),start=body.indexOf('{',offset);assert(offset>=0);
let end=-1,depth=0,quote=null,escaped=false;
for(let i=start;i<body.length;i++){const char=body[i];if(quote){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char===quote)quote=null;continue;}if(char==='"'||char==="'"||char==='`'){quote=char;continue;}if(char==='{')depth++;else if(char==='}'&&--depth===0){end=i+1;break;}}
assert(end>start);const raw=vm.runInNewContext('('+body.slice(start,end)+')',Object.create(null),{timeout:2000}),base={};
const mime={mjs:'application/javascript; charset=utf-8',js:'application/javascript; charset=utf-8',json:'application/json; charset=utf-8',html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
for(const[name,value]of Object.entries(raw)){assert.equal(typeof value,'string');if(name.startsWith('r4/'))base[name.slice(3)]={body:value,type:mime[name.split('.').at(-1)]||'application/octet-stream',encoding:'utf8',bytes:Buffer.byteLength(value),sha256:sha(value)};}
async function overlay(file){await verified(file);const values=(await import(file)).OVERLAY;assert(values);for(const item of Object.values(values)){assert.equal(Buffer.byteLength(item.body),item.bytes);assert.equal(sha(item.body),item.sha256);}return values;}
const review2=await overlay(root+'remaining20-r4-review2/library/remaining20-review2-assets.mjs');
const review3=await overlay(root+'remaining20-r4-review3/library/remaining20-review3-assets.mjs');
const review4=await overlay(root+'remaining20-r4-review4/library/remaining20-review4-assets.mjs');
export const FIRST={...base,...review2,...review3,...review4};
export const SEVEN={...FIRST,...await overlay(root+'remaining20-r5-seven-client/library/remaining20-r5-seven-assets.mjs'),...await overlay(root+'remaining20-r5-seven-review1/library/remaining20-seven-review1-assets.mjs')};
export const DELUXE={...SEVEN,...await overlay('/workspace/scratch/15f5b50f5a14/current-new-modules/deluxe-strip-assets-r1.mjs')};
export const COIN={...SEVEN,...await overlay('/workspace/scratch/15f5b50f5a14/current-new-modules/remaining20-r6-coin-assets.mjs')};
export const ICE_R4={...SEVEN,...r4},ICE_R5={...ICE_R4,...r5};
export const FAMILY_MAPS={ice:ICE_R5,habesha:FIRST,modern:SEVEN,deluxe:DELUXE};
export const STATIC_MAPS=[
 ['/native-library/remaining20/20261109-r4/',base],
 ['/native-library/remaining20/20261109-r4-review4/',FIRST],
 ['/native-library/remaining20/20261109-r5-seven/',SEVEN],
 ['/native-library/remaining20/20261109-r5-seven-review1/',SEVEN],
 ['/native-library/remaining20/20261109-deluxe-strip-r1/',DELUXE],
 ['/native-library/remaining20/20261109-r6-coin/',COIN],
];
