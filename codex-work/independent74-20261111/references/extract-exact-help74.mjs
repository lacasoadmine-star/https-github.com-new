// Offline literal-key extraction only. No remote JavaScript, fuzzy aliases,
// provider-private parameters or additional official demo wagers.
import assert from 'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';
const source=JSON.parse(await readFile(new URL('./official-slot-help-en-20261111.json',import.meta.url),'utf8'));
const scope=JSON.parse(await readFile(new URL('../scope/official74.json',import.meta.url),'utf8'));
const captions=source.captions;assert(captions&&typeof captions==='object');
const inventory=new Map();for(const key of Object.keys(captions)){const match=/^help\.slots\.([^.]+)\./.exec(key);if(match){const list=inventory.get(match[1])??[];list.push(key);inventory.set(match[1],list);}}
const patterns={wild:/\bwilds?\b/i,scatter:/\bscatters?\b/i,freeSpins:/free\s*spins?/i,respin:/re[ -]?spins?/i,rollingReelsCascade:/rolling\s+reels|cascad|tumbli?ng/i,multiplier:/multiplier|multiplied|\bx(?:2|3|5|10|15|20)\b/i,gambleX2:/gamble|risk game|double|red\s*\/\s*black/i,bonus:/bonus/i,collect:/collect|take win/i,auto:/auto[ -]?(?:play|spin)/i,turbo:/turbo/i,disconnection:/disconnect|malfunction/i,betLimits:/min(?:imum)?\s*bet|max(?:imum)?\s*bet|bet\s*limit/i,rtp:/\brtp\b|return to player/i};
const plain=text=>String(text).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const records=scope.entries.map(entry=>{
 const launch=new URL(entry.demoUrl),gameName=launch.searchParams.get('GameName');
 const namespace=gameName?.toLowerCase()??null; // case-fold only; no punctuation stripping or aliases
 const keys=namespace?[...inventory.entries()].filter(([literal])=>literal.toLowerCase()===namespace).flatMap(([,keys])=>keys):[];
 const definitions=keys.map(key=>({key,literalHtml:captions[key],text:plain(captions[key])}));
 const features=Object.fromEntries(Object.entries(patterns).map(([feature,pattern])=>[feature,definitions.filter(item=>pattern.test(item.key+' '+item.text)).map(item=>item.key)]).filter(([,keys])=>keys.length));
 return{gameId:entry.gameId,title:entry.name,protected:entry.protected===true,officialDemoUrl:entry.demoUrl,GameName:gameName,comparisonTransform:'case-fold only',exactNamespace:keys.length?'help.slots.'+namespace:null,exactCaptionCount:keys.length,status:keys.length?'exact-GameName-namespace-found':'no-exact-GameName-namespace-in-this-bundle',featuresMentioned:features,captions:definitions,sourceType:'official-public-Help-localization',providerPrivateProbabilitiesVerified:false,featureObservedInDemoNotEstablishedByThisExtraction:true};
});
const matched=new Set(records.filter(item=>item.exactNamespace).map(item=>item.GameName.toLowerCase()));
const report={sourceFile:'references/official-slot-help-en-20261111.json',sourceUrl:source.sourceUrl,sourceBodySha256:source.sourceBodySha256,method:'Literal help.slots.<namespace> keys matched ONLY to official launch URL GameName after case-folding. No fuzzy aliases, marketed-title substitutions, generic help borrowing or JavaScript execution. Feature tags are text mentions, not proof of implementation or direct observation.',games:records.length,matchedGames:records.filter(item=>item.exactCaptionCount).length,unmatchedGames:records.filter(item=>!item.exactCaptionCount).length,namespaceInventory:[...inventory.entries()].map(([namespace,keys])=>({namespace,keyCount:keys.length,exactGameNameMatched:matched.has(namespace.toLowerCase())})),records,newOfficialDemoRounds:0,productionWrites:0};
assert.equal(report.games,74);for(const item of records)for(const caption of item.captions)assert.equal(caption.key.split('.')[2].toLowerCase(),item.GameName.toLowerCase());
await writeFile(new URL('../reports/current74-exact-help-namespaces.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({games:report.games,matched:report.matchedGames,unmatched:report.unmatchedGames,namespaces:inventory.size,matchedNames:records.filter(item=>item.exactCaptionCount).map(item=>({game:item.title,GameName:item.GameName,captions:item.exactCaptionCount,features:Object.keys(item.featuresMentioned)}))}));
