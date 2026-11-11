// Navigation intent only. This module never stores account identity or money.
export const RESUME_KEY='zplay.independent74.resume.v1';
const TTL=30*60*1000;

export function readResume(storage,gameIds,now=Date.now()){
  try{
    const value=JSON.parse(storage?.getItem(RESUME_KEY)||'null');
    if(value?.version===1&&gameIds.has(value.gameId)&&Number.isSafeInteger(value.createdAt)&&value.createdAt<=now&&now-value.createdAt<TTL)return value;
    storage?.removeItem(RESUME_KEY);
  }catch{}
  return null;
}

export function saveResume(storage,gameId,gameIds,now=Date.now()){
  if(!gameIds.has(gameId))return null;
  const value={version:1,gameId,createdAt:now};
  try{storage?.setItem(RESUME_KEY,JSON.stringify(value));}catch{}
  return value;
}

export function validSignInMessage(event,{origin,frameWindow,gameId}){
  return validMachineMessage(event,{origin,frameWindow,gameId,type:'independent74:sign-in'});
}

export function validMachineMessage(event,{origin,frameWindow,gameId,type}){
  return !!frameWindow&&event.origin===origin&&event.source===frameWindow&&event.data?.type===type&&event.data.gameId===gameId;
}

export function resumeFromUrl(href,gameIds){
  const url=new URL(href),ids=url.searchParams.getAll('ind74');
  if(url.pathname!=='/'||ids.length!==1||!gameIds.has(ids[0]))return null;
  const gameId=ids[0];url.searchParams.delete('ind74');
  return {gameId,cleanUrl:url.pathname+url.search+url.hash};
}
