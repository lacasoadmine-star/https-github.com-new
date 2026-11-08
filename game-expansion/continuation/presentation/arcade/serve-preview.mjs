#!/usr/bin/env node
import{createServer}from'node:http';
import{readFile}from'node:fs/promises';
import{dirname,resolve,extname}from'node:path';
import{fileURLToPath}from'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2),at=args.indexOf('--cache-dir'),cache=resolve(at<0?'/tmp/zplay-arcade-assets':args[at+1]);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff':'font/woff'};
createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file;
    if(path==='/'){res.writeHead(302,{location:'/arcade/'});res.end();return;}
    if(path.startsWith('/assets/')){const name=path.slice(8);if(!/^[a-f0-9]{64}\.[a-z0-9]+$/.test(name))throw new Error('Invalid asset');file=resolve(cache,name);}
    else{const allowed=path==='/arcade/'?'/arcade/index.html':path;file=resolve(root,'.'+allowed);if(!file.startsWith(root+'/')||(!allowed.startsWith('/arcade/')&&!['/atlas.mjs','/machine-renderer.mjs'].includes(allowed)))throw new Error('Unavailable route');}
    const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','content-length':body.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(8768,'127.0.0.1',()=>console.log('Local arcade review: http://127.0.0.1:8768/arcade/ (GET/HEAD static assets only)'));
