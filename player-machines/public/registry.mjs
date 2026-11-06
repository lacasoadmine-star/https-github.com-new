import {verifiedDefinitions} from './verified-models.mjs';
import {extraDefinitions} from './extra-games.mjs';
export const RELEASE="zplay-native-machines-20261107-r1";
const definitions={"hot_foxy_20":{"id":"hot_foxy_20","name":"Hot Foxy 20","reels":5,"rows":3,"theme":"foxy","paylines":20,"wheel":{"position":"top","values":[1,2,3,4,5],"weights":[30,25,20,15,10]},"betLevels":["0.10","0.20","0.50","1.00","2.00","4.00","5.00","10.00","20.00","50.00","100.00","200.00","400.00","500.00","1000.00","2000.00","3000.00","4000.00"],"previewReels":[["lemon","777","cherry","big_star","orange","winged_bell","watermelon","scatter","fox"],["lemon","orange","cherry","777","big_star","winged_bell","watermelon","scatter","fox"],["777","orange","cherry","big_star","lemon","watermelon","winged_bell","fox","scatter"],["cherry","winged_bell","777","orange","watermelon","big_star","lemon","fox","scatter"],["winged_bell","lemon","orange","777","cherry","watermelon","big_star","fox","scatter"]],"features":{"freeSpins":{"trigger":3,"spins":10,"retrigger":true,"winMultiplier":1},"gambleRounds":3,"cascadeLimit":0,"maxStackMultiplier":0,"wildStack":false,"jackpots":{},"bonusPick":false},"mathVersion":"2026-10-27-reference-v3000","engineVersion":"superwin-slot-runtime-reference-v3000","currency":"ETB","maxWinMultiplier":1000,"paytable":{"777":{"3":20,"4":100,"5":200},"big_star":{"3":100,"4":200,"5":1000},"winged_bell":{"3":10,"4":40,"5":100},"watermelon":{"3":10,"4":40,"5":100},"orange":{"3":5,"4":10,"5":40},"lemon":{"3":5,"4":10,"5":40},"cherry":{"3":5,"4":10,"5":40}},"linePaths":[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,1,0,1,0],[2,1,2,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,0,0,1,2],[2,2,2,1,0],[0,1,2,2,2]],"rules":{"lineDirection":"left_to_right","minimumMatch":3,"betAllocation":"total_bet_divided_by_lines","wildSymbols":["fox"],"wildReplacesScatter":false,"scatter":{"trigger":3,"pays":{"3":2,"4":10,"5":50},"multipliedByWheel":true,"jackpotsReplaceScatterPay":true},"settlement":{"calculationDecimals":4,"walletDecimals":2,"rounding":"floor"},"gamble":{"choices":["RED","BLACK"],"winProbability":0.475,"winMultiplier":2,"maxRounds":3}},"enabled":true,"presentation":{"version":2190,"reels":5,"rows":3,"paylines":20,"features":["Free spins","Gamble"],"actions":{"spin":true,"gamble":true,"bonusPick":false}},"recipe":{"counts":{"777":1400,"big_star":480,"winged_bell":1800,"watermelon":1800,"orange":4773,"lemon":4773,"cherry":4774,"fox":100,"scatter":100},"seeds":[11,22,33,44,55]}},"multi_hot_5_video":{"id":"multi_hot_5_video","name":"Multi Hot 5","reels":3,"rows":3,"theme":"hot","paylines":5,"wheel":{"position":"side","values":[1,2,3,4,5],"weights":[25,25,20,20,10]},"betLevels":["0.10","0.20","0.50","1.00","2.00","4.00","5.00","10.00","20.00","50.00","100.00","200.00","400.00","500.00","1000.00","2000.00","3000.00","4000.00"],"previewReels":[["plum","777","lemon","orange","dollar","watermelon","golden_bell","grapes","cherry"],["dollar","777","plum","watermelon","golden_bell","grapes","lemon","orange","cherry"],["777","orange","golden_bell","watermelon","grapes","dollar","plum","cherry","lemon"]],"features":{"freeSpins":{"trigger":100,"spins":0,"retrigger":false,"winMultiplier":1},"gambleRounds":3,"cascadeLimit":0,"maxStackMultiplier":0,"wildStack":false,"jackpots":{},"bonusPick":false},"mathVersion":"2026-10-27-reference-v3000","engineVersion":"superwin-slot-runtime-reference-v3000","currency":"ETB","maxWinMultiplier":250,"paytable":{"777":{"3":75},"dollar":{"3":50},"golden_bell":{"3":25},"watermelon":{"3":20},"grapes":{"3":20},"plum":{"3":10},"lemon":{"3":10},"orange":{"3":10},"cherry":{"3":10}},"linePaths":[[0,0,0],[1,1,1],[2,2,2],[0,1,2],[2,1,0]],"rules":{"lineDirection":"left_to_right","minimumMatch":3,"betAllocation":"total_bet_divided_by_lines","wildSymbols":[],"wildReplacesScatter":false,"scatter":null,"settlement":{"calculationDecimals":4,"walletDecimals":2,"rounding":"floor"},"gamble":{"choices":["RED","BLACK"],"winProbability":0.475,"winMultiplier":2,"maxRounds":3}},"enabled":true,"presentation":{"version":2190,"reels":3,"rows":3,"paylines":5,"features":["Gamble"],"actions":{"spin":true,"gamble":true,"bonusPick":false}},"recipe":{"counts":{"777":1276,"dollar":1110,"golden_bell":1110,"watermelon":1110,"grapes":1110,"plum":1110,"lemon":1110,"orange":1110,"cherry":954},"seeds":[1,2,3]}}};

