// Local disposable QA only. This runner never reads DATABASE_URL or Railway credentials.
import {execFileSync, spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const image='postgres:17-bookworm@sha256:837bed18782820fe967067cb5328b02b0d9992c1be9a37ee0c9c492cfc03af3b';
const suffix=randomBytes(8).toString('hex');
const container='zplay-pg-qa-'+suffix,database='zplay_qa_'+suffix;
const password=randomBytes(24).toString('hex');
const dockerEnv={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
const docker=(args,options={})=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim();
let created=false;
try {
  docker(['info','--format','{{.ServerVersion}}']);
  docker(['run','--detach','--rm','--name',container,'--publish','127.0.0.1::5432',
    '--env','POSTGRES_USER=zplay_qa','--env','POSTGRES_DB='+database,
    '--env','POSTGRES_PASSWORD='+password,'--tmpfs','/var/lib/postgresql/data:rw',image]);
  created=true;
  const mapping=docker(['port',container,'5432/tcp']);
  if(!/^127\.0\.0\.1:\d+$/.test(mapping))throw Error('QA_CONTAINER_NOT_LOOPBACK_ONLY');
  const url='postgresql://zplay_qa:'+password+'@'+mapping+'/'+database;
  let ready=false;
  for(let attempt=0;attempt<100&&!ready;attempt++){
    const client=new pg.Client({connectionString:url,connectionTimeoutMillis:500});
    try{await client.connect();await client.query('SELECT 1');ready=true;}catch{}finally{await client.end().catch(()=>{});}
    if(!ready)await delay(200);
  }
  if(!ready)throw Error('DISPOSABLE_POSTGRES_START_TIMEOUT');
  // The first suite installs the QA schema. The second reuses it sequentially;
  // concurrent schema/reset fixtures would invalidate transaction evidence.
  for(const file of ['postgres.test.mjs','independent-postgres.test.mjs','existing-gamble-postgres.test.mjs']){
    const child=spawn(process.execPath,['--test',fileURLToPath(new URL('./'+file,import.meta.url))],{
      stdio:'inherit',env:{...process.env,ZPLAY_PG_QA_DISPOSABLE:'1',ZPLAY_PG_QA_DATABASE:database,ZPLAY_PG_QA_URL:url}
    });
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>resolve(signal?1:code??1));});
    if(code!==0){process.exitCode=code;break;}
  }
}finally{
  if(created)docker(['rm','--force',container]);
}
