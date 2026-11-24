import {readFile,writeFile} from 'node:fs/promises';
import {parseRequestedNames,reservedMachineId,compareName,hash,validateHistoricalManifest,validateSelection,validateExecution} from './catalog.mjs';
const root=new URL('./',import.meta.url);
const readJSON=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
const requestedBytes=await readFile(new URL('requested-names.txt',root));
const names=parseRequestedNames(requestedBytes.toString());
const snapshot=await readJSON('existing-identities.json'),official=await readJSON('official-smartsoft-snapshot.json');
// Older official index records include scheme-relative and host-only demo links.
// Resolve only those snapshot URLs for classification; active references require HTTPS.
const demoURL=value=>new URL(value.startsWith('//')?'https:'+value:/^https?:\/\//.test(value)?value:'https://'+value);
const queries=new Map(official.entries.filter(g=>g.demo_url).map(g=>[demoURL(g.demo_url).searchParams.get('GameName'),g]));
const displays=new Map(official.entries.map(g=>[compareName(g.name),g]));
const spellingReview={
 ExtraJuciy:{candidate:'Extra Juicy',status:'unverified-spelling-candidate',reason:'Requested Juciy is retained; candidate spelling requires an official title match.'},
 ExtraJuciyMegaways:{candidate:'Extra Juicy Megaways',status:'unverified-spelling-candidate',reason:'Requested Juciy is retained; candidate spelling requires an official title match.'},
 CricketCrash:{candidate:null,status:'unresolved-identity',reason:'Cricket X and CricketerX are distinct indexed titles; neither is silently substituted.'},
 Cappadocia:{candidate:null,status:'unresolved-identity',reason:'Cai Balao Cappadocia is indexed, but an omitted-prefix identity is not established.'},
 PyramidsKing:{candidate:null,status:'unresolved-spelling',reason:'Plural spelling is retained until the exact official title is verified.'},
 BookOfTome:{candidate:null,status:'unresolved-identity',reason:'Exact official identity is not established.'},
 SupeItUp:{candidate:null,status:'unresolved-spelling',reason:'Requested spelling is retained; do not infer a correction.'}
};
const entries=names.map((requestedName,index)=>{
 const exact=queries.get(requestedName)||displays.get(compareName(requestedName));
 const providerRow=snapshot.providerMetadata.find(g=>compareName(g.name)===compareName(requestedName));
 const oldMatches=snapshot.catalog.filter(g=>compareName(g.name)===compareName(requestedName));
 const category=exact?.demo_url?demoURL(exact.demo_url).searchParams.get('GameCategory'):null;
 const provider=exact?'SmartSoft':providerRow?.studio||'unknown';
 const family=providerRow?.category||((category||'').toLowerCase()==='slots'?'slots':oldMatches.find(g=>g.type==='plinko')?'plinko':'unknown');
 return {requestOrdinal:index+1,requestedName,machineId:reservedMachineId(requestedName),displayName:requestedName,provider,family,
  classificationEvidence:exact?{source:official.source,officialTitle:exact.name.trim(),officialPage:exact.url,officialDemo:exact.demo_url||null,observedAt:official.observedAt,status:'historical-official-title-evidence-only'}:providerRow?{source:'existing-identities.json#providerMetadata',existingProviderId:providerRow.id,status:'existing-provider-metadata-only'}:null,
  canonicalCandidate:exact?{name:exact.name.trim(),confidence:'historical-official-index-match',adopted:false}:null,
  spellingReview:spellingReview[requestedName]||null,existingIdentityMatches:oldMatches.map(g=>({id:g.id,sourceId:g.sourceId,name:g.name})),
  status:'historical-request',available:false,launch:null};
});
const manifest={schemaVersion:1,scope:'historical-request',count:entries.length,activeSelectionCount:20,source:'Latest repeated user game list; one copy, exact order and spelling.',requestedNamesSha256:hash(requestedBytes),preservationBaseline:'existing-identities.json',notes:['This is a request inventory, not a playable catalogue.','Names outside the separately verified active20 are deferred.','Public demo references do not establish executable engines or wallet integration.'],entries};
const proof=validateHistoricalManifest(manifest,names,snapshot);
await writeFile(new URL('historical-request.json',root),JSON.stringify(manifest,null,2)+'\n');
let selection={state:'not-selected',reason:'Waiting for official reference verification and root selection of20.'};
try { const selected=await readJSON('active-selection.json');let queue=null;try{queue=await readJSON('latest-requested-queue.json');}catch(e){if(e.code!=='ENOENT')throw e;}selection={state:'selected',...validateSelection(selected,manifest,snapshot,queue),execution:validateExecution(selected)}; }
catch(error){if(error.code!=='ENOENT')throw error;}
const result={...proof,requestedNamesSha256:manifest.requestedNamesSha256,verifiedHistoricalProviderClassifications:entries.filter(g=>g.provider!=='unknown').length,spellingOrIdentityReview:entries.filter(g=>g.spellingReview).map(g=>g.requestedName),selection};
await writeFile(new URL('validation.json',root),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
