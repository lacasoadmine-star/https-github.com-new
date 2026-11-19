// Expand only the uninterrupted run of the first reel's full animal.
// This chooses display animation columns; it never changes a settled grid.
export function expansionColumns(grid){
 if(!Array.isArray(grid)||grid.length!==3||grid.some(row=>!Array.isArray(row)||row.length!==3))return [];
 const symbol=grid[0][0];if(!['zebra','elephant','tiger'].includes(symbol))return [];
 const columns=[];
 for(let col=0;col<3;col++){
  if(!grid.every(row=>row[col]===symbol))break;
  columns.push({col,symbol});
 }
 return columns;
}
