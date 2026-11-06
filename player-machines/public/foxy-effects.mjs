// Receipt-driven Foxy highlights. These surfaces never select symbols or wins.
export function drawFoxyMultiplier(c,value,x,y,size){
 c.save();c.translate(x,y);c.font=`900 ${size}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 const label=value+'x';c.strokeStyle='#973526';c.lineWidth=3.5;c.strokeText(label,0,1.5);c.strokeStyle='#fffbc4';c.lineWidth=1.8;c.strokeText(label,0,0);
 const ink=c.createLinearGradient(0,-size/2,0,size/2);ink.addColorStop(0,'#ffe874');ink.addColorStop(.38,'#ffbd26');ink.addColorStop(.8,'#f0781e');ink.addColorStop(1,'#d64a25');c.fillStyle=ink;c.fillText(label,0,0);c.restore();
}

function trace(c,points){
 c.beginPath();c.moveTo(...points[0]);
 for(let i=1;i<points.length;i++){
  if(i===points.length-1){c.lineTo(...points[i]);continue;}
  const before=points[i-1],p=points[i],after=points[i+1],r=.1;
  c.lineTo(p[0]+(before[0]-p[0])*r,p[1]+(before[1]-p[1])*r);
  c.quadraticCurveTo(...p,p[0]+(after[0]-p[0])*r,p[1]+(after[1]-p[1])*r);
 }
}
function gem(c,x,y){
 c.beginPath();c.moveTo(x,y-3.8);c.lineTo(x+4.2,y);c.lineTo(x,y+3.8);c.lineTo(x-4.2,y);c.closePath();c.fillStyle='#a52165';c.fill();c.strokeStyle='#b8db62';c.lineWidth=1;c.stroke();
}
export function drawFoxyPaylines(c,{game,result,grid,atlas,age=0,reducedMotion=false}){
 if(!result.winLines.length)return;
 const v=game.visual,cw=v.w/game.reels,ch=v.h/game.rows;
 const selected=Math.floor((reducedMotion?0:Math.max(0,age))/1100)%result.winLines.length;
 const pulse=reducedMotion?1:.5+.5*Math.sin(Math.max(0,age)/220)**2;
 const cells=new Set(result.winLines.flatMap(line=>line.positions.map(([row,col])=>row+':'+col)));
 c.save();c.beginPath();c.rect(v.x+1,v.y+1,v.w-2,v.h-2);c.clip();
 for(const key of cells){
  const [row,col]=key.split(':').map(Number),x=v.x+(col+.5)*cw,y=v.y+(row+.5)*ch;
  const light=c.createRadialGradient(x,y,2,x,y,Math.max(cw,ch)*.75);light.addColorStop(0,'#d9f62b66');light.addColorStop(.6,'#92d52b33');light.addColorStop(1,'#7ba72b00');c.fillStyle=light;c.fillRect(x-cw*.6,y-ch*.6,cw*1.2,ch*1.2);
  const sprite=atlas.get(grid[row][col]),size=Math.min(cw*.99,ch*1.05)*(reducedMotion?1.045:1.035+.065*pulse);
  c.shadowColor='#c7ff32';c.shadowBlur=reducedMotion?5:5+6*pulse;c.drawImage(sprite,x-size/2,y-size/2,size,size);c.shadowBlur=0;
 }
 c.restore();c.save();c.lineCap='round';c.lineJoin='round';
 result.winLines.forEach((line,i)=>{
  const points=line.rows.map((row,col)=>[v.x+(col+.5)*cw,v.y+(row+.5)*ch]);
  c.globalAlpha=i===selected?1:.82;trace(c,points);c.shadowColor='#c1ee33';c.shadowBlur=3;c.strokeStyle='#b5d532';c.lineWidth=i===selected?3.2:2.6;c.stroke();c.shadowBlur=0;c.strokeStyle='#146c45';c.lineWidth=i===selected?1.3:1;c.stroke();
  gem(c,...points[0]);gem(c,...points.at(-1));
 });c.restore();return result.winLines[selected];
}
