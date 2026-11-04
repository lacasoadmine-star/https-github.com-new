import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const require=createRequire(process.env.NATIVE_TEST_TOOLS?join(process.env.NATIVE_TEST_TOOLS,'package.json'):new URL('../apps/native-engine/package.json',import.meta.url));
const EmbeddedPostgres=require('embedded-postgres').default;
const directory=await mkdtemp(join(tmpdir(),'superwin-native-pg-'));
const listener=createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
const password=randomBytes(18).toString('hex');
const pg=new EmbeddedPostgres({databaseDir:join(directory,'database'),user:'native_test',password,port,persistent:false,createPostgresUser:false,onLog:()=>{},onError:()=>{}});
try{
 await pg.initialise();await pg.start();await pg.createDatabase('native_tests');
 const binary=process.env.NATIVE_BUN_BINARY||join(dirname(require.resolve('bun/package.json')),'bin','bun.exe');
 const url=`postgres://native_test:${password}@127.0.0.1:${port}/native_tests`;
 const cwd=fileURLToPath(new URL('../',import.meta.url));
 for(const args of [['test','tests/native-store.test.mjs'],['run','tests/native-http-browser.mjs']]){
 const result=await new Promise((resolve,reject)=>{const child=spawn(binary,args,{cwd,env:{...process.env,NATIVE_TEST_DATABASE_URL:url},stdio:'inherit'});child.once('error',reject);child.once('exit',resolve);});
 if(result!==0){process.exitCode=Number(result)||1;break;}
 }
}finally{await pg.stop().catch(()=>{});await rm(directory,{recursive:true,force:true});}
