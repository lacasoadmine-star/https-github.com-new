import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {Miniflare}=await import(process.env.MINIFLARE_MODULE||'miniflare');
const backendPath=process.env.CREDITS_ACTOR_MODULE||fileURLToPath(new URL('./fixtures/credits-ten-live-r6-coin.mjs',import.meta.url));
const backend=await readFile(backendPath,'utf8');
if(createHash('sha256').update(backend).digest('hex')!=='7121975156434b2650e97eaa247a6024900d18a64648a82abed35f1812182c39')throw Error('The local fixture must use the exact recovered live R6 Coin actor');
// The installed workerd supports dates through 2026-08-06. This is a local
// control/settlement check, not proof of the live 2026-11-07 runtime settings.
const mf=new Miniflare({compatibilityDate:process.env.LOCAL_COMPATIBILITY_DATE||'2026-08-06',compatibilityFlags:['nodejs_compat'],modules:[
 {type:'ESModule',path:'entry.mjs',contents:`export {Remaining20CreditsDemoR4} from './actor.mjs';
 export default {async fetch(request,env){const url=new URL(request.url),operation=url.pathname.split('/').at(-1);
 const subject='@remaining20-demo:'+request.headers.get('X-Local-Subject');
 const result=await env.DEMOS.getByName(subject).request({operation,subject,...operation==='action'?{body:await request.json(),sessionId:request.headers.get('X-Zplay-Library-Session')}:{gameId:url.searchParams.get('game_id'),sort:'recent'}});
 return Response.json(result.body,{status:result.status});}};`},
 {type:'ESModule',path:'actor.mjs',contents:backend}],durableObjects:{DEMOS:{className:'Remaining20CreditsDemoR4',useSQLite:true}}});
const root=new URL('../',import.meta.url),types={html:'text/html',mjs:'application/javascript',css:'text/css',json:'application/json',svg:'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   if(!url.pathname.startsWith('/api/remaining20/demo/')){res.writeHead(403).end();return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const headers=new Headers(req.headers);headers.set('X-Local-Subject',createHash('sha256').update(req.headers['x-test-subject']||'browser-controls').digest('hex'));
   const response=await mf.dispatchFetch('http://local'+url.pathname+url.search,{method:req.method,headers,...req.method==='POST'?{body:Buffer.concat(chunks)}:{}});
   res.writeHead(response.status,{'content-type':'application/json','cache-control':'no-store'}).end(Buffer.from(await response.arrayBuffer()));return;
  }
  let name;
  if(url.pathname.startsWith('/demo/games/'))name='demo.html';
  else if(url.pathname.includes('/reference-art/')){res.writeHead(204).end();return;}
  else name=url.pathname.replace(/^\/native-library\/remaining20\/[^/]+\//,'');
  if(name==='reference-presentation.mjs')name='test/browser-presentation-fixture.mjs';
  if(name.includes('..')||name.startsWith('/')||!name){res.writeHead(404).end();return;}
  let body=await readFile(new URL(name,root));
  if(name==='test/browser-presentation-fixture.mjs')body=Buffer.from(body.toString().replace("'../presentation/","'./presentation/"));
  res.writeHead(200,{'content-type':types[name.split('.').at(-1)]||'application/octet-stream','cache-control':'no-store'}).end(body);
 }catch(error){console.error(error.message);res.writeHead(500).end(String(error.message));}
});
await mf.ready;server.listen(Number(process.env.PORT||8789),'127.0.0.1',()=>console.log('Local control fixture ready; backend SHA256 '+createHash('sha256').update(backend).digest('hex')));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>mf.dispose().then(()=>process.exit(0))));
