export function ballPath(path){
 const points=[{x:250,y:16}];let x=250;
 for(let i=0;i<path.length;i++){x+=path[i]===1?12:-12;points.push({x,y:36+i*16});}
 points.push({x,y:308});return points;
}
export function pegboard(game,outcome){
 let pegs='';for(let r=0;r<16;r++)for(let c=0;c<r+3;c++)pegs+='<circle cx="'+(250+(c-(r+2)/2)*24)+'" cy="'+(36+r*16)+'" r="2.7"/>';
 const path=outcome?.path?ballPath(outcome.path):[{x:250,y:16}],ball=path.at(-1);
 const buckets=game.bucketMultipliersBps.map((n,k)=>'<g class="peg-bucket '+(outcome?.bucket===k?'chosen':'')+'"><rect x="'+(46+k*24)+'" y="318" width="23" height="23" rx="3"/><text x="'+(58+k*24)+'" y="332">'+(n/10000)+'×</text></g>').join('');
 return '<svg class="pegboard" viewBox="0 0 500 350" role="img" aria-label="16-row pegboard with 17 prize buckets"><g class="pegs">'+pegs+'</g>'+buckets+'<circle class="plinko-ball" cx="'+ball.x+'" cy="'+ball.y+'" r="5"/></svg><p class="pink-ball-note">1× pink-ball prototype · 5×/10× balls pending</p>';
}
export function animatePegboard(stage,outcome,{turbo=false,reduced=false}={}){
 const ball=stage.querySelector('.plinko-ball'),points=ballPath(outcome.path);let resolve,frame=0,ended=false,start;
 const promise=new Promise(r=>{resolve=r;}),duration=reduced?0:turbo?80:1350;
 const set=p=>{ball?.setAttribute('cx',String(p.x));ball?.setAttribute('cy',String(p.y));};
 function stop(){if(ended)return;ended=true;cancelAnimationFrame(frame);set(points.at(-1));resolve();}
 function tick(time){start??=time;const progress=Math.min(1,(time-start)/duration);const index=progress*(points.length-1),a=Math.floor(index),b=Math.min(a+1,points.length-1),f=index-a;set({x:points[a].x+(points[b].x-points[a].x)*f,y:points[a].y+(points[b].y-points[a].y)*f});if(progress===1)stop();else frame=requestAnimationFrame(tick);}
 if(duration===0)stop();else frame=requestAnimationFrame(tick);return {promise,stop};
}
