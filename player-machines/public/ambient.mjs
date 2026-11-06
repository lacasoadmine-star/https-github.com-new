// Small background lights measured from the supplied forest and galaxy cabinets.
// Coordinates use the renderer's 420 x 900 space. Reels and live controls are excluded.
const colors=['#a1f5e7','#f771d4','#f4ffd3','#f7ceff'];
const forest=[
 [362,687,.85,1,7,7,0],[372,715,.8,0,5,8,1.1],
 [351,817,.7,0,5,5,2.2],[314,806,.95,2,6,5,3.3],
 [302,793,.65,2,5,5,4.4],[322,821,.65,2,6,4,5.5],
 [88,675,.55,0,5,5,6.6]
];
const galaxy=[
 [320,554,2.1,3,0,0,0],[300,658,2.4,3,0,0,1.1],
 [89,620,.8,2,0,0,2.2],[245,471,.65,3,0,0,3.3],
 [268,543,.55,2,0,0,4.4],[161,557,.55,3,0,0,5.5],
 [78,487,.45,2,0,0,6.6],[41,590,.6,3,0,0,7.7],
 [368,609,.6,2,0,0,8.8],[390,657,.5,3,0,0,9.9],
 [345,449,.55,2,0,0,11],[169,475,.55,3,0,0,12.1],
 [289,503,.7,2,0,0,13.2],[91,670,.6,3,0,0,14.3],
 [205,605,.75,2,0,0,15.4],[59,526,.45,3,0,0,16.5],
 [35,792,.55,2,0,0,17.6],[389,809,.55,3,0,0,18.7]
];
const controls=[[210,754,74],[110,754,36],[331,754,36],[53,754,25],[375,754,24]];
const spriteCache=new Array(colors.length*2);
const idOf=game=>typeof game==='string'?game:game?.id;
function field(game){const id=idOf(game);return id==='hot_foxy_20'?forest:id==='wild_multi_stars'?galaxy:null;}
export function hasAmbientAnimation(game,reducedMotion=false){return !reducedMotion&&field(game)!==null;}
// Idle rendering can compare this integer and redraw at 20 fps instead of every RAF.
export function ambientFrameKey(game,now,reducedMotion=false){return hasAmbientAnimation(game,reducedMotion)?Math.floor(Math.max(0,Number(now)||0)/50):-1;}
export function ambientParticleCount(game){return field(game)?.length||0;}
function sprite(index,star){
 const key=index+(star?colors.length:0),color=colors[index];if(spriteCache[key]!==undefined)return spriteCache[key];
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(48,48):globalThis.document?.createElement?.('canvas');
 if(!canvas){spriteCache[key]=null;return null;}canvas.width=48;canvas.height=48;const c=canvas.getContext('2d');if(!c){spriteCache[key]=null;return null;}
 const glow=c.createRadialGradient(24,24,0,24,24,24);glow.addColorStop(0,'#ffffff');glow.addColorStop(.1,color);glow.addColorStop(.35,color+'70');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(0,0,48,48);
 if(star){c.strokeStyle='#fff4ff';c.lineWidth=.8;c.beginPath();c.moveTo(24,9);c.lineTo(24,39);c.moveTo(9,24);c.lineTo(39,24);c.stroke();}
 spriteCache[key]=canvas;return canvas;
}
function outsideControls(x,y,padding){for(let i=0;i<controls.length;i++){const circle=controls[i],dx=x-circle[0],dy=y-circle[1],r=circle[2]+padding;if(dx*dx+dy*dy<r*r)return false;}return true;}
export function drawAmbient(c,{game,now=0,reducedMotion=false}={}){
 const points=field(game);if(reducedMotion||!points)return false;
 const star=idOf(game)==='wild_multi_stars',time=Math.max(0,Number(now)||0)/1000;
 const floor=Math.max(410,Number(game?.visual?.y||0)+Number(game?.visual?.h||0)+12);
 c.save();c.beginPath();c.rect(0,floor,420,Math.max(0,828-floor));c.clip();
 for(let i=0;i<points.length;i++){
  const p=points[i],phase=p[6],x=p[0]+Math.sin(time*.65+phase)*p[4],y=p[1]+Math.sin(time*.43+phase*.8)*p[5],size=p[2]*12;
  if(y-size/2<floor||y+size/2>828||!outsideControls(x,y,size/2))continue;
  const pulse=.5+.5*Math.sin(time*(star ? .9 : 1.4)+phase);c.globalAlpha=(star ? .12 : .16)+pulse*pulse*(star ? .58 : .72);
  const image=sprite(p[3],star);if(image)c.drawImage(image,x-size/2,y-size/2,size,size);else{c.fillStyle=colors[p[3]];c.beginPath();c.arc(x,y,p[2],0,Math.PI*2);c.fill();}
 }
 c.restore();return true;
}
