import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('./',import.meta.url),hash=b=>createHash('sha256').update(b).digest('hex');
const groups=[
 ['../existing-new-wager-followup/client-candidate/',{'existing-new-wager-client-worker-r1.mjs':null,'existing-new-wager-client-index-r1.mjs':null,'existing-new-wager-client-assets-r1.mjs':null,'existing-new-wager-client-library-r1.mjs':null}],
 ['../new-zoom-older3-followup/',{'older-new-zoom-policy-r1.mjs':'711e95f15cd93542bd68edbaab7c28d03330996e58900028de546ccdb9a2a0f1','older-new-zoom-assets-r1.mjs':'e887ba5ad5887729819b1f917f4eef0204725e26d0c1cdac29c64076425abc6e','older-new-zoom-worker-r1.mjs':'bdf41bd316ddcb60b5ec2c2c73e52d79273336fadb8c6f98b9720b929f8037fd'}],
 ['../new-lobby-audit/',{'official-new-covers-assets-r1.mjs':'ee59cc64fd291b121f159a28b7f6ecc5ce54146bad71511bee739db1a04dcde8','official-new-covers-html-r1.mjs':'19f3060e0e7aff28fe24be4d55a4bf50e70f64f01901a96f152bcd5ddbb24bdf'}],
];
const wager=JSON.parse(await fs.readFile(new URL('../existing-new-wager-followup/client-candidate/manifest.json',root),'utf8'));
const wagerModules=[...wager.modules.player,...wager.modules.library];
for(const[dir,names]of groups)for(const[name,pinned]of Object.entries(names)){
 const bytes=await fs.readFile(new URL(dir+name,root)),expected=pinned||wagerModules.find(m=>m.name===name)?.sha256;
 if(!expected||hash(bytes)!==expected)throw Error('REVIEWED_MODULE_CHANGED:'+name);
 await fs.writeFile(new URL(name,root),bytes);
}
const sides={
 player:['existing-new-release-player-entry-r7.mjs','existing-new-wager-client-worker-r1.mjs','existing-new-wager-client-index-r1.mjs','older-new-zoom-policy-r1.mjs','older-new-zoom-assets-r1.mjs','older-new-zoom-worker-r1.mjs','official-new-covers-html-r1.mjs','official-new-covers-worker-r1.mjs'],
 library:['existing-new-release-library-entry-r7.mjs','existing-new-wager-client-assets-r1.mjs','existing-new-wager-client-library-r1.mjs','official-new-covers-assets-r1.mjs','official-new-covers-library-r1.mjs']
};
const modules={};for(const[side,names]of Object.entries(sides)){modules[side]=[];for(const name of names){const b=await fs.readFile(new URL(name,root));modules[side].push({name,size:b.length,sha256:hash(b),content_type:'application/javascript+module',content_base64:b.toString('base64')});}}
await fs.writeFile(new URL('modules.private.json',root),JSON.stringify(modules));
const manifest={schemaVersion:1,scope:{wager:['multihot40_native','balloon_native'],zoomAndCovers:['multihot40_native','balloon_native','jetx_native'],protected:['multi_hot_5_native','foxy_hot_20_native']},baseline:{player:'3f21e2b4-cdfa-4fd3-ab0e-9141067d399c',library:'c40f38d0-3395-4e6c-8a48-c5f83502dd88'},backendPrerequisite:{sourceSha256:'ef58663f141a3f7692d66e0e6d4cef06bf7a69936a218b37f1fc967814cec058',modelVersions:wager.versions},modules:Object.fromEntries(Object.entries(modules).map(([side,rows])=>[side,rows.map(({content_base64,...r})=>r)])),newRemainingCashGatesChanged:false};
await fs.writeFile(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(modules).map(([side,rows])=>[side,{modules:rows.length,bytes:rows.reduce((s,r)=>s+r.size,0)}]))));
