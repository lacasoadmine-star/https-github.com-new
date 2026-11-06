// Exact helpers extracted from the production runtime; no database/network side effects.
export function bindHelpers(fail){
const cents=x=>{if(typeof x!=='string'||!/^\d{1,8}(\.\d{1,2})?$/.test(x))fail(400,'INVALID_AMOUNT');const [whole,fraction='']=x.split('.');return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));};
const keyOK=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{16,128}$/.test(x);
function settlementReceipt(before,stake,win,after){
 const values=[before,stake,win,after].map(BigInt),[b,s,w,a]=values;
 if(values.some(v=>v<0n)||b-s+w!==a)throw new Error('WALLET_SETTLEMENT_MISMATCH');
 const money=v=>{const sign=v<0n?'-':'';const n=v<0n?-v:v;return sign+(n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');};
 return {currency:'ETB',balanceBefore:money(b),chargedStake:money(s),finalWin:money(w),balanceAfter:money(a),netChange:money(w-s)};
 }
return {cents,keyOK,settlementReceipt};
}
