import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createGateway} from '../../gateway.mjs';
import {installExistingLibrary74Http} from '../../server/existing-library74-http.mjs';
import {createRetainedLibrary74Fixture} from '../../server/tests/support/retained-library-fixture.mjs';

// Explicit disposable test process. These constants have no production access.
const token='isolated-machine74-browser-fixture';
const secret='isolated-machine74-signature-key-with-no-production-authority';
const sha=value=>createHash('sha256').update(value).digest('hex');
const subject='@session:'+sha(token);
const unavailable=()=>Object.assign(new Error('UNAUTHORIZED'),{code:'UNAUTHORIZED',status:401});
const offlineFiles=new Set(['test72-bundle.mjs','test72-entry.mjs','test72-rng.mjs','test72.html','official74.html','test72.css','presentation.mjs']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'application/javascript; charset=utf-8'};

export async function createLocalMachine74Harness({isolated=false,manualQa=false,port=0,...fixtureOptions}={}){
  if(!isolated||process.env.DATABASE_URL)throw Error('ISOLATED_BROWSER_QA_REQUIRED');
  const fixture=await createRetainedLibrary74Fixture({isolated:true,...fixtureOptions});
  const metrics={actions:0,states:0,history:0,requests:[]};
  const backend=installExistingLibrary74Http({fetch:()=>new Response('retained-route')},{service:fixture.service,facade:fixture.facade,engineSecret:secret,
    readNativeBody:fixture.readNativeBody,
    verifyNative:fixture.verifyNative,
    resolveSessionUser:async(shared,user)=>{if(shared!==fixture.shared||user!==subject)throw unavailable();return fixture.fixtureUserId;},
  });
  const assets=Object.create(null),folder=new URL('../../client/',import.meta.url);
  for(const name of await readdir(folder)){
    const ext=name.slice(name.lastIndexOf('.'));if(!types[ext]||offlineFiles.has(name))continue;
    let body=await readFile(new URL(name,folder),'utf8');
    if(manualQa&&name==='machines74.html')body=body.replace('<body>','<body><aside role="note">ISOLATED BUILD QA · Disposable test database · No player funds</aside>');
    assets['/'+name]={body,type:types[ext],etag:'"qa-'+sha(body)+'"'};
  }
  const gateway=createGateway({accountTransport:'library74',assets,accountGames:fixture.facade.definitions(),previous:{fetch:async request=>{
    const path=new URL(request.url).pathname;
    if(path==='/api/machine-session')return Response.json({authenticated:request.headers.get('cookie')?.split(';').some(s=>s.trim()==='sw_session='+token)===true});
    if(path.startsWith('/player-v236/'))return new Response('export {};',{headers:{'content-type':'application/javascript'}});
    return new Response('Isolated machine74 QA',{headers:{'content-type':'text/plain'}});
  }},fetchImpl:async(url,init)=>{
    const path=new URL(url).pathname;
    if(new URL(url).origin!=='https://fixture-engine.invalid')throw Error('EXTERNAL_FETCH_FORBIDDEN');
    if(path.endsWith('/action')){metrics.actions++;metrics.requests.push(JSON.parse(init.body));}
    if(path.endsWith('/state'))metrics.states++;
    if(path.endsWith('/history'))metrics.history++;
    return backend.fetch(new Request(url,init));
  }});
  const server=createServer(async(req,res)=>{
    try{
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192)throw Error('BODY_TOO_LARGE');chunks.push(chunk);}
      const url=new URL(req.url,'http://127.0.0.1:'+server.address().port);
      if(manualQa&&url.pathname==='/__qa__/'&&req.method==='GET'){
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
        res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isolated 72-machine build QA</title></head><body><h1>Isolated 72-machine build QA</h1><p>This server uses a disposable test database. It has no production credentials or player funds.</p><form method="post" action="/__qa__/start"><button>Open isolated test account</button></form></body></html>');return;
      }
      if(manualQa&&url.pathname==='/__qa__/start'&&req.method==='POST'&&req.headers.origin===url.origin){
        res.writeHead(303,{'location':'/independent74/machines74.html','set-cookie':'sw_session='+token+'; HttpOnly; SameSite=Strict; Path=/','cache-control':'no-store'});res.end();return;
      }
      const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
      const response=await gateway(request,{NATIVE_ENGINE_ORIGIN:'https://fixture-engine.invalid',NATIVE_ENGINE_SECRET:secret},{});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{code:'FIXTURE_ERROR',message:error.message}}));}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {fixture,metrics,token,base:'http://127.0.0.1:'+server.address().port,gateway,backend,
    async close(){await new Promise(resolve=>server.close(resolve));await fixture.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const harness=await createLocalMachine74Harness({isolated:process.argv.includes('--isolated'),manualQa:process.argv.includes('--manual-qa'),port:Number(process.env.MACHINE74_QA_PORT||4174)});
  console.log(JSON.stringify({qaOnly:true,url:harness.base+'/independent74/machines74.html'}));
  process.once('SIGTERM',async()=>{await harness.close();process.exit(0);});
}
