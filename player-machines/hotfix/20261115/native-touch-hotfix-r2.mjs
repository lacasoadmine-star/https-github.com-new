// Retain validated original game handlers and wallet flow.
const GAMES=new Set(['037-safari-simba','multi-hot-5-super-wilds','multi-hot-5-deluxe','multi-hot-100','habesha-fortune-5','multi-hot-wild-ways','multi-hot-5-wild','002-multi-hot-10']);
const CSS="/* Native touch r2: hit areas are active only when valid */\n#hit-controls button,#controls button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}\n#hit-controls button:disabled,#hit-controls button[hidden],#controls button:disabled,#controls button[hidden]{pointer-events:none!important}\n#hit-controls button:not(:disabled):not([hidden]){pointer-events:auto}\n#account-status,#status{pointer-events:none}\n#account-status a,#account-status button{pointer-events:auto;touch-action:manipulation}\n@media (orientation:landscape){\n #controls button.speed{left:93%;top:29%;width:7%;height:11%;min-width:44px;min-height:44px}\n #controls button.info{min-width:44px;min-height:44px}\n #controls button.sound{left:92%;width:7%;min-width:44px;min-height:44px}\n}";
export async function patchNativeTouchCss(request,response){
 if(request.method!=='GET'||response.status!==200||request.headers.has('range')||!/text\/css/i.test(response.headers.get('content-type')||''))return response;
 const m=/^\/new74\/([a-z0-9-]+)\/style\.css$/.exec(new URL(request.url).pathname);
 if(!m||!GAMES.has(m[1]))return response;
 const raw=await response.clone().text();
 const valid=(raw.includes('#hit-controls button')&&raw.includes('#account-status'))||(raw.includes('#controls button')&&raw.includes('#status'));
 if(raw.length>100000||!valid||raw.includes('Native touch r2:'))return response;
 const h=new Headers(response.headers);
 for(const name of ['content-length','content-encoding','etag','last-modified','accept-ranges'])h.delete(name);
 h.set('cache-control','no-store');h.set('x-zplay-native-touch','r2');h.set('x-content-type-options','nosniff');
 return new Response(raw+'\n'+CSS,{status:200,headers:h});
}