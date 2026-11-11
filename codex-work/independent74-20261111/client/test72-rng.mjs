// Browser randomness is used exclusively by the explicitly non-monetary test bench.
// Account play must continue using the server-only engine and verified ledger.
export function randomInt(bound){
 if(!Number.isSafeInteger(bound)||bound<1)throw Error('Invalid random bound');
 const b=BigInt(bound),range=1n<<64n,limit=range-range%b,buffer=new Uint32Array(2);
 let value;do{crypto.getRandomValues(buffer);value=(BigInt(buffer[0])<<32n)+BigInt(buffer[1]);}while(value>=limit);
 return Number(value%b);
}
