const cp=require('child_process');
module.exports=async ctx=>{
 const {p,frame,rec,save,eligible,balance,root,options}=ctx,t=await require('./ui-tools.cjs')(ctx),stake=100n;
 const finishedData=(start)=>{let found=null;for(const e of(rec.publicTransportEvidence||[]).slice(start)){let yes=false;const visit=x=>{if(!x||typeof x!=='object')return;if(x.SocketInfo?.IsFinished===true||x.IsFinished===true||x.IsGameFinished===true||x.IsGameOver===true)yes=true;for(const v of Object.values(x))if(v&&typeof v==='object')if(Array.isArray(v))v.forEach(visit);else visit(v)};visit(e.publicData);if(yes)found=e.publicData}return found};
 const click=async(x,y)=>{await p.mouse.move(10,10);await p.waitForTimeout(150);await p.mouse.move(x,y);await p.waitForTimeout(100);await p.mouse.down();await p.waitForTimeout(60);await p.mouse.up()};
 const active=s=>/(?:^|\n)GO(?:\n|$)/.test(s)&&/CASHOUT\s+([\d.]+) DMO/.test(s);
 if(rec.pendingAttempt){const now=await balance(),previous=BigInt(rec.pendingAttempt.beforeBalanceMinorDMO);if(now===previous&&!active(await t.text())){rec.unacceptedUiAttempts=rec.unacceptedUiAttempts||[];rec.unacceptedUiAttempts.push({...rec.pendingAttempt,disposition:'No observed acceptance: public wallet unchanged, no new provider event/counter and terminal START screen. No round count added.',screenshot:await t.screenshot('unaccepted-ui-'+Date.now())});delete rec.pendingAttempt;save()}else throw Error('RESOLVE_EXISTING_PENDING_ROUND_BEFORE_NEW_WAGER')}
 let completed=0;
 for(;;){
  let g;try{g=eligible()}catch(e){if(/QUOTA_ALREADY_MET/.test(e.message))break;if(/COORDINATOR_PAUSED/.test(e.message))return{paused:true,completed};throw e}
  if(options.maxNewRounds&&completed>=options.maxNewRounds)break;
  await t.until(async()=>/(?:^|\n)START(?:\n|$)/.test(await t.text()),30000);
  const value=await frame().locator('#bet-input').inputValue();if(ctx.minor(value)!==stake)throw Error('PUBLIC_STAKE_NOT_ONE_DMO');
  const ordinal=rec.rounds.length+1,before=await t.text(),beforeBank=await balance(),beforeScreenshot=await t.screenshot('round'+String(ordinal).padStart(2,'0')+'-before-'+Date.now()),eventStart=(rec.publicTransportEvidence||[]).length;
  rec.pendingAttempt={ordinal,startedAt:new Date().toISOString(),stakeMinorDMO:'100',beforeBalanceMinorDMO:String(beforeBank),beforeVisibleText:before,beforeScreenshot};save();
  await click(917,592);
  await t.until(async()=>await balance()===beforeBank-stake,12000);
  let text='';await t.until(async()=>{text=await t.text();return active(text)||!!finishedData(eventStart)},25000);
  let paid,proof;
  const stepsToTry=options.varyHops?[0,1,2][ordinal%3]:0;
  for(let step=0;step<stepsToTry&&active(text)&&!finishedData(eventStart);step++){
   const previousAmount=text.match(/CASHOUT\s+([\d.]+) DMO/)[1];await click(917,592);
   await t.until(async()=>{text=await t.text();return !!finishedData(eventStart)||(active(text)&&text.match(/CASHOUT\s+([\d.]+) DMO/)[1]!==previousAmount)},25000);
   if(await balance()<beforeBank-stake)throw Error('UNEXPECTED_ADDITIONAL_DEBIT');
  }
  if(active(text)&&!finishedData(eventStart)){
   await click(367,592);
   await t.until(async()=>await balance()>beforeBank-stake,25000);
   paid=(await balance())-beforeBank+stake;
   proof='Public first-laneGO/CASHOUTgrossamount followed by one CASHOUT; WIN result and exact credited wallet balance confirmsettlement.';
  }else{
   const finished=finishedData(eventStart);if(!finished)throw Error('NO_CONFIRMED_TERMINAL_LOSS');
   await p.waitForTimeout(1000);paid=(await balance())-beforeBank+stake;if(paid!==0n)throw Error('UNCLASSIFIED_FINISHED_RESULT');
   proof='Public transport finished result, no activeGO/CASHOUT state, exact1DMOlostbalance and terminal screenshot.';
  }
  await p.waitForTimeout(700);const after=await t.text(),afterBank=await balance();if(afterBank!==beforeBank-stake+paid)throw Error('SETTLED_BALANCE_CHANGED_UNEXPECTEDLY');let screenshot=null;
  const finalPublic=finishedData(eventStart),response=finalPublic?.R?.EventResponse;
  rec.rounds.push({ordinal,providerDealNumber:response?.GameInfo?.DealNumber,providerEventId:finalPublic?.R?.AvailableEventDetails?.EventId,stepsToTry,at:new Date().toISOString(),stakeMinorDMO:'100',balanceBeforeMinorDMO:String(beforeBank),balanceAfterMinorDMO:String(afterBank),payoutMinorDMO:String(paid),netChangeMinorDMO:String(paid-stake),beforeVisibleText:before,stepVisibleText:text,completedVisibleText:after,beforeScreenshot,screenshot,transportEvidenceStart:eventStart,transportEvidenceEnd:(rec.publicTransportEvidence||[]).length,completedPublicTransport:finishedData(eventStart),completionProof:proof,arithmeticVerified:true});rec.verifiedCompletedRounds=rec.rounds.length;delete rec.pendingAttempt;save();const savedRound=rec.rounds[rec.rounds.length-1];screenshot=await t.screenshot('round'+String(ordinal).padStart(2,'0')+'-'+Date.now());savedRound.screenshot=screenshot;savedRound.screenshotAvailability=screenshot?'captured':'unavailable-transport-error';save();completed++;cp.execFileSync('node',['tests/update-official-demo-progress.mjs'],{cwd:root,stdio:'ignore'});console.log(JSON.stringify({game:rec.title,verifiedFresh:rec.verifiedCompletedRounds,paidMinorDMO:String(paid)}));await p.waitForTimeout(2000);
 }
 const current=JSON.parse(require('fs').readFileSync(root+'/tests/evidence/official-demo-progress.json')).games.find(g=>g.gameId===rec.gameId);rec.status=current.verifiedCompletedRounds>=20?'target20-confirmed-no-more-rounds':'partial-confirmed-continue-within-quota';save();cp.execFileSync('node',['reports/current74-generate.mjs'],{cwd:root,stdio:'ignore'});return{completed,verifiedFresh:rec.verifiedCompletedRounds};
};
