// Local, network-free raster check of the candidate Scene and Art modules.
// This is not a browser screenshot or an account/gameplay test.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import vm from 'node:vm';
import {Art} from './art.mjs';
import {games} from './games.mjs';
const require=createRequire(import.meta.url),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const here=new URL('.',import.meta.url);
GlobalFonts.registerFromPath(new URL('assets/fonts/intro-regular.otf',here).pathname,'Intro');
GlobalFonts.registerFromPath(new URL('assets/fonts/intro-black.otf',here).pathname,'IntroBlack');
const spriteData=JSON.parse(await readFile(new URL('sprites.json',here),'utf8'));
const app=await readFile(new URL('app.mjs',here),'utf8');
const source=app.slice(app.indexOf('class Scene {'),app.indexOf('const scene=new Scene();'));
await mkdir(new URL('local-renders/',here),{recursive:true});
for(const game of games){
 const width=1363,height=width/(game.columns===3?1.92:16/9),canvas=createCanvas(width,Math.round(height)),art=new Art(spriteData[game.art]);
 for(const url of new Set(Object.values(art.frames).map(f=>f.image)))art.images.set(url,await loadImage(new URL(url.replace('/new74/',''),here)));
 const globals={game,art,disposed:false,pageSuspended:false,turbo:false,document:{hidden:false},devicePixelRatio:1,$:id=>id==='scene'?canvas:{getBoundingClientRect:()=>({width,height})},performance:{now:()=>0},reduced:()=>false,sound:()=>{},cents:v=>BigInt(v.replace('.','')),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}};
 vm.createContext(globals);vm.runInContext(source+'\nglobalThis.Scene=Scene;',globals);const scene=new globals.Scene();scene.resize();
 const output=createCanvas(width,936),c=output.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,width,936);
 const bg=await loadImage(new URL('assets/'+game.art+'/background.'+(game.columns===3?'jpg':'png'),here));
 const scale=Math.max(width/bg.width,height/bg.height);c.drawImage(bg,(width-bg.width*scale)/2,26+(height-bg.height*scale)/2,bg.width*scale,bg.height*scale);c.drawImage(canvas,0,26);
 c.save();c.translate(0,26);
 const draw=(name,x,y,w,h,alpha=1)=>art.draw(c,name,x*width,y*height,w*width,h*height,{fit:'contain',alpha});
 if(game.columns===3){
  draw('Buttons/AutoPlayVertical',.062,.164,.08,.162,.6);
  const bx=.83*width,by=.21*height,bw=.13*width,bh=.54*height;
  c.save();c.translate(bx+bw*.5,by+bh*.5);c.rotate(Math.PI/2);art.draw(c,'Buttons/BackgroundVertical',-bw*.82,-bh*.125,bw*1.64,bh*.25,{fit:'contain'});c.restore();
  draw('Buttons/SpinVertical',.83,.21+.54*.32,.13,.54*.38,.6);
  draw('Buttons/PlusVertical',.83+.13*.29,.21,.13*.42,.54*.17,.6);
  draw('Buttons/MinusVertical',.83+.13*.29,.21+.54*.83,.13*.42,.54*.17,.6);
  c.fillStyle='#fff45f';c.font='24px IntroBlack';c.textAlign='center';c.fillText('—',( .83+.065)*width,(.21+.54*.52)*height);
  c.font='14px Intro';for(const [x,label] of [[.345,'BALANCE'],[.49,'WIN'],[.64,'BET']]){c.fillText(label,x*width,.797*height);c.fillText(label==='WIN'?'0.00':'—',x*width,.82*height);}
 }else{
  draw('Buttons/AutoPlay',.861,.26,.062,.11,.6);draw('Buttons/Spin',.831,.374,.124,.2205,.6);draw('Buttons/Bet',.861,.611,.062,.11,.6);draw('Buttons/QuickPlay',.938,.355,.03,.06);
  c.font='14px IntroBlack';c.fillStyle='#fff';c.textAlign='center';c.fillText('PRESS TO SPIN',.893*width,.486*height);
  for(const [left,label]of[[.278,'BALANCE'],[.278+.435*(1-.278),'BET']]){c.fillStyle='#0b351d';c.strokeStyle='#c9bc4c';c.beginPath();c.roundRect(left*width,.866*height,.435*.278*width,.062*height,8);c.fill();c.stroke();c.fillStyle='#ffef50';c.fillText(label,(left+.435*.139)*width,.89*height);c.fillStyle='#fff';c.fillText('—',(left+.435*.139)*width,.915*height);}
 }
 c.restore();c.fillStyle='#ee285c';c.font='12px IntroBlack';c.textAlign='left';c.fillText('ZPLAY  NEW 74',10,18);
 c.fillStyle='#fff';c.font='11px Intro';c.textAlign='center';c.fillText('LOCAL PRESENTATION RASTER · No account or gameplay calls',width/2,916);
 await writeFile(new URL('local-renders/'+game.id+'.png',here),output.toBuffer('image/png'));
 console.log(JSON.stringify({game:game.id,stage:{width,height},layout:scene.layout(),images:art.images.size}));
}
