// A one-hour scoped upload token arrives through stdin, never a CLI argument
// or repository file. This script cannot modify the live Worker deployment.
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const input=createInterface({input:process.stdin});
const [line]=await once(input,'line');input.close();
const session=JSON.parse(line),plan=JSON.parse(await readFile('/workspace/work/jetx-sequential/deploy/assets.json','utf8'));
let completion=session.buckets.length?null:session.jwt,uploaded=0;
for(const bucket of session.buckets){
 const form=new FormData();
 for(const hash of bucket){
  const file=plan.files[hash];if(!file)throw new Error('UNKNOWN_UPLOAD_HASH');
  const bytes=await readFile(file.filename);if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('ASSET_CHANGED_AFTER_REVIEW');
  form.append(hash,new Blob([bytes.toString('base64')],{type:file.type}),hash);
 }
 let result;
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+session.accountId+'/workers/assets/upload?base64=true',{method:'POST',headers:{Authorization:'Bearer '+session.jwt},body:form});
  result=await response.json();
  if(response.ok&&result.success!==false)break;
  if(attempt===2)throw new Error('ASSET_UPLOAD_FAILED_HTTP_'+response.status);
  await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));
 }
 if(result.result?.jwt)completion=result.result.jwt;
 uploaded+=bucket.length;
}
if(!completion)throw new Error('ASSET_COMPLETION_TOKEN_MISSING');
process.stdout.write(JSON.stringify({success:true,uploaded,completionJWT:completion})+'\n');
