import {spin} from './server-core-snapshot.mjs';
import {units,decimal} from '../public/contract.mjs';
export function settle(game,bet='2.00',before=10000000n,options={}){const r=spin(game,bet,options),stake=r.isFree?0n:units(bet)/100n,pay=units(r.finalWin)/100n;const receipt={currency:'ETB',balanceBefore:decimal(before),chargedStake:decimal(stake),finalWin:decimal(pay),balanceAfter:decimal(before-stake+pay)};return Object.assign(r,receipt,{walletReceipt:receipt,freeSpinsRemaining:r.bonusSpinsAwarded});}
export function memoryStorage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
