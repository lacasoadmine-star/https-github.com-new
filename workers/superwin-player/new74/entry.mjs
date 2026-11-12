import previous from './native-game-entry-r23.mjs';
export * from './native-game-entry-r23.mjs';
import {new74} from './new74-router-r1.mjs';
export default {...previous,async fetch(request,env,ctx){
 const own=await new74(request,env);if(own)return own;
 const response=await previous.fetch(request,env,ctx),url=new URL(request.url);
 if(request.method==='GET'&&url.pathname==='/'&&response.ok&&response.headers.get('Content-Type')?.includes('text/html')){
  const transformed=new HTMLRewriter().on('body',{element(element){element.append('<script type="module" src="/new74/entry-link.mjs"></script>',{html:true});}}).transform(response);
  const result=new Response(transformed.body,transformed);result.headers.delete('Content-Length');result.headers.delete('ETag');return result;
 }
 return response;
}};
