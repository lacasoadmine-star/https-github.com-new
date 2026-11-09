// Bounded work for one selected game's locked assets. No global cache or
// cross-title preload is created; closing a view discards queued work.
export class AssetTaskQueue {
 constructor(limit){
  if(!Number.isInteger(limit)||limit<1||limit>16)throw new TypeError('Invalid asset concurrency');
  this.limit=limit;this.active=0;this.pending=[];this.closed=false;
 }
 run(task,{priority=0}={}){
  if(this.closed)return Promise.reject(new Error('Asset store disposed'));
  return new Promise((resolve,reject)=>{this.pending.push({task,priority,resolve,reject});this.pending.sort((a,b)=>b.priority-a.priority);this.drain();});
 }
 drain(){
  while(!this.closed&&this.active<this.limit&&this.pending.length){
   const item=this.pending.shift();this.active++;
   Promise.resolve().then(item.task).then(item.resolve,item.reject).finally(()=>{this.active--;this.drain();});
  }
 }
 close(){this.closed=true;for(const item of this.pending.splice(0))item.reject(new Error('Asset store disposed'));}
}
