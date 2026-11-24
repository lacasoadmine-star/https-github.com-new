// Cloudflare's downloaded Worker parts do not always include `filename`.
// FormData parsers then decode binary parts as UTF-8 strings. Preserve bytes.
export function parseMultipart(raw){
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 const find=(needle,start=0)=>{
  for(let i=raw.indexOf(needle[0],start);i>=0;i=raw.indexOf(needle[0],i+1)){
   let equal=true;for(let j=1;j<needle.length;j++)if(raw[i+j]!==needle[j]){equal=false;break;}if(equal)return i;
  }
  return -1;
 };
 const lineEnd=find(encoder.encode('\r\n'));if(lineEnd<2)throw new Error('INVALID_MULTIPART_BOUNDARY');
 const boundary=decoder.decode(raw.subarray(0,lineEnd));
 const delimiter=encoder.encode('\r\n'+boundary),separator=encoder.encode('\r\n\r\n'),parts=[];
 let position=lineEnd+2;
 while(position<raw.length){
  const headerEnd=find(separator,position);if(headerEnd<0)throw new Error('INVALID_MULTIPART_HEADERS');
  const header=decoder.decode(raw.subarray(position,headerEnd));
  const name=header.match(/(?:^|;)\s*name="([^"]+)"/im)?.[1],filename=header.match(/filename="([^"]+)"/i)?.[1];
  // Downloaded .mjs parts can omit Content-Type. Re-uploading those as binary
  // makes their named exports disappear in the Workers compiler.
  const type=header.match(/content-type:\s*([^\r\n]+)/i)?.[1]||((filename||name||'').endsWith('.mjs')?'application/javascript+module':'application/octet-stream');
  const end=find(delimiter,headerEnd+4);if(!name||end<0)throw new Error('INVALID_MULTIPART_PART');
  parts.push({name:filename||name,type,bytes:raw.slice(headerEnd+4,end)});
  position=end+delimiter.length;
  if(raw[position]===45&&raw[position+1]===45)break;
  if(raw[position]!==13||raw[position+1]!==10)throw new Error('INVALID_MULTIPART_SEPARATOR');position+=2;
 }
 return parts;
}
