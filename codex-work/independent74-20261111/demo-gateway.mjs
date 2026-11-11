import {hash} from './gateway.mjs';

const PREFIX='/independent74/demo-api/';
const COOKIE='__Host-ind74_demo';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff',vary:'Cookie'};
const reply=(code,status)=>new Response(JSON.stringify({error:{code,message:code},mode:'demo',currency:'DEMO',realMoney:false}),{status,headers});
function cookie(request,name){const list=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));if(list.length>1)throw Error('INVALID_DEMO_SESSION');return list[0]?.slice(name.length+1)||null;}

// Free-credit requests can reach only independently named objects in the
// existing demo namespace. They never forward a cookie or call a money API.
export function createDemoGateway({previous}={}) {
  return async function demoGateway(request,env,ctx) {
    try {
      const url=new URL(request.url),action=url.pathname.slice(PREFIX.length);
      if(!url.pathname.startsWith(PREFIX)||!['catalog','state','history','action'].includes(action))return reply('NOT_FOUND',404);
      if(request.method!==(action==='action'?'POST':'GET'))return reply('METHOD_NOT_ALLOWED',405);
      if(action==='action'&&(request.headers.get('origin')!==url.origin||!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')))return reply('SAME_ORIGIN_REQUIRED',403);
      if(action==='action'||action==='catalog'){if(url.search)return reply('INVALID_QUERY',400);}
      else if([...url.searchParams.keys()].some(k=>k!=='game_id')||url.searchParams.getAll('game_id').length!==1||!/^ind74_official_[a-z0-9_]{1,60}$/.test(url.searchParams.get('game_id')||''))return reply('INVALID_QUERY',400);
      let token=cookie(request,'sw_session'),accountLinked=false,identity=null,newCookie=null;
      if(token){
        if(token.length>4096)return reply('INVALID_DEMO_SESSION',400);
        identity=await previous.fetch(new Request(new URL('/api/machine-session',url),{headers:{cookie:request.headers.get('cookie'),accept:'application/json'}}),env,ctx);
        if(identity.ok){try{accountLinked=(await identity.json())?.authenticated===true;}catch{}}
        else await identity.body?.cancel();
        if(!accountLinked)token=null;
      }
      if(!token){
        token=cookie(request,COOKIE);
        if(token&&!/^[a-f0-9]{64}$/.test(token))return reply('INVALID_DEMO_SESSION',400);
        if(!token){token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');newCookie=`${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=2592000`;}
      }
      const scope=await hash('independent74-demo-'+(accountLinked?'account:':'guest:')+token);
      const guard=await hash('independent74-demo-session-guard:'+scope);
      if(action==='action'&&request.headers.get('x-demo-session-guard')!==guard)return reply('DEMO_SESSION_REFRESH_REQUIRED',403);
      if(!env.LOCAL_DEMO_WALLETS?.idFromName||!env.LOCAL_DEMO_WALLETS?.get)return reply('DEMO_SERVICE_UNAVAILABLE',503);
      let body;
      if(action==='action'){
        const reader=request.body?.getReader();if(!reader)return reply('INVALID_JSON',400);
        const parts=[];let size=0;
        try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return reply('BODY_TOO_LARGE',413);}parts.push(value);}}finally{reader.releaseLock();}
        body=new Uint8Array(size);let at=0;for(const part of parts){body.set(part,at);at+=part.length;}
      }
      const id=env.LOCAL_DEMO_WALLETS.idFromName('independent74-demo:'+scope);
      const target=new URL('/independent74-demo-internal/'+action+url.search,'https://independent74-demo.internal');
      const upstream=await env.LOCAL_DEMO_WALLETS.get(id).fetch(new Request(target,{method:request.method,headers:{'content-type':'application/json','x-demo-session-guard':guard},...(body?{body}:{})}));
      const outHeaders=new Headers(upstream.headers);for(const [key,value]of Object.entries(headers))outHeaders.set(key,value);
      outHeaders.set('x-demo-account-linked',String(accountLinked));
      if(newCookie)outHeaders.append('set-cookie',newCookie);
      for(const setCookie of identity?.headers.getSetCookie?.()||[])outHeaders.append('set-cookie',setCookie);
      return new Response(upstream.body,{status:upstream.status,headers:outHeaders});
    }catch(error){return reply(error?.message==='INVALID_DEMO_SESSION'?'INVALID_DEMO_SESSION':'DEMO_SERVICE_UNAVAILABLE',error?.message==='INVALID_DEMO_SESSION'?400:503);}
  };
}
