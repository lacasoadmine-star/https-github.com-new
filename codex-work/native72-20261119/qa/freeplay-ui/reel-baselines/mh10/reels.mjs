export const SYMBOLS=Object.freeze({seven:0,bell:1,grape:2,watermelon:3,cherry:4,orange:5,plum:6,lemon:7});
export function validateGrid(grid){if(!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==5||row.some(s=>!Object.hasOwn(SYMBOLS,s))))throw Error('Invalid five-reel grid');return grid.map(r=>r.slice())}
export class Reels{
 constructor(){this.phase='READY';this.grid=[['watermelon','grape','plum','cherry','cherry'],['grape','cherry','orange','bell','bell'],['watermelon','cherry','lemon','grape','cherry']];this.offsets=Array(5).fill(0);}
 start(grid,time,plan){if(this.phase!=='READY')throw Error('Busy');if(!Array.isArray(plan)||plan.length!==5||plan.some(t=>!Number.isFinite(t)||t<=0))throw Error('Stop plan required');this.target=validateGrid(grid);this.startTime=time;this.plan=plan.slice();this.phase='SPINNING';}
 stop(time){if(this.phase!=='SPINNING')return;const elapsed=time-this.startTime;this.plan=this.plan.map((t,i)=>Math.min(t,elapsed+120+i*60));this.phase='STOPPING';}
 tick(time){if(this.phase==='READY')return false;const elapsed=Math.max(0,time-this.startTime);let stopped=0;for(let i=0;i<5;i++){const progress=Math.min(1,elapsed/this.plan[i]);this.offsets[i]=(1-Math.pow(1-progress,3))*18;if(progress===1){stopped++;for(let y=0;y<3;y++)this.grid[y][i]=this.target[y][i];}}if(stopped===5){this.offsets.fill(0);this.phase='READY';return true}return false;}
}
