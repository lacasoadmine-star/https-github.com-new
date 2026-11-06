// Only the two separately launched machines are added here. Legacy catalogue
// objects keep their IDs, order, artwork, favourite keys and launch URLs.
export const RELEASE='player-native-catalog-20261107-r1';
export const PREFIX='/'+RELEASE+'/';
export const nativeGames=Object.freeze([
 Object.freeze({id:'foxy_hot_20_native',title:'Foxy Hot 20',reels:5,rows:3,lines:20,art:PREFIX+'foxy-hot-20.webp'}),
 Object.freeze({id:'multi_hot_5_native',title:'Multi Hot 5',reels:3,rows:3,lines:5,art:PREFIX+'multi-hot-5.webp'})
]);
const nativeIds=new Set(nativeGames.map(game=>game.id));
export function mergeNativeGames(existing,config){
 const additions=[];
 for(const definition of nativeGames){
  const raw=(Array.isArray(config?.games)?config.games:[]).find(game=>game?.id===definition.id);
  if(raw&&(raw.demo===true||raw.available===false||raw.enabled===false))continue;
  const previous=existing.find(game=>game.id===definition.id);
  additions.push({...previous,...definition,nativeId:definition.id,category:'Slots',provider:typeof raw?.studio==='string'?raw.studio:typeof raw?.provider==='string'?raw.provider:'ZPLAY',available:true,launch:'/games/'+definition.id,source:'native-machines-20261107-r1',nativeMachine:true});
 }
 return [...additions,...existing.filter(game=>!nativeIds.has(game.id))];
}
// Home retains the same six legacy cards and adds both new cabinets.
export function homeGames(games){return [...games.filter(game=>game.nativeMachine),...games.filter(game=>!game.nativeMachine).slice(0,6)];}
// A new catalogue ID must be acknowledged by the existing authenticated store.
// Never turn an ignored/unsupported write into a local-only Saved indicator.
export async function confirmNativeFavourite(data,id,enabled,read){
 const confirmed=Array.isArray(data)?data:await read();
 if(!Array.isArray(confirmed)||confirmed.includes(id)!==enabled)throw Error('Your favourite could not be updated. Please try again.');
 return confirmed;
}
