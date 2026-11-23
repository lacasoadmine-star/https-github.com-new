import {BurnServerError} from './lifecycle.mjs';
import {BURN_WILDS_GAME_ID} from '../expansion.mjs';
export const BURN_HTTP_BASE='/api/slots/new-games90/burn-wilds';
export const BURN_UPSTREAM_BASE='/api/new-games90/burn-wilds';
const paths=new Map([BURN_HTTP_BASE,BURN_UPSTREAM_BASE].flatMap(base=>[
 [base+'/state','state'],[base+'/spin','spin']
]));
const response=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,
 headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff',...extra}});
async function readAction(request){
 if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
   throw new BurnServerError('BURN_SERVER_JSON_REQUIRED',415);
 const claimed=request.headers.get('content-length');
 if(claimed!==null&&(!/^\d+$/.test(claimed)||Number(claimed)>8192))
   throw new BurnServerError('BURN_SERVER_BODY_LIMIT',413);
 if(!request.body)throw new BurnServerError('BURN_SERVER_BODY_REQUIRED',400);
 const reader=request.body.getReader();const chunks=[];let size=0;
 try{
   while(true){const {done,value}=await reader.read();if(done)break;
     size+=value.byteLength;
     if(size>8192)throw new BurnServerError('BURN_SERVER_BODY_LIMIT',413);
     chunks.push(value);
   }
 }finally{try{await reader.cancel();}catch{}reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw new BurnServerError('BURN_SERVER_JSON_INVALID',400);}
 if(!data||typeof data!=='object'||Array.isArray(data)||data.gameId!==BURN_WILDS_GAME_ID)
   throw new BurnServerError('BURN_SERVER_ACTION_INVALID',400);
 return data;
}
/**
 * Attach to existing server HTTP dispatcher only. All other paths and old
 * request streams go unchanged to existingFetch, including financial routes.
 * The host provides its own same-origin policy and authenticated lifecycle.
 */
export function createBurnWildsExistingHttpBinding({existingFetch,assertWriteOrigin,lifecycle}={}){
 if(typeof existingFetch!=='function'||typeof assertWriteOrigin!=='function'||
   typeof lifecycle?.state!=='function'||typeof lifecycle?.spin!=='function')
   throw new BurnServerError('BURN_SERVER_EXISTING_HOST_REQUIRED');
 return async request=>{
   if(!(request instanceof Request))throw new BurnServerError('BURN_SERVER_REQUEST',400);
   const url=new URL(request.url),operation=paths.get(url.pathname);
   if(!operation)return existingFetch(request);
   const method=operation==='state'?'GET':'POST';
   if(request.method!==method)return response({code:'METHOD_NOT_ALLOWED'},405,{allow:method});
   try{
     if(url.search)throw new BurnServerError('BURN_SERVER_QUERY_NOT_ALLOWED',400);
     if(operation==='state')return response(await lifecycle.state(request));
     if(await assertWriteOrigin(request)!==true)
       throw new BurnServerError('BURN_SERVER_ORIGIN_REJECTED',403);
     return response(await lifecycle.spin(request,await readAction(request)));
   }catch(error){
     const known=error instanceof BurnServerError&&
       /^[A-Z0-9_:. -]{1,160}$/.test(error.code||'')&&
       Number.isInteger(error.status)&&error.status>=400&&error.status<=599;
     return response({code:known?error.code:'BURN_SERVER_REQUEST_UNAVAILABLE'},known?error.status:503);
   }
 };
}

