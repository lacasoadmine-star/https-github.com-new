// Isolated server-side arithmetic verification for an original MH40 demo receipt.
// This does not sample outcomes, enable wagering, or mutate a wallet. A receipt's
// listed wins cannot prove the complete reel-strip/probability/payout model.
export const MH40_REFERENCE=Object.freeze({gameId:'multihot40_native',reels:5,rows:4,paylines:40,foundationBet:1,
 productionApproved:false,probabilityModelVerified:false,
 coefficients:Object.freeze([[20,200,500],[15,100,200],[10,50,100],[10,50,100],[5,10,50],[5,10,50],[5,10,50],[5,10,50]].map(Object.freeze))});
const requireValue=(ok,code)=>{if(!ok)throw Error(code);};
const money=cents=>`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
export function verifyOriginalMultiHot40Receipt(receipt){
 requireValue(receipt?.LinePlay===40&&receipt.FoundationBet===1&&receipt.ChipCoef===0.01,'MH40_UNVERIFIED_DENOMINATION');
 requireValue(Number.isSafeInteger(receipt.BetPerLine)&&receipt.BetPerLine>0,'MH40_INVALID_LINE_STAKE');
 requireValue(Number.isInteger(receipt.Multiplier)&&receipt.Multiplier>=1&&receipt.Multiplier<=5,'MH40_INVALID_WHEEL');
 requireValue(Array.isArray(receipt.Baraban)&&receipt.Baraban.length===20&&receipt.Baraban.every(x=>Number.isInteger(x)&&x>=0&&x<8),'MH40_INVALID_BOARD');
 requireValue(Array.isArray(receipt.WinLinesStrips),'MH40_WIN_LINES_REQUIRED');
 let baseUnits=0n;const seen=new Set();
 for(const line of receipt.WinLinesStrips){
  requireValue(Number.isInteger(line.LineNumber)&&line.LineNumber>=0&&line.LineNumber<40&&!seen.has(line.LineNumber),'MH40_INVALID_LINE_ID');seen.add(line.LineNumber);
  requireValue(Number.isInteger(line.Strip)&&line.Strip>=0&&line.Strip<8&&[3,4,5].includes(line.StripCount),'MH40_INVALID_SYMBOL_COUNT');
  requireValue(line.Win===MH40_REFERENCE.coefficients[line.Strip][line.StripCount-3],'MH40_COEFFICIENT_MISMATCH');
  requireValue(Array.isArray(line.Indexes)&&line.Indexes.length===line.StripCount&&line.Indexes.every((index,col)=>Number.isInteger(index)&&index>=0&&index<20&&index%5===col&&receipt.Baraban[index]===line.Strip),'MH40_WIN_POSITIONS_MISMATCH');
  baseUnits+=BigInt(line.Win)*BigInt(receipt.BetPerLine);
 }
 requireValue(Number.isSafeInteger(receipt.TotalWin)&&receipt.TotalWin>=0,'MH40_INVALID_TOTAL');
 const totalUnits=baseUnits*BigInt(receipt.Multiplier);
 requireValue(totalUnits===BigInt(receipt.TotalWin),'MH40_TOTAL_WIN_MISMATCH');
 // Captured ChipCoef .01 means one provider unit equals one currency cent.
 return {gameId:MH40_REFERENCE.gameId,stake:money(40n*BigInt(receipt.BetPerLine)),baseWin:money(baseUnits),
  wheelMultiplier:receipt.Multiplier,totalWin:money(totalUnits),winningLines:seen.size,
  receiptArithmeticVerified:true,fullPayoutModelVerified:false,productionApproved:false};
}
