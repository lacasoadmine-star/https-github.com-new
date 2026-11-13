import {createFiveReelModel} from './five-reel-model.mjs';
const engine=createFiveReelModel({
 id:'special74_multi_hot_40_v1',version:'operator-mh40-v1',rows:4,
 paytable:{seven:{3:20,4:200,5:500},bell:{3:15,4:100,5:200},grape:{3:10,4:50,5:100},watermelon:{3:10,4:50,5:100},
  cherry:{3:5,4:10,5:50},orange:{3:5,4:10,5:50},plum:{3:5,4:10,5:50},lemon:{3:5,4:10,5:50}},
 // The forty distinct paths are transcribed from the pinned official help chart.
 paylines:[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[3,3,3,3,3],
  [1,0,0,0,1],[2,1,1,1,2],[3,2,2,2,3],[2,3,3,3,2],[1,2,2,2,1],[0,1,1,1,0],
  [0,1,0,1,0],[1,2,1,2,1],[2,3,2,3,2],[3,2,3,2,3],[2,1,2,1,2],[1,0,1,0,1],
  [0,0,1,0,0],[1,1,2,1,1],[2,2,3,2,2],[3,3,2,3,3],[2,2,1,2,2],[1,1,0,1,1],
  [1,0,0,0,0],[2,1,1,1,1],[3,2,2,2,2],[0,1,1,1,1],[1,2,2,2,2],[2,3,3,3,3],
  [0,0,1,1,1],[1,1,2,2,2],[2,2,3,3,3],[1,1,0,0,0],[2,2,1,1,1],[3,3,2,2,2],
  [0,0,0,1,1],[3,3,3,2,2],[0,0,0,0,1],[3,3,3,3,2],[0,1,2,1,0],[3,2,1,2,3]],
 multiplierWeights:[10475,10475,10475,36259,37066],betMinor:{min:40,max:10000,step:40},maxBaseWinTimesStake:2500,
 reference:{gameId:'003-multi-hot-40',page:'https://www.smartsoftgaming.com/games/multi-hot-40',
  rules:'reports/special74/reference-sessions/1794533507238/003-multi-hot-40/rules-bet-decrease-text.json',
  lineChart:'workers/superwin-player/special74/assets/observed/static.ssg-public.com/cache/b16/GameLauncher/Content/Help/Images/MultiHot40/MultiHot-PayLine.png',
  lineChartSha256:'2a4b17a7377279ca0241ddd2087c80040d1084796d809d23373faa71371f5c9b',
  scope:'Observed public symbol pays and line paths only; no provider probability reproduction.'}
});
export const {model,validateBetMinor,multiplierForTicket,evaluate,spin,gamble}=engine;
