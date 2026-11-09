// Display-only cash arithmetic for the nine new SmartSoft-derived titles.
// Coefficients come from the authenticated public configuration. This module
// neither chooses outcomes nor changes the actual stake or any round state.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const profiles=freeze({
 multihot100_native:{divisor:100,multiplier:true},
 multihotwildways_native:{divisor:1,ways:true,multiplier:true},
 multihot5wild_native:{divisor:5,multiplier:true,wild:['0']},
 multihot5superwilds_native:{divisor:10,multiplier:true,wild:['0']},
 multihotdeluxe_native:{divisor:5,multiplier:true},
 burningice_native:{divisor:5,scatter:['8','9'],wild:['0','11']},
 burningice10_native:{divisor:10,scatter:['8','9'],wild:['0','11']},
 burningice40_native:{divisor:40,scatter:['8'],wild:['0']},
 habeshafortune5_native:{divisor:5,multiplier:true},
});
export const SMARTSOFT_HELP_IDS=freeze(Object.keys(profiles));
export const supportsSmartSoftHelp=game=>Object.hasOwn(profiles,typeof game==='string'?game:game?.id);
const fail=code=>{throw Error('SMARTSOFT_HELP_'+code);};
const integer=value=>typeof value==='string'&&/^(0|[1-9]\d{0,29})$/.test(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const gcd=(a,b)=>b?gcd(b,a%b):a;
function fraction(numerator,denominator){
 if(denominator<=0n||numerator<0n)fail('INVALID_FRACTION');
 const divisor=gcd(numerator,denominator);
 return {numerator:String(numerator/divisor),denominator:String(denominator/divisor)};
}
function minor(value){
 if(typeof value!=='string'||!/^(0|[1-9]\d{0,12})\.\d{2}$/.test(value))fail('INVALID_PREVIEW_STAKE');
 return BigInt(value.replace('.',''));
}
function coefficient(value){
 if(!object(value)||!integer(value.numerator)||!integer(value.denominator)||BigInt(value.denominator)===0n)fail('INVALID_COEFFICIENT');
 return fraction(BigInt(value.numerator),BigInt(value.denominator));
}
function rowDivisor(profile,row){
 if(profile.scatter?.includes(row.symbol)){
  // The current public scatter counts are already total-stake fractions.
  // rawReferenceCounts are provenance, never an extra payout multiplier.
  if(row.basis!=='total stake')fail('SCATTER_BASIS_MISMATCH');
  return 1n;
 }
 if(profile.ways){if(row.basis!=='total stake per winning way')fail('WAY_BASIS_MISMATCH');return 1n;}
 if(row.basis!=='stake divided by '+profile.divisor)fail('LINE_BASIS_MISMATCH');
 return BigInt(profile.divisor);
}

// Exact display, including sub-santim cash figures such as 0.125 ETB. The
// financial engine floors the complete round once, not every Help table row.
// A non-terminating future rational is shown as a fraction, never rounded
// silently to a different coefficient.
export function formatHelpCash({numerator,denominator}){
 if(!integer(numerator)||!integer(denominator)||BigInt(denominator)===0n)fail('INVALID_CASH_FRACTION');
 const n=BigInt(numerator),d=BigInt(denominator),reduced=fraction(n,d);
 let remainder=BigInt(reduced.denominator),twos=0,fives=0;
 while(remainder%2n===0n){remainder/=2n;twos++;}
 while(remainder%5n===0n){remainder/=5n;fives++;}
 if(remainder!==1n||Math.max(twos,fives)>12)return reduced.numerator+' / '+reduced.denominator;
 const places=Math.max(2,twos,fives),scale=10n**BigInt(places),value=n*scale/d;
 const whole=(value/scale).toString(),digits=(value%scale).toString().padStart(places,'0');
 let decimals=digits;while(decimals.length>2&&decimals.endsWith('0'))decimals=decimals.slice(0,-1);
 return whole+'.'+decimals;
}
export function helpCashPrize(stake,counts,basisDivisor=1){
 const stakeMinor=minor(stake),c=coefficient(counts);
 if(!Number.isSafeInteger(basisDivisor)||basisDivisor<1||basisDivisor>1000)fail('INVALID_BASIS');
 const n=stakeMinor*BigInt(c.numerator),d=BigInt(c.denominator)*BigInt(basisDivisor);
 const cash=fraction(n,d*100n);
 return freeze({...cash,cash:formatHelpCash(cash),floorMinor:String(n/d),fractionalMinor:n%d!==0n});
}

export class SmartSoftHelpPreview {
 #source;#previewStake;
 constructor(game,{selectedStake}={}){
  if(!supportsSmartSoftHelp(game))fail('UNSUPPORTED_TITLE');
  const profile=profiles[game.id];
  if(!Array.isArray(game.symbols)||!Array.isArray(game.paytable)||!game.paytable.length||!Array.isArray(game.stakeValues)||!game.stakeValues.length)fail('INVALID_CONFIG');
  const stakes=game.stakeValues.map(value=>{if(minor(value)<=0n)fail('INVALID_PREVIEW_STAKE');return value;});
  if(new Set(stakes).size!==stakes.length||stakes.some((value,index)=>index>0&&minor(value)<=minor(stakes[index-1])))fail('INVALID_STAKE_SCHEDULE');
  const symbols=new Map();for(const symbol of game.symbols){
   const id=String(symbol.id);if(!/^\d+$/.test(id)||symbols.has(id)||typeof symbol.label!=='string'||!symbol.label)fail('INVALID_SYMBOL');
   symbols.set(id,{id,label:symbol.label});
  }
  const seen=new Set(),rows=game.paytable.map(row=>{
   if(!object(row)||typeof row.symbol!=='string'||!symbols.has(row.symbol)||seen.has(row.symbol)||!object(row.counts))fail('INVALID_PAYTABLE_ROW');
   seen.add(row.symbol);const divisor=rowDivisor(profile,row);
   const counts=Object.entries(row.counts).map(([count,value])=>{
    if(!/^[2-5]$/.test(count))fail('INVALID_MATCH_COUNT');
    return {count:Number(count),coefficient:coefficient(value)};
   }).sort((a,b)=>a.count-b.count);
   const kind=profile.scatter?.includes(row.symbol)?'scatter':profile.ways?'way':profile.wild?.includes(row.symbol)&&!counts.length?'wild':'line';
   return {symbol:row.symbol,label:symbols.get(row.symbol).label,basis:row.basis,divisor:Number(divisor),kind,counts};
  });
  if(seen.size!==symbols.size)fail('INCOMPLETE_PAYTABLE');
  // Retain the source symbol order. In particular, the SuperWilds lower Help
  // image ordering has not been independently established from live footage.
  if(selectedStake!==undefined&&!stakes.includes(selectedStake))fail('SELECTED_STAKE_NOT_IN_SCHEDULE');
  const initial=selectedStake??stakes[0];
  this.#source=freeze({id:game.id,name:String(game.name||game.id),version:String(game.version||''),selectedStake:initial,stakeValues:stakes,rows,multiplier:profile.multiplier===true,ways:profile.ways===true,paylines:Number(game.paylines)||0,wayCount:Number(game.ways)||0});
  this.#previewStake=initial;
 }
 setPreviewStake(value){
  if(!this.#source.stakeValues.includes(value))fail('STAKE_NOT_IN_SCHEDULE');
  this.#previewStake=value;return this.snapshot();
 }
 step(direction){
  if(direction!==-1&&direction!==1)fail('INVALID_STEP');
  const index=this.#source.stakeValues.indexOf(this.#previewStake),next=Math.max(0,Math.min(this.#source.stakeValues.length-1,index+direction));
  this.#previewStake=this.#source.stakeValues[next];return this.snapshot();
 }
 snapshot(){
  const source=this.#source,index=source.stakeValues.indexOf(this.#previewStake);
  const rows=source.rows.map(row=>({...row,prizes:row.counts.map(({count,coefficient:value})=>({count,...helpCashPrize(this.#previewStake,value,row.divisor)}))}));
  return freeze({...source,rows,previewStake:this.#previewStake,currency:'ETB',canDecrease:index>0,canIncrease:index<source.stakeValues.length-1,hasFractionalMinor:rows.some(row=>row.prizes.some(prize=>prize.fractionalMinor))});
 }
}
