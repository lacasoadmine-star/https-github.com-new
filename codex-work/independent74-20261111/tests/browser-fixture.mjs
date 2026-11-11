// LOCAL QA ONLY. This repository and account fixture must never be shipped or
// selected as a production wallet fallback. The HTTP server binds 127.0.0.1.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGateway,hash} from '../gateway.mjs';
import {createGameService} from '../server/service.mjs';
import {listGameDefinitions} from '../math/index.mjs';
import {MemoryRepository} from '../server/tests/support/memory-repository.mjs';
import {createHash} from 'node:crypto';

const here=path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_TOKEN='local-browser-test-session-not-a-real-player';
export class FixtureRepository {
  constructor(balance='100000'){this.initialBalance=balance;this.sessionHash=createHash('sha256').update(FIXTURE_TOKEN).digest('hex');this.reset();}
  reset(){this.repository=new MemoryRepository();this.repository.addAccount(this.sessionHash,{balanceMinor:this.initialBalance});}
  transact(subject,operation){return this.repository.transact(subject,operation);}
  get data(){const snapshot=this.repository.snapshot(this.sessionHash);return{balance:snapshot.balanceMinor,rounds:snapshot.rounds,requests:snapshot.requests,receipts:snapshot.receipts,ledger:snapshot.ledger.map(row=>({...row,type:row.kind,amount:row.amount_minor})),house:this.repository.snapshotHouse()};}
}

export async function startBrowserFixture({port=0}={}){
  const repository=new FixtureRepository();let failNext=false;let loseNext=false;const calls=[];
  const service=createGameService({repository,rng:bound=>loseNext?bound-1:0});
  const mime={'.html':'text/html; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp'};
  const assets={},clientRoot=path.join(here,'../client');
  async function addAssets(folder=''){
    for(const entry of await fs.readdir(path.join(clientRoot,folder),{withFileTypes:true})){
      const relative=path.join(folder,entry.name);
      if(entry.isDirectory()){await addAssets(relative);continue;}
      const type=mime[path.extname(entry.name)];if(!type)continue;
      const body=await fs.readFile(path.join(clientRoot,relative));
      assets['/'+relative.split(path.sep).join('/')]={body,type,etag:'"qa-'+createHash('sha256').update(body).digest('hex')+'"'};
    }
  }
  await addAssets();
  const previous={fetch:async request=>new URL(request.url).pathname==='/api/machine-session'?Response.json({authenticated:true}):new Response('Not found',{status:404})};
  const handler=createGateway({previous,assets,games:listGameDefinitions(),fetchImpl:async(target,options)=>{
    calls.push({path:target.pathname,body:options.body?JSON.parse(options.body):null});
    if(failNext){failNext=false;throw new DOMException('QA simulated lost response','AbortError');}
    const subject=options.headers['x-native-user'].replace(/^@session:/,'');
    try{
      let result;
      if(target.pathname.endsWith('/action'))result=await service.action(subject,JSON.parse(options.body));
      else if(target.pathname.endsWith('/history'))result=await service.history(subject,target.searchParams.get('game_id'));
      else result=await service.state(subject,target.searchParams.get('game_id'));
      return Response.json(result);
    }catch(error){return Response.json({ok:false,error:{code:error.code||'QA_FIXTURE_ERROR',message:error.message}},{status:error.status||500});}
  }});
  const server=http.createServer(async(req,res)=>{
    try{
      const address=server.address(),origin='http://127.0.0.1:'+address.port;
      const url=new URL(req.url,origin);
      if(url.pathname==='/__qa__/reset'){repository.reset();failNext=false;loseNext=false;res.writeHead(204);return res.end();}
      if(url.pathname==='/__qa__/fail-next'){failNext=true;res.writeHead(204);return res.end();}
      if(url.pathname==='/__qa__/lose-next'){loseNext=true;res.writeHead(204);return res.end();}
      if(url.pathname==='/__qa__/inspect'){res.setHeader('content-type','application/json');return res.end(JSON.stringify({balance:repository.data.balance,ledger:repository.data.ledger,calls}));}
      const chunks=[];for await(const chunk of req)chunks.push(chunk);
      const body=Buffer.concat(chunks);
      const request=new Request(url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})});
      const response=await handler(request,{INDEPENDENT74_ENGINE_ORIGIN:'https://qa-fixture.invalid',NATIVE_ENGINE_SECRET:'local-qa-key-never-production'},{});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:'QA_FIXTURE_FAILURE',message:error.message}));}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {origin:'http://127.0.0.1:'+server.address().port,repository,calls,close:()=>new Promise(resolve=>server.close(resolve))};
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const fixture=await startBrowserFixture({port:Number(process.env.QA_PORT||0)});
  console.log(JSON.stringify({origin:fixture.origin,scope:'LOCAL-QA-ONLY',cookie:'sw_session='+FIXTURE_TOKEN}));
}
