import '/native-library/remaining20/20261110-construction-r15/runtime-r17/entry.mjs';
// Only the original same-origin account endpoint decides whether the player
// needs to sign in. Never infer identity from a balance, cached UI or game error.
export async function checkGameAccount({location=globalThis.location,fetchImpl=globalThis.fetch?.bind(globalThis),navigate=path=>location.replace(path),ids=[],timeoutMs=7000}={}){
 const id=/^\/games\/([a-z0-9_]+)$/.exec(location?.pathname||'')?.[1];
 if(!ids.includes(id))return 'outside-scope';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetchImpl('/api/machine-session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal:controller.signal});
  if(!response.ok)return 'unavailable';
  const data=await response.json();
  if(data?.authenticated===true)return 'authenticated';
  if(data?.authenticated!==false)return 'unavailable';
  navigate('/?play='+id);return 'sign-in';
 }catch{return 'unavailable';}finally{clearTimeout(timer);}
}
if(globalThis.document&&globalThis.location)void checkGameAccount({ids:__RELEASED_ACCOUNT_IDS__});
