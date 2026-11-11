import assert from 'node:assert/strict';
import {createExistingLibrary74Adapter} from '../../server/existing-library74-adapter.mjs';
import {getGameDefinition} from '../../math/official72.mjs';
const gameId='ind74_official_poweroftiger';
export function tigerPresentationFixture(kind='partial'){
 const full=getGameDefinition(gameId),now=1700000000000;
 const base=Array.from({length:9},(_,index)=>index%8);
 let draws;
 if(kind==='partial')draws=[...base,0,0,3,0,8,0,63,63,63,63,63,63,0,0,63,63,63,63,63,63,63,63];
 else if(kind==='full'){
  const cells=[];for(let remaining=9;remaining>=1;remaining--)cells.push(remaining%2?0:8,...Array(remaining-1).fill(63));
  draws=[...base,0,0,3,...cells];
 }else if(kind==='base')draws=[...Array(9).fill(0),3,1];
 else throw Error('Unknown local presentation fixture');
 let index=0;
 const random=()=>{assert(index<draws.length,'Unexpected local fixture draw');return draws[index++]/2**53;};
 const adapter=createExistingLibrary74Adapter({reviewedGameIds:[gameId],allowNewRounds:true,gameLimits:{[gameId]:{maxBetMinor:'2000',maxWinMinor:'999999999999999'}}});
 const result=adapter.start(gameId,{stakeMinor:'100'},random,now);
 assert.equal(result.state.status,'settled');assert.equal(index,draws.length);
 return {definition:adapter.definitions[gameId],round:adapter.publicState(result.state,now),modelVersion:full.mathVersion};
}
