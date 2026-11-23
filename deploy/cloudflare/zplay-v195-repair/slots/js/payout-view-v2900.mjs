// Display arithmetic only; wagers and credited awards come from the server.
export function paytableAmount(bet,lines,factor){
  if(!/^\d+(\.\d{1,4})?$/.test(String(bet))||!Number.isInteger(lines)||lines<1||!Number.isFinite(Number(factor))||Number(factor)<0)return '—';
  const [whole,frac='']=String(bet).split('.');const units=BigInt(whole)*10000n+BigInt(frac.padEnd(4,'0'));
  const [fWhole,fFrac='']=String(factor).split('.');if(!/^\d+$/.test(fWhole)||fFrac.length>4)return '—';
  const scaled=BigInt(fWhole)*10000n+BigInt(fFrac.padEnd(4,'0'));
  const cents=(units*scaled)/(BigInt(lines)*1000000n);return `${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
}
export function roundSummary(result){
  const lines=Array.isArray(result.winLines)?result.winLines:[];
  return {id:String(result.roundId||''),win:String(result.finalWin??'—'),multiplier:String(result.wheelMultiplier??'—'),
    lines:lines.map((line,i)=>({number:Number.isInteger(line.line)?line.line:i+1,baseWin:String(line.baseWin??'—'),win:String(line.win??'—'),symbol:String(line.symbol||''),count:Number(line.count)||line.positions?.length||0,positions:line.positions||[]}))};
}
