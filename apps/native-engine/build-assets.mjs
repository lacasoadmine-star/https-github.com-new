import {readFile,writeFile} from 'node:fs/promises';
const html=await readFile(new URL('./page.html',import.meta.url),'utf8');
const css=await readFile(new URL('./style.css',import.meta.url),'utf8');
let client=await readFile(new URL('./client.mjs',import.meta.url),'utf8');
const visuals=await readFile(new URL('./visuals.mjs',import.meta.url),'utf8');
client=visuals.replaceAll('export ','')+'\n'+client.replace("import {createVisuals} from './visuals.mjs';\n",'');
const code=`const HTML=${JSON.stringify(html)};\nexport const NATIVE_CSS=${JSON.stringify(css)};\nexport const NATIVE_CLIENT=${JSON.stringify(client)};\nexport function nativeHTML(game){return HTML.replace('<title>Superwin Internal</title>','<title>'+game.name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+' · Superwin Internal</title>').replace('data-native-game=""','data-native-game="'+game.id+'"');}\n`;
await writeFile(new URL('./web-assets.mjs',import.meta.url),code);
