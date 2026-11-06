// Receipt-driven Foxy highlights. These surfaces never select symbols or wins.
export function drawFoxyMultiplier(c,value,x,y,size){
 c.save();c.translate(x,y);c.scale(1,1.075);c.font=`900 ${size}px Arial, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 const label=value+'x';
 // The orange face sits above a deep red extrusion in the supplied cabinet.
 // Paint the underside first so moving wheel numbers keep the same solid edge.
 c.shadowColor='#00291c99';c.shadowBlur=2;c.shadowOffsetY=2;
 c.strokeStyle='#7f281f';c.fillStyle='#a52c20';c.lineWidth=3.4;
 c.strokeText(label,.45,3.4);c.fillText(label,.45,3.4);
 c.shadowBlur=0;c.shadowOffsetY=0;
 c.strokeStyle='#eebc50';c.lineWidth=3.3;c.strokeText(label,0,.2);
 c.strokeStyle='#fffbd2';c.lineWidth=1.8;c.strokeText(label,0,-.35);
 const ink=c.createLinearGradient(0,-size*.44,0,size*.4);
 ink.addColorStop(0,'#ffec74');ink.addColorStop(.12,'#ffd533');ink.addColorStop(.44,'#ffb420');ink.addColorStop(.8,'#ff791a');ink.addColorStop(1,'#ed4b15');
 c.fillStyle=ink;c.fillText(label,0,0);c.restore();
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
