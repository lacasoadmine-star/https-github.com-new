// Serves recovered game assets with local in-memory responses. Never forwards.
import http from 'node:http';
import path from 'node:path';
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
import {FixtureSession,core} from './fixtures.mjs';

const args=new Map();
for(let i=2;i<process.argv.length;i+=2){if(!process.argv[i]?.startsWith('--')||process.argv[i+1]===undefined)throw Error('Arguments must be --name value pairs');args.set(process.argv[i].slice(2),process.argv[i+1]);}
const port=Number(args.get('port')||4179),base=path.dirname(fileURLToPath(import.meta.url));
if(!Number.isInteger(port)||port<1024||port>65535||[8000,8085].includes(port))throw Error('Invalid QA port');
const games=new Map(),contracts=new Map(),shared=args.has('shared')?{slug:'shared',dir:await realpath(path.resolve(args.get('shared')))}:null;
// The browser uses origin-absolute shared module URLs. Resolve that same
// observed local route when loading contract validators in Node.
if(shared)registerHooks({resolve(specifier,context,nextResolve){
 const prefix='/zplay-native-shared-20261119-r1/';
 if(specifier.startsWith(prefix))return nextResolve(pathToFileURL(path.join(shared.dir,specifier.slice(prefix.length))).href,context);
 return nextResolve(specifier,context);
}});
for(const [slug,id]of [['habesha','habesha_fortune_5_native'],['deluxe','multi_hot_5_deluxe_native']]){
 if(!args.has(slug))continue;
 const dir=await realpath(path.resolve(args.get(slug))),html=path.resolve(args.get(slug+'-html')||path.join(dir,'index.html'));
 const contract=await import(pathToFileURL(path.join(dir,'contract.mjs'))),registry=await import(pathToFileURL(path.join(dir,'registry.mjs')));
 contract.validateModel(core.getGame(id),registry.gameConfig(id));
 games.set(slug,{slug,id,dir,html});contracts.set(id,contract);
}
if(!games.size)throw Error('Pass --habesha <complete-assets-dir> and/or --deluxe <complete-assets-dir>, optionally --habesha-html / --deluxe-html');
const session=new FixtureSession(contracts),missing=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.mp4':'video/mp4','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};
const csp="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
function send(res,status,body,type='application/json; charset=utf-8'){
 const bytes=Buffer.isBuffer(body)?body:Buffer.from(type.startsWith('application/json')?JSON.stringify(body):body);
 res.writeHead(status,{'content-type':type,'content-length':bytes.length,'cache-control':'no-store','content-security-policy':csp,'x-content-type-options':'nosniff','referrer-policy':'same-origin','x-local-qa':'simulated-only'});res.end(bytes);
}
async function body(req){let text='';for await(const part of req){text+=part;if(text.length>16384)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});}try{return JSON.parse(text||'{}');}catch{throw Object.assign(Error('INVALID_JSON'),{status:400});}}
function gameFrom(value){if(!value)return null;let url;try{url=new URL(value,'http://127.0.0.1:'+port);}catch{return null;}
 const slug=url.pathname.match(/^\/(?:qa|qa-assets)\/([^/]+)/)?.[1];if(games.has(slug))return games.get(slug);
 if(shared&&(slug==='shared'||url.pathname.startsWith('/zplay-native-shared-20261119-r1/')))return shared;
 if(/^\/zplay-native-machines-20261119-habesha-r(?:7|8)\//.test(url.pathname))return games.get('habesha')||null;
 if(/^\/zplay-native-machines-20261119-mh5deluxe-r(?:1|2)\//.test(url.pathname))return games.get('deluxe')||null;
 const id=url.searchParams.get('game')||url.pathname.split('/').filter(Boolean).at(-1);return [...games.values()].find(game=>game.id===id)||null;
}
async function localFile(game,relative){
 if(relative.includes('\0'))return null;
 const candidate=path.resolve(game.dir,relative);if(candidate!==game.dir&&!candidate.startsWith(game.dir+path.sep))return null;
 try{const actual=await realpath(candidate);if(actual!==game.dir&&!actual.startsWith(game.dir+path.sep))return null;if(!(await stat(actual)).isFile())return null;return actual;}catch{return null;}
}
async function page(game){
 let html=await readFile(game.html,'utf8');html=html.replaceAll('{{GAME}}',game.id).replaceAll('{{MACHINE}}',game.id);
 html=html.replace(/<body\b([^>]*)>/i,(all,attrs)=>'<body'+attrs.replace(/\sdata-(?:game|machine)=(?:"[^"]*"|'[^']*')/g,'')+' data-game="'+game.id+'" data-machine="'+game.id+'">');
 html=html.replace(/\b(src|href)=(['"])([^'"]+)\2/g,(all,attribute,quote,value)=>{
  if(/^(?:data:|blob:|#|mailto:|tel:)/i.test(value))return all;
  let url;try{url=new URL(value,'http://127.0.0.1:'+port+'/');}catch{return all;}
  if(!/\.(?:m?js|css|json|png|jpe?g|webp|svg|gif|woff2?|otf|ttf|mp3|ogg|wav|mp4)$/i.test(url.pathname))return all;
  if(shared&&url.pathname.startsWith('/zplay-native-shared-20261119-r1/'))return attribute+'='+quote+'/qa-assets/shared/'+path.basename(url.pathname)+url.search+quote;
  return attribute+'='+quote+'/qa-assets/'+game.slug+'/'+path.basename(url.pathname)+url.search+quote;
 });
 const injection='<link rel="stylesheet" href="/__qa/toolbar.css"><script defer src="/__qa/toolbar.js"></script>';
 return html.includes('</head>')?html.replace('</head>',injection+'</head>'):injection+html;
}
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host||'',allowed=new Set(['127.0.0.1:'+port,'localhost:'+port,'[::1]:'+port]);
  if(!allowed.has(host))return send(res,403,{detail:'LOCAL_QA_HOST_REQUIRED'});
  const origin='http://'+host,url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname);
  if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==origin)return send(res,403,{detail:'LOCAL_QA_ORIGIN_REQUIRED'});
  if(pathname==='/__qa/state')return send(res,200,{...session.snapshot(),games:[...games.values()].map(g=>({slug:g.slug,id:g.id,url:'/qa/'+g.slug+'/'})),missingAssets:[...missing.keys()].slice(-60)});
  if(pathname==='/__qa/control'&&req.method==='POST')return send(res,200,session.configure(await body(req)));
  if(pathname==='/__qa/toolbar.js'||pathname==='/__qa/toolbar.css')return send(res,200,await readFile(path.join(base,path.basename(pathname))),mime[path.extname(pathname)]);
  // This verified production presence module belongs to the real login lease.
  // Its sole QA substitute is a no-op; our session endpoints are in memory.
  if(pathname==='/player-v236/presence.63ed199a80b6c700.mjs'||/^\/qa-assets\/(habesha|deluxe)\/presence\.63ed199a80b6c700\.mjs$/.test(pathname))return send(res,200,'// Local QA: production presence lease intentionally inactive.\nexport {};\n','text/javascript; charset=utf-8');
  if(pathname==='/api/machine-session'||pathname==='/api/slots/session')return send(res,200,session.session());
  if(pathname.startsWith('/api/')){
   if(!session.authenticated)return send(res,401,{detail:'PLAYER_SESSION_EXPIRED'});
   let match;
   if(req.method==='GET'&&(match=pathname.match(/^\/api\/slots\/games\/([^/]+)$/)))return send(res,200,session.model(match[1]));
   if(req.method==='GET'&&(match=pathname.match(/^\/api\/slots\/state\/([^/]+)$/)))return send(res,200,session.state(match[1]));
   if(req.method==='GET'&&pathname==='/api/slots/balance')return send(res,200,{currency:'ETB',balance:session.balance});
   if(req.method==='GET'&&pathname==='/api/slots/rounds')return send(res,200,session.history());
   if(req.method==='GET'&&(match=pathname.match(/^\/api\/slots\/rounds\/([^/]+)$/)))return send(res,200,session.round(match[1]));
   if(req.method==='POST'&&['/api/slots/spin','/api/slots/gamble'].includes(pathname)){
    const input=await body(req);if(session.delayMs)await new Promise(resolve=>setTimeout(resolve,session.delayMs));
    const result=pathname.endsWith('/spin')?session.spin(input,req.headers['x-zplay-machine-session']):session.gamble(input,req.headers['x-zplay-machine-session']);
    return send(res,200,result);
   }
   return send(res,404,{detail:'LOCAL_QA_ENDPOINT_NOT_IMPLEMENTED'});
  }
  if(pathname==='/')return send(res,200,'<!doctype html><html><head><meta charset="utf-8"><title>Local game QA</title><link rel="stylesheet" href="/__qa/toolbar.css"></head><body style="padding:48px;font:20px system-ui;background:#111827;color:white"><h1>Local QA — simulated balance</h1><p>All responses are generated in memory. No production requests or transactions.</p>'+[...games.values()].map(g=>'<p><a style="color:#7dd3fc" href="/qa/'+g.slug+'/">Open '+g.slug+'</a></p>').join('')+'</body></html>','text/html; charset=utf-8');
  const selected=gameFrom(url.href);
  if(selected?.id&&(pathname==='/qa/'+selected.slug+'/'||pathname==='/qa/'+selected.slug||pathname.startsWith('/games/')||pathname.endsWith('game.html')))return send(res,200,await page(selected),'text/html; charset=utf-8');
  const game=selected||gameFrom(req.headers.referer);
  if(game){
   const explicit='/qa-assets/'+game.slug+'/',relative=pathname.startsWith(explicit)?pathname.slice(explicit.length):path.basename(pathname),file=await localFile(game,relative);
   if(file)return send(res,200,await readFile(file),mime[path.extname(file).toLowerCase()]||'application/octet-stream');
  }
  missing.set(pathname,true);return send(res,404,{detail:'LOCAL_QA_ASSET_MISSING',path:pathname});
 }catch(error){send(res,error.status||500,{detail:error.message});}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port,games:[...games.values()].map(g=>({game:g.id,url:'http://127.0.0.1:'+port+'/qa/'+g.slug+'/'})),scope:'local in-memory simulated balance only',productionTransactions:0})));
