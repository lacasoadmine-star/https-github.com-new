// Independent server model from the observed Safari Simba paytable and rules.
// It reproduces the public return target, not SmartSoft's private RNG/strips.
import {STRIPS} from './strips.mjs';
export const ID='fresh_safarisimba';
export const VERSION='fresh-safari-simba-etb1-100-v1';
export const SYMBOLS=Object.freeze(['j','q','k','a','zebra','elephant','tiger','lion','smartsoft']);
export const COEFFICIENTS=Object.freeze([10,10,10,10,20,20,25,50,75]);
export const LINES=Object.freeze([[1,1,1],[0,0,0],[2,2,2],[0,1,2],[2,1,0]].map(Object.freeze));
export const BET_LEVELS=Object.freeze(['1.00','1.50','2.00','3.00','4.00','5.00','6.00','8.00','10.00','15.00','20.00','30.00','40.00','50.00','60.00','80.00','100.00']);
export const MAXIMUM=145;
const TARGET_NUM=9639n,TARGET_DEN=10000n;
const STRIP_COMBINATIONS=64n**3n;
const BASE_NUM=3n*COEFFICIENTS.reduce((sum,c,symbol)=>sum+BigInt(c)*STRIPS.reduce((product,strip)=>product*BigInt(strip.filter(x=>x===symbol).length),1n),0n);
const gcd=(a,b)=>b===0n?a:gcd(b,a%b),g=gcd(TARGET_NUM*STRIP_COMBINATIONS,TARGET_DEN*BASE_NUM);
export const CALIBRATION=Object.freeze({numerator:TARGET_NUM*STRIP_COMBINATIONS/g,denominator:TARGET_DEN*BASE_NUM/g});
export const RETURN=Object.freeze({numerator:TARGET_NUM,denominator:TARGET_DEN,baseNumerator:BASE_NUM,baseDenominator:STRIP_COMBINATIONS});
export function secureInt(bound){if(!Number.isSafeInteger(bound)||bound<1||bound>4294967296)throw Error('INVALID_RANDOM_BOUND');const data=new Uint32Array(1),limit=4294967296-4294967296%bound;do crypto.getRandomValues(data);while(data[0]>=limit);return data[0]%bound;}
export function gridAt(stops){if(!Array.isArray(stops)||stops.length!==3||stops.some(x=>!Number.isInteger(x)||x<0||x>=64))throw Error('INVALID_REEL_STOPS');return Array.from({length:3},(_,row)=>stops.map((stop,column)=>STRIPS[column][(stop+row)%64]));}
export function evaluate(grid,stakeMinor,multiplier){
 if(!Number.isSafeInteger(stakeMinor)||stakeMinor<100||stakeMinor>10000||stakeMinor%5!==0)throw Error('INVALID_BET');
 if(!Number.isInteger(multiplier)||multiplier<1||multiplier>5||!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==3||row.some(s=>!Number.isInteger(s)||s<0||s>=9)))throw Error('INVALID_GRID');
 const wins=[];for(let i=0;i<LINES.length;i++){const path=LINES[i],symbol=grid[path[0]][0];if(path.every((row,column)=>grid[row][column]===symbol))wins.push({line:i+1,symbol:SYMBOLS[symbol],matched:3,baseMinor:stakeMinor/5*COEFFICIENTS[symbol],positions:path.map((row,col)=>({row,col}))});}
 const winMinor=wins.reduce((n,w)=>n+w.baseMinor,0)*multiplier;
 if(!Number.isSafeInteger(winMinor)||winMinor>stakeMinor*MAXIMUM)throw Error('PAYOUT_BOUND_FAILURE');
 const expandedColumns=[],first=grid[0][0];if([4,5,6].includes(first)&&grid.every(row=>row[0]===first))for(let col=0;col<3;col++)if(grid.every(row=>row[col]===first))expandedColumns.push(col);
 return {grid:grid.map(row=>row.map(id=>SYMBOLS[id])),sourceGrid:grid.map(row=>row.slice()),wheelMultiplier:multiplier,winLines:wins,winMinor,expandedColumns};
}
export function spin(stakeMinor,draw=secureInt){
 const base=()=>({stops:[draw(64),draw(64),draw(64)],multiplier:draw(5)+1});
 let pick=base();
 const accepted=draw(Number(CALIBRATION.denominator))<Number(CALIBRATION.numerator);
 let result=evaluate(gridAt(pick.stops),stakeMinor,pick.multiplier);
 if(!accepted){let attempts=0;while(result.winMinor!==0&&attempts++<128){pick=base();result=evaluate(gridAt(pick.stops),stakeMinor,pick.multiplier);}if(result.winMinor!==0)throw Error('NONWIN_SAMPLING_FAILED');}
 return {...result,stops:pick.stops,probabilityModel:'independent-fixed-strips-calibrated-return',providerRngReproduced:false};
}
