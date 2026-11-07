import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Readable} from 'node:stream';
import postgres from 'postgres';
import {JetXService} from '../service.mjs';
import {fixtureWalletClass} from './wallet-fixture.mjs';

if(process.env.JETX_LOCAL_BROWSER_FIXTURE!=='1')throw new Error('OPT_IN_LOCAL_TEST_FIXTURE_REQUIRED');
const database='postgres://postgres:local-test-only@127.0.0.1:55439/jetx_test';
const SharedWalletStore=await fixtureWalletClass();
const sql=postgres(database,{max:8,onnotice:()=>{}}),shared=new SharedWalletStore(sql);
await shared.migrate();
const service=new JetXService(shared,{accepting:true,roundOptions:{draw:()=>400}});await service.migrate();
await sql.unsafe("UPDATE sw_rebuild.wallets SET balance=2000000 WHERE id='player-b'");
const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.atlas':'text/plain','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.mp3':'audio/mpeg','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'";
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:9444');
  if(url.pathname==='/api/jetx/events'){
   const abort=new AbortController();res.on('close',()=>abort.abort());const response=await service.eventStream('player-b',abort.signal);
   res.writeHead(response.status,Object.fromEntries(response.headers));Readable.fromWeb(response.body).pipe(res);return;
  }
  if(url.pathname.startsWith('/api/jetx/')){
   let response;
   if(url.pathname.endsWith('/state'))response=await service.state('player-b');
   else if(url.pathname.endsWith('/chat')){let body='';for await(const part of req)body+=part;response=await service.chat('player-b',url.searchParams.get('since')||'0',body?JSON.parse(body):null);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(response));return;}
   else{let body='';for await(const part of req)body+=part;response=await service.action('player-b',JSON.parse(body));}
   res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({...response,sessionId:'a'.repeat(64)}));return;
  }
  const relative=url.pathname==='/games/jetx_native'?'index.html':decodeURIComponent(url.pathname.replace(/^\/native-library\/jetx\/r1\//,''));
  const filename=path.resolve(root,relative);if(!filename.startsWith(root+path.sep))throw Object.assign(new Error('NOT_FOUND'),{status:404});
  const data=await readFile(filename);res.writeHead(200,{'content-type':types[path.extname(filename)]||'application/octet-stream','content-security-policy':csp,'cache-control':'no-store'});res.end(data);
 }catch(error){const status=error.code==='ENOENT'?404:error.status||500;res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
server.listen(9444,'127.0.0.1',()=>console.log('JetX opt-in browser fixture on loopback 9444; disposable database only.'));
process.on('SIGTERM',()=>{server.close();void sql.end({timeout:1});});
