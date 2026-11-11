// Fixed consumed server draws for public lifecycle tests; never a player input.
export const bookRegularBoard=()=>Array.from({length:24},(_,i)=>i%6+1);
export const bookBoardDraws=cells=>cells.map(cell=>cell==='B'?320:cell);
export function bookBonusFeatureFixture(){
  const base=bookRegularBoard();for(const position of [0,7,14,21])base[position]='B';
  const retrigger=bookRegularBoard();for(const position of [0,8,16])retrigger[position]='B';
  const expansion=bookRegularBoard();for(const position of [0,8,22])expansion[position]=0;
  return{betMinor:'2000',options:{},draws:[...bookBoardDraws(base),0,
    ...bookBoardDraws(retrigger),...bookBoardDraws(expansion),
    ...Array.from({length:18},()=>bookBoardDraws(bookRegularBoard())).flat()]};
}
