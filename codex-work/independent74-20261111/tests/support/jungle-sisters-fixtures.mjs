import {getGameDefinition} from '../../math/official72.mjs';
import {JUNGLE_SISTERS_ID,JUNGLE_SISTERS_DELUXE_ID} from '../../math/jungle-sisters.mjs';

export function jungleRegularBoard(){return Array.from({length:3},()=>[0,1,2,3,4]);}
export function jungleScatterBoard(count=7){
 const board=jungleRegularBoard(),positions=[];
 for(let row=0;row<3;row++)for(let col=1;col<=3;col++)positions.push([row,col]);
 for(const [row,col]of positions.slice(0,count))board[row][col]='S';
 return board;
}
export function jungleBoardDraws(d,board){
 const regular=d.symbols.length*d.jungleFeature.ticketWeights.regular;
 return board.flat().map(cell=>cell==='S'?regular+d.jungleFeature.ticketWeights.wild:cell==='W'?regular:cell);
}
export function jungleBoardIds(d,board){return board.map(row=>row.map(cell=>cell==='S'?d.scatterSymbol.id:cell==='W'?d.wildSymbol.id:d.symbols[cell].id));}
export function jungleFeatureFixture({deluxe=false,betMinor='2000',maximum=false}={}){
 const gameId=deluxe?JUNGLE_SISTERS_DELUXE_ID:JUNGLE_SISTERS_ID,d=getGameDefinition(gameId);
 const draws=[0,...jungleBoardDraws(d,jungleScatterBoard(7))];
 if(deluxe)draws.push(0,0,0,0,0); // five different values:1,2,3,4,5
 for(let index=0;index<(maximum?1:10);index++){
  let grid=jungleRegularBoard(),factor=0;
  if(maximum){grid=Array.from({length:3},()=>Array(5).fill(7));factor=deluxe?4:6;}
  else if(!deluxe&&index===0){grid=jungleScatterBoard(7);factor=6;}
  else if(index===(deluxe?0:1)){grid=Array.from({length:3},()=>[0,0,0,1,2]);factor=deluxe?4:5;}
  draws.push(factor,...jungleBoardDraws(d,grid));
 }
 return{gameId,betMinor,draws};
}
