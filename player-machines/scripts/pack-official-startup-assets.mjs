// Original public-demo startup media, byte for byte. No regenerated animation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const reference=process.argv[2]||'/workspace/work/r12-reference';
const files={logo:['Images/loader-logo.gif','image/gif'],bar:['Images/loader-background.png','image/png'],icon:['Images/loader-icon.png','image/png'],yes:['Images/othergames-mobile-yes.png','image/png'],no:['Images/othergames-mobile-no.png','image/png'],font:['Fonts/font1/fontmt1-regular-webfont.woff2','font/woff2']};
const assets={},records=[];
for(const [name,[file,mime]]of Object.entries(files)){
 const bytes=await readFile(reference+'/FoxyHot20/'+file),other=await readFile(reference+'/MultiHot5/'+file);
 if(!bytes.equals(other))throw Error('Startup assets differ between native games: '+file);
 assets[name]='data:'+mime+';base64,'+bytes.toString('base64');
 if(name==='logo')await writeFile(root+'public/official-startup-logo.gif',bytes);
 records.push({name,file,url:'https://static.ssg-public.com/cache/b1/SlotsDemo/Content/'+file,mime,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),identicalInBothGames:true,originalBytes:true});
}
const code='// Original public SmartSoft demo startup assets; byte-identical in both games.\n// Provenance: evidence/r13/official-startup-assets.json.\nexport const assets=Object.freeze('+JSON.stringify(assets)+');\n';
await writeFile(root+'public/official-startup-assets.mjs',code);
await mkdir(root+'evidence/r13',{recursive:true});
await writeFile(root+'evidence/r13/official-startup-assets.json',JSON.stringify({source:reference,processing:'Original GIF, PNG and WOFF2 bytes preserved without image or animation changes. The browser plays the original GIF timeline.',assets:records,originalBytes:records.reduce((sum,r)=>sum+r.bytes,0),moduleBytes:Buffer.byteLength(code)},null,2)+'\n');
console.log(JSON.stringify({assets:records.length,originalBytes:records.reduce((sum,r)=>sum+r.bytes,0),moduleBytes:Buffer.byteLength(code)}));
