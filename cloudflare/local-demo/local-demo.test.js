import { env } from 'cloudflare:workers';
import { runInDurableObject, runDurableObjectAlarm } from 'cloudflare:test';
import { it, expect } from 'vitest';
import worker from './local-demo.mjs';

const origin='https://player.example';
function call(path,body,cookie='',custom={}){
  return worker.fetch(new Request(origin+'/local-demo/'+path,{method:body?'POST':'GET',
    headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...custom},
    ...(body?{body:JSON.stringify(body)}:{})}),env);
}
async function start(){const r=await call('start',{accept_demo:true});expect(r.status).toBe(200);return r.headers.get('Set-Cookie').split(';')[0];}
const round=()=>({id:crypto.randomUUID(),game:'steady',stake:'10'});

it('requires explicit demo start and blocks cross-origin requests',async()=>{
  expect((await call('wallet')).status).toBe(401);
  expect((await call('start',{})).status).toBe(400);
  expect((await call('start',{accept_demo:true},'',{Origin:'https://evil.example'})).status).toBe(403);
  expect((await call('deposit',{amount:100})).status).toBe(404);
});
it('keeps sessions separate and a repeated start does not refill',async()=>{
  const a=await start(),b=await start();
  const result=await (await call('spin',round(),a)).json();
  expect(result.balance).toBe('1010.00');expect(result.round.payout).toBe('20.00');
  expect((await (await call('wallet',undefined,b)).json()).balance).toBe('1000.00');
  expect((await (await call('start',{accept_demo:true},a)).json()).balance).toBe('1010.00');
});
it('settles duplicate concurrent requests once and rejects changed payloads',async()=>{
  const cookie=await start(),body=round();
  const rs=await Promise.all([call('spin',body,cookie),call('spin',body,cookie)]);
  expect(rs.map(r=>r.status)).toEqual([200,200]);
  const w=await (await call('wallet',undefined,cookie)).json();
  expect(w.balance).toBe('1010.00');expect(w.items).toHaveLength(1);
  expect((await call('spin',{...body,stake:'20'},cookie)).status).toBe(409);
});
it('rejects invalid stakes without changing the balance',async()=>{
  const cookie=await start();
  for(const stake of ['-1','0','NaN','1e2','100.01','1.001'])expect((await call('spin',{...round(),stake},cookie)).status).toBe(400);
  expect((await (await call('wallet',undefined,cookie)).json()).balance).toBe('1000.00');
});
it('checks insufficient funds and stores coherent server history',async()=>{
  const stub=env.LOCAL_DEMO_WALLETS.getByName(crypto.randomUUID());await stub.start();
  await runInDurableObject(stub,async(_instance,state)=>{state.storage.sql.exec('UPDATE wallet SET balance=500 WHERE id=1');});
  expect((await stub.spin(round())).status).toBe(409);
  const w=await stub.view();expect(w.balance).toBe('5.00');expect(w.items).toHaveLength(0);
});
it('bounds random payouts and records the exact balance movement',async()=>{
  const stub=env.LOCAL_DEMO_WALLETS.getByName(crypto.randomUUID());await stub.start();
  const r=await stub.spin({...round(),game:'flicker'});
  expect(['0.00','20.00']).toContain(r.round.payout);
  expect(Number(r.balance)).toBe(1000-10+Number(r.round.payout));
  expect(r.items[0].balance).toBe(r.balance);
});
it('expires the session and deletes only its demo data',async()=>{
  const stub=env.LOCAL_DEMO_WALLETS.getByName(crypto.randomUUID());await stub.start();
  expect(await runDurableObjectAlarm(stub)).toBe(true);
  expect((await stub.view()).status).toBe(401);
});
it('rejects oversized bodies and serves labeled demo UI',async()=>{
  const health=await call('health');expect(health.status).toBe(200);expect((await health.json()).status).toBe('ok');
  expect((await call('start',{accept_demo:true,pad:'x'.repeat(2000)})).status).toBe(400);
  const r=await worker.fetch(new Request(origin+'/local-demo'),env);
  expect(r.status).toBe(200);expect(await r.text()).toContain('lacag dhab ah ma aha');
  expect(r.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'");
});
