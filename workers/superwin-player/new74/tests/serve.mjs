import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fixtures} from './fixture.mjs';
if(process.env.SUPERWIN_UI_FIXTURES!=='1')throw Error('Local fixture server requires SUPERWIN_UI_FIXTURES=1');
const root=fileURLToPath(new URL('../',import.meta.url)),types={html:'text/html',css:'text/css',mjs:'text/javascript',json:'application/json',png:'image/png',jpg:'image/jpeg',mp3:'audio/mpeg',otf:'font/otf'};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:4177');
 if(url.pathname.startsWith('/api/')){let text='';for await(const part of req)text+=part;const body=text?JSON.parse(text):null,data=fixtures(url.pathname+url.search,body);res.writeHead(data?200:404,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data||{error:'fixture not configured'}));return;}
 if(!url.pathname.startsWith('/new74/')){res.writeHead(404);res.end();return;}
 const rel=url.pathname.slice(7),file=rel===''?'src/index.html':/^\d{3}-[a-z0-9-]+$/.test(rel)?'src/game.html':rel.startsWith('assets/')?rel:'src/'+rel;
 if(file.includes('..')){res.writeHead(404);res.end();return;}
 const data=await readFile(root+file);res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}}).listen(4177,'127.0.0.1',()=>console.log('LOCAL TEST FIXTURES http://127.0.0.1:4177/new74/'));
