const amount=value=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value)?BigInt(value):null;
// Presentation thresholds retained from this title's existing public configuration.
// They never affect the accepted award or independent practice probabilities.
export function winPresentation(winMinor,betMinor) {
 const win=amount(winMinor),bet=amount(betMinor);
 if(win===null||bet===null||win===0n||bet===0n)return null;
 if(win*100n>bet*3999n)return {name:'FANTASTIC WIN',duration:7000};
 if(win*100n>bet*2999n)return {name:'SUPER WIN',duration:5000};
 if(win*100n>bet*1999n)return {name:'BIG WIN',duration:4000};
 if(win*100n>bet*999n)return {name:'NICE WIN',duration:3000};
 return {name:'WIN',duration:1000};
}
export function paintWheel(ctx,multiplier=2,travel=null) {
 const order=[1,3,5,2,4],colors={1:'#77b9ff',2:'#67edb5',3:'#ffe075',4:'#ffad55',5:'#ff7dce'};
 const index=order.indexOf(multiplier),offset=travel===null?0:Math.sin(travel*.3)*.2;
 ctx.save();ctx.lineWidth=3;ctx.strokeStyle='#d1ad53';ctx.fillStyle='#063d29';
 ctx.beginPath();ctx.arc(280,245,195,Math.PI+0.15,Math.PI*2-0.15);ctx.lineTo(473,220);ctx.lineTo(87,220);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 45px Georgia,serif';
 for(let i=-2;i<=2;i++){if(i===0)continue;const value=order[(index+i+10)%5],angle=i*.48+offset;
  ctx.fillStyle=colors[value];ctx.save();ctx.translate(280+Math.sin(angle)*170,245-Math.cos(angle)*95);
  ctx.rotate(angle*.4);ctx.fillText(value+'×',0,0);ctx.restore();
 }
 ctx.beginPath();ctx.moveTo(229,77);ctx.lineTo(331,77);ctx.lineTo(322,214);ctx.lineTo(238,214);ctx.closePath();
 ctx.fillStyle='#064d32';ctx.fill();ctx.strokeStyle='#efcb72';ctx.stroke();
 ctx.font='bold 69px Georgia,serif';ctx.fillStyle=colors[multiplier]||'#ffe075';ctx.fillText(multiplier+'×',280,145);
 ctx.restore();
}
export function paintWin(ctx,round,tier,progress,time) {
 if(!tier)return;
 ctx.save();const p=Math.max(0,Math.min(1,progress));
 const value=BigInt(round.winMinor)*BigInt(Math.round(p*1000))/1000n;
 const text=String(value/100n)+'.'+String(value%100n).padStart(2,'0');
 ctx.fillStyle='#00150edb';ctx.fillRect(30,690,500,115);
 ctx.textAlign='center';ctx.fillStyle=tier.name==='FANTASTIC WIN'?'#ffb7ed':'#ffe184';
 ctx.font='bold '+(34+Math.sin(time/140)*2)+'px Georgia,serif';ctx.fillText(tier.name,280,729);
 ctx.font='bold 42px Georgia,serif';ctx.fillText(text,280,780);ctx.restore();
}
