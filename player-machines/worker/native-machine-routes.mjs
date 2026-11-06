import {assets,release,htmlTemplate} from './native-machine-assets.mjs';
export const nativeFamilies=Object.freeze({multi_hot_5_native:'multi_hot_5_video',foxy_hot_20_native:'hot_foxy_20'});
const prefix='/'+release+'/',presence='/player-v236/presence.63ed199a80b6c700.mjs';
export function resolveNativeGame(url){const match=/^\/games\/(multi_hot_5_native|foxy_hot_20_native)\/?$/.exec(url.pathname);return match?.[1]||null;}
export function isNativeMachineRequest(request){if(!['GET','HEAD'].includes(request.method))return false;const url=new URL(request.url);return url.pathname.startsWith(prefix)||resolveNativeGame(url)!==null;}
function binaryBody(buffer){let offset=0;return new ReadableStream({pull(controller){if(offset>=buffer.byteLength){controller.close();return;}const size=Math.min(65536,buffer.byteLength-offset);controller.enqueue(new Uint8Array(buffer,offset,size));offset+=size;}});}
export function nativeMachinePage(request){
 if(!['GET','HEAD'].includes(request.method))return null;
 const url=new URL(request.url),head=request.method==='HEAD';
 if(url.pathname.startsWith(prefix)){
  const name=url.pathname.slice(prefix.length),asset=Object.hasOwn(assets,name)?assets[name]:null;
  if(!asset)return new Response(head?null:'Not found',{status:404});
  return new Response(head?null:binaryBody(asset.body),{headers:{'Content-Type':asset.type,'Content-Length':String(asset.size),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','X-Zplay-Release':release}});
 }
 const id=resolveNativeGame(url);if(!id)return null;
 const html=htmlTemplate.replace('{{GAME}}',id).replace('{{PRESENTATION_GAME}}',nativeFamilies[id]).replace('</body>','<script type="module" src="'+presence+'"></script></body>');
 return new Response(head?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Zplay-Release':release,'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'"}});
}
