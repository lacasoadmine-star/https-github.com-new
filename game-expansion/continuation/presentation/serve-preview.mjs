#!/usr/bin/env node
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),args=process.argv.slice(2),at=args.indexOf('--cache-dir'),cache=at>=0?resolve(args[at+1]):resolve(root,'assets');
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ttf':'font/ttf','.otf':'font/otf','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file;
    if(path.startsWith('/assets/')){const name=path.slice(8);if(!/^[a-f0-9]{64}\.[a-z0-9]+$/.test(name))throw new Error('Invalid asset');file=resolve(cache,name);}
    else{file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/'))throw new Error('Invalid path');}
    const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','content-length':body.length,'cache-control':'no-store','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(8766,'127.0.0.1',()=>console.log('Local presentation preview: http://127.0.0.1:8766/ (no wallet endpoints)'));
