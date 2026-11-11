// READ ONLY: version/amount/info controls only. Never HOLD & DROP or Play.
const fs=require('fs'),path=require('path');
module.exports=async ctx=>{
 if(ctx.rec.gameId!=='ind74_official_plinkox')throw Error('PLINKOX_ONLY');
 const progress=JSON.parse(fs.readFileSync(path.join(ctx.root,'tests/evidence/official-demo-progress.json')));if(progress.games.find(g=>g.gameId===ctx.rec.gameId).verifiedCompletedRounds<20)throw Error('READ_ONLY_REVIEW_REQUIRES_EXISTING20');
 delete require.cache[require.resolve('./ui-tools.cjs')];const t=await require('./ui-tools.cjs')(ctx),report={createdAt:new Date().toISOString(),gameId:ctx.rec.gameId,mode:'official-demo-read-only-controls',newWagers:0,states:[],notEstablished:['Risk/ball probabilities','Outcomes outside the retained20 LOW rounds','Multi-ball financial settlement']},file=path.join(ctx.root,'reports/current74-evidence-nonslots/ind74_official_plinkox-controls-review.json');
 const save=()=>{const temp=file+'.tmp-'+process.pid;fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n');fs.renameSync(temp,file)};
 const state=async label=>{const text=await t.text(),dom=await ctx.frame().evaluate(()=>({url:location.origin+location.pathname,viewport:{width:innerWidth,height:innerHeight},leafTexts:[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length&&!e.children.length&&e.textContent.trim()).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,className:e.className,text:e.textContent.trim().slice(0,300),color:s.color,background:s.backgroundColor,parentClass:e.parentElement?.className,parentBackground:e.parentElement?getComputedStyle(e.parentElement).backgroundColor:null,rect:{x:r.x,y:r.y,width:r.width,height:r.height}}}),inputs:[...document.querySelectorAll('input,select,button')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,id:e.id,type:e.type,value:e.value,text:e.innerText,disabled:e.disabled})),scripts:[...document.scripts].map(s=>s.src?new URL(s.src).origin+new URL(s.src).pathname:null).filter(Boolean)}));const image=await t.screenshot('read-only-'+label+'-'+Date.now());report.states.push({label,at:new Date().toISOString(),text,dom,screenshot:image});save();return text};
 await state('initial-version-modal');
 // Initial modal LOW option; independent of wagering controls.
 await ctx.p.mouse.click(638,300);await ctx.p.waitForTimeout(1200);const initial=await state('low-ready'),startingBank=initial.match(/BALANCE\s*([\d,.]+)\s*DMO/i)?.[1];if(!startingBank)throw Error('READ_ONLY_VISIBLE_BALANCE_REQUIRED');report.startingBankDmo=startingBank;save();
 const safeClick=async(x,y,label)=>{if(x>900&&y<440)throw Error('READ_ONLY_PRIMARY_WAGER_AREA_FORBIDDEN');await ctx.p.mouse.click(x,y);await ctx.p.waitForTimeout(1100);const text=await state(label),bank=text.match(/BALANCE\s*([\d,.]+)\s*DMO/i)?.[1];if(bank!==startingBank)throw Error('READ_ONLY_WALLET_CHANGED');};
 for(const[risk,y]of[['low',520],['medium',575],['high',625]])await safeClick(950,y,'risk-'+risk);
 for(const[count,x,y]of[[1,1138,523],[5,1103,573],[10,1173,573],[25,1138,625]])await safeClick(x,y,'amount-'+count);
 for(const[color,y]of[['blue',239],['yellow',294],['pink',345]])await safeClick(157,y,'legend-'+color);
 await safeClick(192,670,'menu');
 report.endingBankDmo=(await t.text()).match(/BALANCE\s*([\d,.]+)\s*DMO/i)?.[1];report.walletUnchanged=report.endingBankDmo===startingBank;report.finishedAt=new Date().toISOString();save();return{file:path.relative(ctx.root,file),states:report.states.length,walletUnchanged:report.walletUnchanged,newWagers:0};
};
