import {OFFICIAL_DEMO_CATALOG as ORIGINAL} from './official-demo-catalog.mjs';
import SMARTSOFT from './smartsoft-official-snapshot.json' with {type:'json'};
import PRAGMATIC from './pragmatic-official-snapshot.json' with {type:'json'};
export function validDemoURL(value){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||value.includes('TRUNCATED'))return null;
 if(u.origin==='https://eu-server.ssgportal.com'&&u.pathname.toLowerCase()==='/gamelauncher/loader.aspx'&&u.searchParams.get('PortalName')?.toUpperCase()==='DEMO'&&['DEMO','DEMO_EXH'].includes(u.searchParams.get('Token'))&&u.searchParams.get('GameName'))return u;
 if(u.origin==='https://demogamesfree.pragmaticplay.net'&&u.pathname==='/gs2c/openGame.do'&&/^[a-zA-Z0-9_]+$/.test(u.searchParams.get('gameSymbol')||''))return u;
 }catch{}return null;
}
function record(row,key){
 const [name,source_url,launch_url,cover,category='Slots']=row,u=validDemoURL(launch_url);
 if((!u&&!(key==='pragmatic'&&launch_url===null))||typeof name!=='string'||!name.trim()||!cover||cover.includes('TRUNCATED'))return null;
 const source=new URL(source_url),image=new URL(cover);
 if(source.origin!==(key==='smartsoft'?'https://www.smartsoftgaming.com':'https://www.pragmaticplay.com')||image.protocol!=='https:'||!['cdn.prod.website-files.com','www.pragmaticplay.com'].includes(image.hostname))return null;
 const slug=source.pathname.split('/').filter(Boolean).at(-1),provider_game_id=u?.searchParams.get(key==='smartsoft'?'GameName':'gameSymbol')||null;
 return Object.freeze({id:(key==='smartsoft'?'ssg-':'pp-')+slug,name:name.trim(),category,provider:key==='smartsoft'?'SmartSoft Gaming':'Pragmatic Play',provider_name:key==='smartsoft'?'SmartSoft Gaming':'Pragmatic Play',provider_key:key,provider_game_id,source_url,launch_url,cover,mode:'DEMO',etb_enabled:false,settlement_enabled:false,source_verified:true,launcher_verified:Boolean(u),demo_resolution:u?'catalog':'official_provider_page',verified_on:'2026-11-04'});
}
const smartsoft=new Map();
for(const g of ORIGINAL.games){const v=record([g.name,g.source_url,g.launch_url,g.cover,g.category],'smartsoft');if(v)smartsoft.set(v.id,v);}
for(const row of SMARTSOFT){const v=record(row,'smartsoft');if(v)smartsoft.set(v.id,v);}
const pragmatic=new Map();
for(const batch of [PRAGMATIC])for(const row of batch.rows){
 if(row.length!==4||(row[3]!==null&&!row[3].startsWith('https:')))continue;
 const [name,source,cover,launch]=row,category=/scratchcard/i.test(name)?'Arcade':/blackjack|roulette|baccarat|poker/i.test(name)?'Table':/plinko/i.test(name)?'Arcade':/crash|spaceman|high flyer/i.test(name)?'Crash':'Slots';
 const v=record([name,source,launch,cover,category],'pragmatic');if(v&&!pragmatic.has(v.provider_game_id||v.id))pragmatic.set(v.provider_game_id||v.id,v);
}
const games=Object.freeze([...smartsoft.values(),...pragmatic.values()]);
export const PUBLIC_DEMO_CATALOG=Object.freeze({provider:'SmartSoft Gaming & Pragmatic Play',environment:'Official public demos',verified_on:'2026-11-04',requested_games:1000,total_games:games.length,resolved_launchers:games.filter(g=>g.launcher_verified).length,on_demand_launchers:games.filter(g=>!g.launcher_verified).length,providers:{smartsoft:smartsoft.size,pragmatic:pragmatic.size},source_urls:['https://www.smartsoftgaming.com/games','https://www.pragmaticplay.com/en/games/'],games});
export function providerReadiness(){return {catalog_version:'2026-11-04',requested_games:1000,demo_games:games.length,settlement_enabled:false,providers:['smartsoft','pragmatic'].map(id=>({id,name:id==='smartsoft'?'SmartSoft Gaming':'Pragmatic Play',demo_enabled:true,demo_games:PUBLIC_DEMO_CATALOG.providers[id],live_enabled:false,status:'AWAITING_PROVIDER_API',launch_endpoint:'/api/providers/launch'}))};}
