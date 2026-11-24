export const SIGN_IN_PATH='/jetx-sign-in-20261107.mjs';
// The existing player application owns the login form and issues the session.
// This only opens that form and returns a successful login to the game.
export const SIGN_IN_SOURCE=String.raw`
const target='/games/jetx_native',key='zplay.jetx.return';
const query=new URL(location.href);
let requested=query.searchParams.get('play')==='jetx_native';
try{if(requested)sessionStorage.setItem(key,target);else requested=sessionStorage.getItem(key)===target;}catch{}
if(requested){
 let stopped=false,opened=false,checking=false,sawSignedIn=false;
 const original=window.fetch.bind(window);
 const clear=()=>{try{sessionStorage.removeItem(key);}catch{}};
 const check=async()=>{
  if(stopped||checking||document.hidden)return;checking=true;
  try{
   const r=await original('/api/machine-session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
   if(r.ok&&(await r.json()).authenticated===true){stopped=true;clear();observer.disconnect();location.replace(target);}
  }catch{}finally{checking=false;}
 };
 const show=()=>{
  if(stopped)return;
  if(!opened){const button=document.querySelector('.login-button');if(button){opened=true;button.click();}}
  if(!sawSignedIn&&document.querySelector('.signed-in-header')){sawSignedIn=true;void check();}
 };
 const observer=new MutationObserver(show);
 observer.observe(document.documentElement,{subtree:true,childList:true});
 window.fetch=async(input,options)=>{
  const response=await original(input,options);
  let url;try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch{return response;}
  if(!stopped&&url.origin===location.origin&&response.ok&&(response.headers.get('X-Zplay-Session')==='started'||/\/api\/(?:(?:auth|player)\/)?(?:login|register)$/.test(url.pathname)))void check();
  return response;
 };
 window.addEventListener('pageshow',()=>void check());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
 window.addEventListener('pagehide',()=>{stopped=true;observer.disconnect();},{once:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{show();void check();},{once:true});
 else{show();void check();}
}
`;
