import { DurableObject } from 'cloudflare:workers';
import { PAGE, CLIENT } from './local-page.mjs';

const PREFIX='/local-demo';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const money=n=>(n/100).toFixed(2);
const failure=(error,status=400)=>({error,status});
export class LocalDemoWallet extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS wallet (id INTEGER PRIMARY KEY CHECK(id=1), balance INTEGER NOT NULL, expires INTEGER NOT NULL)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS rounds (id TEXT PRIMARY KEY, game TEXT NOT NULL, stake INTEGER NOT NULL, payout INTEGER NOT NULL, balance INTEGER NOT NULL, created INTEGER NOT NULL)');
  }
  async start(){
    const now=Date.now();
    this.ctx.storage.sql.exec('INSERT OR IGNORE INTO wallet VALUES (1,100000,?)',now+86400000);
    const row=this.ctx.storage.sql.exec('SELECT * FROM wallet').one();
    await this.ctx.storage.setAlarm(row.expires);
    return this.view();
  }
  view(){
    const row=this.ctx.storage.sql.exec('SELECT * FROM wallet').toArray()[0];
    if(!row||row.expires<=Date.now())return failure('Bilow tijaabo cusub.',401);
    return {mode:'demo',currency:'DEMO',balance:money(row.balance),
      items:this.ctx.storage.sql.exec('SELECT * FROM rounds ORDER BY created DESC LIMIT 20').toArray().map(r=>({...r,stake:money(r.stake),payout:money(r.payout),balance:money(r.balance)}))};
  }
  spin(body){
    if(!body||!UUID.test(body.id)||!['flicker','steady'].includes(body.game)||typeof body.stake!=='string'||!/^\d{1,4}(\.\d{1,2})?$/.test(body.stake))return failure('Sharad ama ciyaar aan sax ahayn.');
    const stake=Math.round(Number(body.stake)*100);
    if(stake<100||stake>10000)return failure('Sharadku waa 1 ilaa 100 credits.');
    return this.ctx.storage.transactionSync(()=>{
      const sql=this.ctx.storage.sql;
      const row=sql.exec('SELECT * FROM wallet').toArray()[0];
      if(!row||row.expires<=Date.now())return failure('Bilow tijaabo cusub.',401);
      const old=sql.exec('SELECT * FROM rounds WHERE id=?',body.id).toArray()[0];
      if(old){
        if(old.game!==body.game||old.stake!==stake)return failure('Request ID hore ayaa loo isticmaalay.',409);
        return {...this.view(),round:{id:old.id,payout:money(old.payout),stake:money(old.stake)},replayed:true};
      }
      if(sql.exec('SELECT COUNT(*) AS n FROM rounds').one().n>=1000)return failure('Tijaabadan waxay gaadhay 1,000 wareeg.',409);
      const last=sql.exec('SELECT MAX(created) AS t FROM rounds').one().t;
      if(last&&Date.now()-last<300)return failure('Sug wax yar kadib isku day.',429);
      if(row.balance<stake)return failure('Balance-ku kuma filna.',409);
      const won=body.game==='steady'||(crypto.getRandomValues(new Uint8Array(1))[0]&1)===0;
      const payout=won?stake*2:0,balance=row.balance-stake+payout;
      sql.exec('UPDATE wallet SET balance=? WHERE id=1',balance);
      sql.exec('INSERT INTO rounds VALUES (?,?,?,?,?,?)',body.id,body.game,stake,payout,balance,Date.now());
      return {...this.view(),round:{id:body.id,payout:money(payout),stake:money(stake)}};
    });
  }
  async alarm(){this.ctx.storage.transactionSync(()=>{
    this.ctx.storage.sql.exec('DELETE FROM rounds');
    this.ctx.storage.sql.exec('DELETE FROM wallet');
  });}
}

function json(data,extra={}){return Response.json(data,{status:Number.isInteger(data.status)?data.status:200,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
function session(request){return request.headers.get('Cookie')?.match(/(?:^|;\s*)__Secure-sw_local_demo=([a-f0-9-]{36})(?:;|$)/)?.[1];}
async function readBody(request){
  const reader=request.body?.getReader();if(!reader)throw Error('body');
  let total=0,parts=[];
  while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>1024){await reader.cancel();throw Error('body');}parts.push(value);}
  const bytes=new Uint8Array(total);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function handleLocalDemo(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path!==PREFIX&&!path.startsWith(PREFIX+'/'))return null;
  if((path===PREFIX||path===PREFIX+'/')&&['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:PAGE,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",'Referrer-Policy':'same-origin'}});
  if(path===PREFIX+'/client.mjs'&&['GET','HEAD'].includes(request.method))return new Response(request.method==='HEAD'?null:CLIENT,{headers:{'Content-Type':'application/javascript','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(path===PREFIX+'/health'&&request.method==='GET')return json({status:'ok',release:'local-demo-v1',mode:'demo',real_money:false});
  if(![PREFIX+'/wallet',PREFIX+'/start',PREFIX+'/spin'].includes(path))return json(failure('Not found',404));
  if(path===PREFIX+'/wallet'&&request.method!=='GET'||path!==PREFIX+'/wallet'&&request.method!=='POST')return json(failure('Method not allowed',405));
  if(request.method==='POST'&&(request.headers.get('Origin')!==url.origin||!request.headers.get('Content-Type')?.startsWith('application/json')))return json(failure('Invalid origin or content type',403));
  const id=session(request);
  if(path===PREFIX+'/start'){
    let body;try{body=await readBody(request);}catch{return json(failure('Invalid JSON'));}
    if(body?.accept_demo!==true)return json(failure('Oggolow credits-ka tijaabada.'));
    if(id&&UUID.test(id)){const current=await env.LOCAL_DEMO_WALLETS.getByName(id).view();if(!current.error)return json(current);}
    const fresh=crypto.randomUUID(),stub=env.LOCAL_DEMO_WALLETS.getByName(fresh);
    return json(await stub.start(),{'Set-Cookie':`__Secure-sw_local_demo=${fresh}; Path=/local-demo; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`});
  }
  if(!id||!UUID.test(id))return json(failure('Bilow tijaabada marka hore.',401));
  const stub=env.LOCAL_DEMO_WALLETS.getByName(id);
  if(path===PREFIX+'/wallet')return json(await stub.view());
  let body;try{body=await readBody(request);}catch{return json(failure('Invalid JSON'));}
  return json(await stub.spin(body));
}
export default {async fetch(request,env){return await handleLocalDemo(request,env)||new Response('Not found',{status:404});}};
