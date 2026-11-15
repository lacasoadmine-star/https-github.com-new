// Additive research catalogue. Official product pages were checked on 2026-11-16.
// Public descriptions do NOT constitute observed in-game interaction or licensed rules.
const page = slug => `https://www.smartsoftgaming.com/games/${slug}`;
const entry = (id, name, family, slug, options = {}) => Object.freeze({
  id, name, family, officialPage: page(slug),
  reference: Object.freeze({page: 'verified', insideDemo: 'not-verified',
    financialMath: 'not-certified', artwork: 'original-only'}),
  productionEnabled: false, walletEnabled: false,
  ...options
});
export const games = Object.freeze([
  entry('popx','PopX','cascade','popx',{grid:[6,5],matchMinimum:8}),
  entry('mine_island2','Mine Island2','path','mine-island2',{theme:'kangaroo-islands'}),
  entry('jetx_new','New Era of JetX','crash','jetx',{maxLanes:4,theme:'jet'}),
  entry('balloonx','BalloonX','crash','balloonx',{maxLanes:4,theme:'inflating-balloon',demoAccess:'COUNTRY_BLOCKED observed on 2026-11-16'}),
  entry('plinko_x_classic','Plinko X Classic','plinko','plinko-x-classic',{ballFactors:[1,5,10],turbo:true}),
  entry('propel_x','Propel X','crash','propel-x',{maxLanes:2,theme:'fighter-plane'}),
  entry('world_champion_x','World Champion X','crash','world-champion-x',{maxLanes:1,theme:'football-striker',pressAndHold:true}),
  entry('chicken_ways','Chicken Ways','path','chicken-ways',{difficulty:['easy','medium','hard'],theme:'chicken'}),
  entry('dice_jungle','Dice Jungle','slot','dice-jungle',{grid:[5,3],theme:'animal-dice',topMultiplier:true}),
  entry('cai_balao_cappadocia','Cai Balao Cappadocia','hybrid','cai-balao-cappadocia',{modes:['slot','crash'],slotReels:3}),
  entry('carx','CarX','crash','carx',{maxLanes:1,theme:'racing-car',rangePrediction:true}),
  entry('jingle_bell_bonanza','Jingle Bell Bonanza','slot','jingle-bell-bonanza',{theme:'festive',expandingWilds:true}),
  entry('balloon','Balloon','crash','balloon',{maxLanes:1,theme:'balloon'}),
  entry('plinko_x','Plinko X','plinko','plinkox',{riskLevels:['low','medium','high']}),
  entry('helicopter_x','Helicopter X','crash','helicopter-x',{maxLanes:1,theme:'helicopter'}),
  entry('mine_island','Mine Island','mines','mine-island',{grid:[5,5],theme:'island-tiles'}),
  entry('football_x','Football X','crash','fotballx',{maxLanes:1,theme:'football-juggling'}),
  entry('cricket_x','Cricket X','crash','cricket-x',{maxLanes:1,theme:'cricket-ball'}),
  entry('cricketerx','CricketerX','crash','cricketerx',{maxLanes:1,theme:'cricket-player'}),
  entry('wheel_of_destiny','Wheel Of Destiny','wheel','wheel-of-destiny',{maxClaimedMultiplier:1200,theme:'destiny'}),
  entry('aviastar','AviaStar','crash','aviastar',{maxLanes:1,theme:'aviation'}),
  entry('smash_x','Smash X','crash','smash-x',{maxLanes:1,theme:'impact'}),
  entry('tower_x','Tower X','tower','tower-x',{theme:'building'}),
  entry('roll_x','Roll X','wheel','rollx',{maxClaimedMultiplier:30,theme:'rolling-wheel'}),
  entry('double_x','Double X','roulette','doublex',{theme:'roulette'}),
  entry('samurai','Samurai','slot','samurai-deluxe',{grid:[5,3],paylines:20,theme:'samurai',expandingWilds:true,freeSpins:true})
]);
export const gameById = Object.freeze(Object.fromEntries(games.map(g=>[g.id,g])));
export const gameFamilies = Object.freeze([...new Set(games.map(g=>g.family))]);
export function findGame(id) {return gameById[id] || null;}