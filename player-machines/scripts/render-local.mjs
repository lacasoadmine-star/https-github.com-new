// Render the actual Canvas engine locally, without a network or live wallet.
import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {gameConfig} from '../public/registry.mjs';
import {MachineRenderer} from '../public/renderer.mjs';
import {settle} from '../test/fixtures.mjs';
const require=createRequire(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/entry.js'),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf','Arial');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf','Georgia');
globalThis.document={createElement:()=>createCanvas(256,256)};globalThis.devicePixelRatio=3;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const out=process.argv[2]||'/tmp/zplay-native-qa';await mkdir(out,{recursive:true});const summary=[];
for(const id of ['multi_hot_5_video','hot_foxy_20'])for(const width of [360,390,430]){const canvas=createCanvas(width,width*900/420),g=gameConfig(id),events=[];canvas.getBoundingClientRect=()=>({width});const audio={event:(name,index)=>events.push({name,index}),win:()=>events.push({name:'win'}),stop(){}};const renderer=new MachineRenderer(canvas,g,audio);renderer.draw(0,16);await writeFile(`${out}/${id}-${width}-idle.png`,canvas.toBuffer('image/png'));let result;for(let i=0;i<5000;i++){const r=settle(id);if(Number(r.finalWin)>=40){result=r;break;}}const before=canvas.toBuffer('image/png');const motion=renderer.start(result),start=renderer.motion.started;renderer.draw(0,16);if(!before.equals(canvas.toBuffer('image/png')))throw Error('Reel start changed the visible grid before motion');for(let t=16;renderer.motion.active;t+=16){if(t===480)renderer.speedUp();renderer.loop(start+t);}await motion;renderer.draw(renderer.presentedAt+700,16);await writeFile(`${out}/${id}-${width}-win.png`,canvas.toBuffer('image/png'));if(JSON.stringify(renderer.grid)!==JSON.stringify(result.grid))throw Error('Final grid mismatch');if(events.filter(x=>x.name==='reel-stop').length!==g.reels)throw Error('Reel stop count mismatch');if(events.filter(x=>x.name==='wheel-stop').length!==1)throw Error('Wheel stop count mismatch');if(canvas.width!==width*2)throw Error('DPR limit mismatch');summary.push({game:id,width,canvas:[canvas.width,canvas.height],events:events.length,frames:renderer.stats.frames,serverGridMatched:true});renderer.dispose();}
await writeFile(out+'/results.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
