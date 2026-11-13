import {createFiveReelModel} from './five-reel-model.mjs';
const engine=createFiveReelModel({
 id:'special74_multi_hot_10_v1',version:'operator-mh10-v1',rows:3,
 paytable:{seven:{3:50,4:200,5:1000},bell:{3:20,4:100,5:200},grape:{3:10,4:50,5:100},watermelon:{3:10,4:50,5:100},
  cherry:{3:5,4:10,5:50},orange:{3:5,4:10,5:50},plum:{3:5,4:10,5:50},lemon:{3:5,4:10,5:50}},
 // Zero-based rows, columns left to right; chart line numbers are index + 1.
 paylines:[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0]],
 multiplierWeights:[6775,10096,3454,6775,6775],betMinor:{min:10,max:20000,step:10},maxBaseWinTimesStake:5000,
 reference:{gameId:'002-multi-hot-10',page:'https://www.smartsoftgaming.com/games/multi-hot-10',
  rules:'reports/special74/batch-observations/all74-controls-retry-20261113/002-multi-hot-10/attempt-1/rules.json',
  lineChart:'workers/superwin-player/special74/assets/observed/static.ssg-public.com/cache/b16/GameLauncher/Content/Help/Images/MultiHot10/MultiHot-PayLine.png',
  lineChartSha256:'20b4e031596ed14df46b976bca8cdf4d83103bf35697834c1b4310d98b01077a',
  scope:'Observed public symbol pays and line paths only; no provider probability or maximum-win reproduction. Provider help displayed 1000x; independent model maximum is 5000x.'}
});
export const {model,validateBetMinor,multiplierForTicket,evaluate,spin,gamble}=engine;
