// Status failures must not describe an already-built native game as still
// being constructed. LIVE continues to require the original verified status.
export function patchLobbyUI(source){
 const changes=[
  ['let operational=new Map();',"let operational=new Map(),availability='checking';"],
  ['  updateLobby();\n  total.textContent=',"  availability='ready';updateLobby();\n  total.textContent="],
  ['operational.clear();updateLobby();',"operational.clear();availability='unavailable';updateLobby();"],
  ["  const live=operational.has(id),mode=card.querySelector('.r20-native-mode');\n  if(mode&&mode.textContent!==(live?'LIVE':'Preparing'))mode.textContent=live?'LIVE':'Preparing';",
   "  const live=operational.has(id),mode=card.querySelector('.r20-native-mode');\n  const status=live?'LIVE':id==='coinminer_native'?'Preparing':availability==='checking'?'Checking…':'Unavailable';\n  if(mode&&mode.textContent!==status)mode.textContent=status;"],
  ['setInterval(refresh,30000)','setInterval(refresh,10000)'],
 ];
 for(const[before,after]of changes){if(typeof source!=='string'||source.split(before).length!==2)throw Error('RETAINED_LOBBY_CONTRACT_CHANGED');source=source.replace(before,after);}
 return source;
}
