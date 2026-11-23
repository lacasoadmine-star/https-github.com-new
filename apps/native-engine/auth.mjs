import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
export function signedHeaders(secret,userId,method,path,body='',now=Date.now()){
 const at=String(now);const digest=createHash('sha256').update(body).digest('hex');
 const signature=createHmac('sha256',secret).update([method,path,at,userId,digest].join('\n')).digest('hex');
 return {'x-native-user':userId,'x-native-time':at,'x-native-signature':signature};
}
export function verifySignature(request,body,secret,now=Date.now()){
 if(typeof secret!=='string'||secret.length<40)return null;
 const user=request.headers.get('x-native-user')||'',at=request.headers.get('x-native-time')||'',provided=request.headers.get('x-native-signature')||'';
 if(!user||user.length>100||/[\r\n]/.test(user)||!/^\d{13}$/.test(at)||Math.abs(Number(at)-now)>30000||!/^[a-f0-9]{64}$/.test(provided))return null;
 const url=new URL(request.url);const expected=signedHeaders(secret,user,request.method,url.pathname+url.search,body,Number(at))['x-native-signature'];
 return timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(provided,'hex'))?user:null;
}
export async function limitedBody(request,max=16384){
 if(Number(request.headers.get('content-length')||0)>max)throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});
 const reader=request.body?.getReader();if(!reader)return '';let count=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>max){await reader.cancel();throw Object.assign(Error('BODY_TOO_LARGE'),{status:413});}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(count);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder().decode(bytes);
}
