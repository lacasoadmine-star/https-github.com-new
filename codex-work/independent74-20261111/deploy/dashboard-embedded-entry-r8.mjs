import previous, {LocalDemoWallet as PreviousDemoWallet} from './presentation-player-entry-r23.mjs';
export * from './presentation-player-entry-r23.mjs';
import {loadAssets} from './independent74-assets-r8.mjs';
import {games,accountGames} from './independent74-catalog-r8.mjs';
import {createGateway} from './independent74-gateway-r8.mjs';
import {handleDemo74Request} from './independent74-demo-r8.mjs';
import {createDemoGateway} from './independent74-demo-gateway-r8.mjs';
export class LocalDemoWallet extends PreviousDemoWallet {
 constructor(ctx,env){super(ctx,env);this.__independent74Context=ctx;}
 fetch(request){return new URL(request.url).pathname.startsWith('/independent74-demo-internal/')?handleDemo74Request(this.__independent74Context,request):super.fetch(request);}
}
let handler;
export default {...previous,async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 if(path!=='/'&&path!=='/independent74'&&!path.startsWith('/independent74/'))return previous.fetch(request,env,ctx);
 try{if(!handler)handler=createGateway({previous,assets:await loadAssets(),games,accountGames,demoHandler:createDemoGateway({previous}),homeEnhancement:true,accountTransport:'protected-readonly'});const response=await handler(request,env,ctx);if(path==='/'&&response.status===200&&response.headers.get('content-type')?.includes('text/html')){const headers=new Headers(response.headers),policy=headers.get('content-security-policy');if(policy)headers.set('content-security-policy',policy.replace(/frame-src[^;]*/i,"frame-src 'self'"));return new Response(response.body,{status:response.status,headers});}return response;}
 catch{if(path==='/')return previous.fetch(request,env,ctx);return new Response(JSON.stringify({error:{code:'GAME_UI_UNAVAILABLE'}}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});}
}};

