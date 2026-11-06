// Node-only test adapter for Cloudflare's typed ArrayBuffer data modules.
// Production receives these files as application/octet-stream multipart parts.
export async function load(url,context,nextLoad){
 if(url.startsWith('file:')&&url.endsWith('.bin')&&url.includes('/machine-data/'))return{format:'module',shortCircuit:true,source:"import{readFileSync}from'node:fs';const b=readFileSync(new URL(import.meta.url));export default b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);"};
 return nextLoad(url,context);
}