Object.assign(definitions,extraDefinitions);
export const LEGACY_MATH_VERSION='2026-10-27-reference-v3000';
export const LEGACY_ENGINE_VERSION='superwin-slot-runtime-reference-v3000';
export const LEGACY_MATH_SHA256='9bc6cfaad2fa6558882bc88a3eb78514f1432ab1c11a52217a427d1f383ba8e7';
for(const definition of Object.values(definitions))definition.mathSha256=LEGACY_MATH_SHA256;
const legacyDefinitions=structuredClone(definitions);
export const nativeFamilies=Object.freeze({foxy_hot_20_native:'hot_foxy_20',multi_hot_5_native:'multi_hot_5_video'});
for(const [id,model]of Object.entries(verifiedDefinitions)){
 const family=nativeFamilies[id];if(!family)continue;
 if(model.id!==id||model.presentationGameId!==family)throw Error('NATIVE_MODEL_IDENTITY_MISMATCH');
 const base=legacyDefinitions[family];definitions[id]={...base,...model,presentation:{...base.presentation,features:['Gamble']}};
}
const looks = {
 multi_hot_100: {title:'MULTI HOT',accent:'100',skin:'hundred',x:3,y:249,w:414,h:336,titleY:121,speed:11,stagger:170,startStagger:90,duration:1100,travel:16,wheelEnd:750,multiplierStrip:[1,3,5,2,4,3],note:261.63},
 wild_multi_stars: {title:'WILD MULTI STARS',accent:'',skin:'stars',x:20,y:159,w:380,h:244,titleY:29,speed:11,stagger:190,startStagger:0,duration:1100,travel:16,wheelEnd:1000,multiplierStrip:[1,4,3,2,5,4,1,3,5,2],note:311.13},
 multi_hot_5_video: { title: 'MULTI HOT', accent: '5', skin: 'emerald', x: 80, y: 137, w: 336, h: 252, titleY: 95, speed: 10, stagger: 190, startStagger: 170, duration: 950, travel: 10, wheelEnd: 480, multiplierStrip: [1,4,2,3,5], note: 261.63 },
 hot_foxy_20: { title: 'Hot Foxy', accent: '20', skin: 'forest', x: 8, y: 165, w: 404, h: 257, titleY: 43, speed: 11, stagger: 200, startStagger: 0, duration: 1100, travel: 16, wheelEnd: 1150, multiplierStrip: [5,1,4,2,1,3,5,2,4,3], note: 329.63 }
};
const aliases = {'multi-hot-100':'multi_hot_100','wild-multi-stars':'wild_multi_stars','multi-hot-5':'multi_hot_5_video','multi_hot_5':'multi_hot_5_video','multi-hot-5-new':'multi_hot_5_video','hot-foxy-20':'hot_foxy_20','foxy-hot-20':'hot_foxy_20'};
Object.assign(aliases,{'foxy-hot-20-native':'foxy_hot_20_native','multi-hot-5-native':'multi_hot_5_native'});
export function resolveGame(value) { const id = String(value || '').replace(/^sw-/, ''); return definitions[id] ? id : aliases[id] || null; }
export function presentationGameId(value){const id=typeof value==='object'&&value?value.machineId||value.id||value.gameId:value;return nativeFamilies[id]||id;}
export function presentationConfig(model){return {...model,id:presentationGameId(model),machineId:model.machineId||model.id};}
export function makeStrips(recipe) { return recipe.seeds.map(seed => { const strip = Object.entries(recipe.counts).flatMap(([s, n]) => Array(n).fill(s)); let value = seed; for (let i=strip.length-1;i>0;i--) { value=(Math.imul(value,1664525)+1013904223)>>>0; const j=value%(i+1); [strip[i],strip[j]]=[strip[j],strip[i]]; } return strip; }); }
export function modelIdentity(model){return {mathVersion:model.mathVersion,engineVersion:model.engineVersion,mathSha256:model.mathSha256};}
export function gameConfig(id,identity=null) {
 id=resolveGame(id);if(!id)throw Error('UNKNOWN_GAME');
 const definition=identity?[definitions[id],legacyDefinitions[id]].filter(Boolean).find(model=>model.mathVersion===identity.mathVersion&&model.engineVersion===identity.engineVersion&&model.mathSha256===identity.mathSha256):definitions[id];
 if(!definition)throw Error('UNKNOWN_GAME_MODEL');
 const g=structuredClone(definition),symbols=g.symbolNames||Object.keys(g.recipe.counts);
 const legacy=legacyDefinitions[id],legacySymbols=legacy?(legacy.symbolNames||Object.keys(legacy.recipe.counts)):[];
 return {...g,presentationGameId:presentationGameId(id),visual:looks[presentationGameId(id)],strips:g.stripCodes?g.stripCodes.map(s=>Array.from(s,k=>g.symbolNames[k.charCodeAt(0)-65])):makeStrips(g.recipe),symbols,presentationSymbols:[...new Set([...symbols,...legacySymbols])]};
}
export function gameConfigForReceipt(receipt){if(!receipt||!receipt.gameId)throw Error('ROUND_IDENTITY_MISMATCH');return gameConfig(receipt.gameId,receipt);}
export function legacyGameConfig(id){id=resolveGame(id);if(!id)throw Error('UNKNOWN_GAME');if(!legacyDefinitions[id])throw Error('UNKNOWN_LEGACY_GAME');return gameConfig(id,legacyDefinitions[id]);}
export function isLegacyModel(model){const known=legacyDefinitions[resolveGame(model.id||model.gameId)];return !!known&&known.mathVersion===model.mathVersion&&known.engineVersion===model.engineVersion&&known.mathSha256===model.mathSha256;}
export function defaultStake(model){return nativeFamilies[model.id]?model.betLevels[0]:model.betLevels.includes('2.00')?'2.00':model.betLevels[0];}
export function gameConfigForModel(remote){
 if(!remote||!remote.id)throw Error('MODEL_IDENTITY_MISMATCH');
 // The pre-upgrade public model omitted the hash; only that exact known version
 // may use its embedded pin. Receipts and versioned state always require a hash.
 const legacy=legacyDefinitions[resolveGame(remote.id)],hash=remote.mathSha256??(legacy&&remote.mathVersion===legacy.mathVersion&&remote.engineVersion===legacy.engineVersion?legacy.mathSha256:undefined);
 return gameConfig(remote.id,{...remote,mathSha256:hash});
}
export const games = Object.keys(definitions);
