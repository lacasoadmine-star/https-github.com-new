// Coordinates are presentation-only, from Habesha's observed Double.config.
// The original desktop background begins at (35, 0); portrait begins at (0, 60).
export const habeshaGambleLayouts=Object.freeze({
 landscape:{width:1234,height:681,background:[0,0,1234,681],red:[145,291,368,139],black:[717,291,368,139],card:[518,220,194,282],take:[471,485,293,115],close:[1115,10,95,95],amount:[300,40],toWin:[920,40],previous:[617,48],history:[620,104],instruction:[617,600],historyCard:[179*72/167,270*72/167],labelSize:24,valueSize:24,previousSize:20,instructionSize:20,buttonSize:24},
 portrait:{width:511,height:864,background:[0,0,511,864],red:[26,498,218,80],black:[265,492,220,86],card:[193,270,179*.75,270*.75],take:[155,660,293*.75,115*.75],close:[435,10,95*.75,95*.75],amount:[106,80],toWin:[421,80],previous:[264,120],history:[264,145],instruction:[264,793],historyCard:[179*72/167,270*72/167],labelSize:16,valueSize:16,previousSize:18,instructionSize:16,buttonSize:21}
});

export function habeshaGambleBounds(machine,viewport){
 const portrait=machine.height>machine.width,layout=habeshaGambleLayouts[portrait?'portrait':'landscape'];
 const maxWidth=machine.width*(portrait?.89:.61),maxHeight=Math.max(100,viewport.height-110);
 const width=Math.min(maxWidth,maxHeight*layout.width/layout.height),height=width*layout.height/layout.width;
 return {variant:portrait?'portrait':'landscape',width,height,left:machine.left+(machine.width-width)/2,top:Math.max(12,Math.min(machine.top+(machine.height-height)/2,viewport.height-height-70))};
}

// The gamble reveal uses the same visible time rule as the reels. Pausing
// affects presentation only: the controller retains the already settled receipt.
export class HabeshaGambleClock {
 constructor({now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.paused=false;this.jobs=new Map();}
 schedule(key,callback,delay){this.clear(key);const job={callback,remaining:Math.max(0,delay),timer:null,started:0};this.jobs.set(key,job);if(!this.paused)this.arm(key,job);}
 arm(key,job){job.started=this.now();job.timer=this.setTimer(()=>{if(this.jobs.get(key)!==job)return;this.jobs.delete(key);job.callback();},job.remaining);}
 setPaused(value){value=!!value;if(value===this.paused)return;this.paused=value;for(const [key,job]of this.jobs){if(value){if(job.timer!==null)this.clearTimer(job.timer);job.remaining=Math.max(0,job.remaining-(this.now()-job.started));job.timer=null;}else this.arm(key,job);}}
 clear(key){const job=this.jobs.get(key);if(job?.timer!==null&&job?.timer!==undefined)this.clearTimer(job.timer);this.jobs.delete(key);}
 clearAll(){for(const key of [...this.jobs.keys()])this.clear(key);}
}
