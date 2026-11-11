import assert from'node:assert/strict';import{getGameDefinition}from'../../math/official72.mjs';import{createExistingLibrary74Adapter}from'../../server/existing-library74-adapter.mjs';import{coinsBaseTickets,fiveMajorGrid,coinsMaximumBase}from'./coins-atlantis-fixtures.mjs';
export function coinsPresentationFixture(kind='partial'){
 const id='ind74_official_coinsofatlantis',d=getGameDefinition(id),empty=n=>Array(n).fill(63);let tickets;
 if(kind==='partial'){const grid=fiveMajorGrid(d);grid[0][0]={kind:'mini'};grid[0][1]={kind:'regular',multiplier:15};tickets=[...coinsBaseTickets(d,grid),...empty(45)];}
 else if(kind==='reset')tickets=[...coinsBaseTickets(d,fiveMajorGrid(d)),...empty(30),10,11,...empty(14),0,0,...empty(13),...empty(13*4)];
 else if(kind==='full')tickets=coinsBaseTickets(d,Array.from({length:4},()=>Array.from({length:5},()=>({kind:'major'}))));
 else if(kind==='expanded')tickets=[...coinsBaseTickets(d,coinsMaximumBase(d)),...Array(15).fill(9)];
 else if(kind==='long'){tickets=[...coinsBaseTickets(d,fiveMajorGrid(d)),...empty(30),10,0,...empty(14)];for(let cells=14;cells>=1;cells--)tickets.push(...empty(cells*3),0,0,...empty(cells-1));}
 else throw Error('Unknown coin presentation fixture');
 let index=0;const random=()=>{assert(index<tickets.length);return tickets[index++]/2**53;};
 const adapter=createExistingLibrary74Adapter({reviewedGameIds:[id],allowNewRounds:true,gameLimits:{[id]:{maxBetMinor:'2000',maxWinMinor:'999999999999999'}}});const at=1700000000000,result=adapter.start(id,{stakeMinor:'100'},random,at);assert.equal(result.state.status,'settled');assert.equal(index,tickets.length);return{definition:adapter.definitions[id],round:adapter.publicState(result.state,at),modelVersion:d.mathVersion};
}
