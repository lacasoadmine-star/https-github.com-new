import {fruitArt} from './fruit-art.mjs';

// Explicit original presentation choices for every unprotected official title.
// A profile does not assert that its artwork or mechanics match the provider.
const PROFILE_ROWS = [
  ['popx','#241044','#fa66bc','#c6a2ff','neon','bubble'],
  ['mineisland2','#063b46','#72e4cf','#e4d698','ocean','island'],
  ['neweraofjetx','#101f39','#ffb355','#8ae7ff','sky','plane'],
  ['balloonx','#251a48','#f96fae','#9ac6ff','sky','balloon'],
  ['plinkoxclassic','#211346','#ff6ba8','#ae7aff','neon','orb'],
  ['propelx','#092a43','#56dcf8','#c2f5ff','space','rocket'],
  ['worldchampionx','#113c30','#b6ee69','#f0ce72','stadium','trophy'],
  ['poweroftiger','#342615','#ffc44f','#f9de8b','jungle','tiger'],
  ['multifruitschargingwilds','#154228','#cbef68','#f6c458','orchard','fruit'],
  ['gemscrownchargingwilds','#291148','#bf79ff','#f0ce6f','palace','crown'],
  ['gatesofmerlyn','#142346','#73cfff','#e7c17d','castle','star'],
  ['chickenways','#31441c','#ebcf78','#fff2c4','farm','chicken'],
  ['dicejungle','#19391f','#b4e67c','#dbb465','jungle','dice'],
  ['multihot5wild','#103f26','#caef67','#f3cd6a','orchard','star'],
  ['cheesyroad','#3d3023','#ffcc68','#fae3a5','road','mouse'],
  ['fortunecatch','#103a49','#5ae5d4','#f1ce6d','ocean','fish'],
  ['multihot20','#163a24','#a8ec66','#e5bf5c','orchard','fruit'],
  ['cheesyroadclassic','#3c2630','#edbf69','#d8b98c','road','mouse'],
  ['multihot10','#16422d','#a3ed87','#d9bb6a','orchard','fruit'],
  ['multihot40','#0b3922','#9ede5d','#f3d47e','orchard','fruit'],
  ['coinsofatlantis','#0a3247','#6bdedb','#e4c37b','temple','coin'],
  ['multihot100','#0c3420','#a5e976','#efd76f','orchard','fruit'],
  ['multihotwildways','#193820','#c8ed76','#d1b36f','orchard','star'],
  ['bottlemania','#233e4c','#96d8e4','#f7b47b','city','bottle'],
  ['multihot5burnwilds','#3a241a','#ffb461','#dfbd62','fire','flame'],
  ['chickenhighway','#283644','#c3f36e','#f2cd83','road','chicken'],
  ['multihot5deluxe','#102d28','#c3e99e','#f3d398','palace','fruit'],
  ['carx','#222331','#fd675f','#c1dbf5','road','car'],
  ['caibalaocappadocia','#503127','#f9b388','#ffe4a8','canyon','balloon'],
  ['multihotwheel','#113d24','#aff36d','#edce79','orchard','fruit'],
  ['jinglebellbonanza','#1e3441','#a6e6ef','#f6d47d','snow','bell'],
  ['multihot5superwilds','#163521','#c8f079','#f0c861','palace','star'],
  ['balloon','#253d54','#e5a3e7','#f6d883','sky','balloon'],
  ['plinkox','#193447','#6dd9ef','#87a9ff','neon','orb'],
  ['helicopterx','#142d40','#66d6e0','#d4e4a3','sky','helicopter'],
  ['safarisimba','#433514','#d7e267','#f5c77c','savanna','lion'],
  ['mineisland','#103e3b','#79e3bb','#dec98c','ocean','island'],
  ['multihotways','#15372f','#9ef4ba','#d9c080','orchard','fruit'],
  ['footballx','#123925','#a3ec87','#f2e6c4','stadium','football'],
  ['burningice40','#192b4b','#6cdfef','#ffba6f','ice','flame'],
  ['mariachicoins','#4a2030','#faab79','#efca68','festival','guitar'],
  ['habeshafortune5','#26351d','#cde88b','#e5c266','temple','sun'],
  ['4bonusesbonanza','#311b4e','#cc9eff','#f7cf77','neon','gem'],
  ['cricketx','#163630','#91e4b2','#e4cf97','stadium','cricket'],
  ['burningice','#152b47','#77d7ff','#efa85e','ice','flame'],
  ['cricketerx','#233f2c','#c6ed84','#fcdec0','stadium','cricket'],
  ['wheelofdestiny','#30214e','#b89df9','#e7ce87','palace','star'],
  ['wildmultistars','#2d164e','#d893ff','#f1d586','space','star'],
  ['crashduel','#23294a','#91a4ff','#ff986d','space','duel'],
  ['geniesbonanza','#22305a','#ab9cff','#f1cb74','palace','lamp'],
  ['bonustime','#3b2337','#ee92ce','#efd38c','festival','clock'],
  ['farmsfortune','#2a3f20','#d1ec98','#f5cb7e','farm','leaf'],
  ['madslot','#30213f','#f496f4','#9de8e8','neon','gem'],
  ['aviastar','#1b2543','#8ebaff','#f5b780','space','plane'],
  ['smashx','#331e2c','#ff7f7a','#f6cd80','city','hammer'],
  ['towerx','#263441','#9eceec','#e9cf8e','castle','tower'],
  ['hotsamba','#3d2344','#ed9fca','#e6cf76','festival','feather'],
  ['wildsandgods','#243046','#91cef6','#dfc879','temple','lightning'],
  ['baoslot5x','#331d2e','#eb8f98','#efd481','lantern','coin'],
  ['junglesisters','#143a2d','#83dfb1','#e4ca82','jungle','leaf'],
  ['bokajamba10','#392c22','#e7c879','#c3e78c','savanna','sun'],
  ['junglesistersdeluxe','#14312a','#8fe5ca','#f0d393','jungle','flower'],
  ['dragonscode','#322338','#e9a1c5','#dfcc8a','lantern','dragon'],
  ['draculasfortune','#2e1532','#d59adf','#e8bc80','crypt','bat'],
  ['bookoffuturia','#182a49','#98d9ff','#edce96','space','book'],
  ['bookofbonanza','#3c2e26','#e0b989','#f2d490','temple','book'],
  ['sugarfiesta','#482b4b','#ffa6d3','#c4eff5','candy','candy'],
  ['vampires','#301b3e','#bba1ec','#e7a9aa','crypt','bat'],
  ['burningice10','#1c3043','#93dfef','#ffbe86','ice','flame'],
  ['rollx','#242727','#58ba4b','#d8e1d4','neon','dice'],
  ['doublex','#342641','#d3a8f2','#f4cd86','neon','gem'],
  ['samurai','#3a222b','#efa0a2','#efd18c','lantern','blade'],
];
export const MACHINE_PROFILES = Object.freeze(Object.fromEntries(PROFILE_ROWS.map(([id,background,accent,trim,scene,motif]) => ['ind74_official_' + id,Object.freeze({id:'ind74_official_' + id,background,accent,trim,scene,motif,artwork:'original-code',referenceParityVerified:false,mechanicsSource:'public-definition'})])));
const FAMILIES = new Set(['slots','crash','ladder','mines','plinko','wheel','dice']);
const handles = new WeakMap();
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const multiplier = value => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? (Number(value) / 10000).toFixed(2) + '×' : '—';
const settled = round => !!round && !['active','pending'].includes(round.status);
const historyOf = round => Array.isArray(round?.history) ? round.history : Array.isArray(round?.path) ? round.path : [];
const allowed = (round, action) => round?.status === 'active' && Array.isArray(round.allowedActions) && round.allowedActions.includes(action);
const isCascade = definition => definition?.family === 'crash' && definition.crashMechanic === 'cascade';
const symbolsOf = definition => {
  const symbols = [...(definition.symbols || [])];
  for(const symbol of [definition.wildSymbol,definition.coinSymbol,definition.plusRespinSymbol])if(symbol?.id&&!symbols.some(item=>item.id===symbol.id))symbols.push(symbol);
  return symbols;
};
const coinKey=coin=>coin.row+':'+coin.col;
function publicCoins(definition,coins){
  const {rows,columns}=machineGeometry(definition),seen=new Map(),feature=definition.coinFeature;
  if(!Array.isArray(coins)||coins.length>rows*columns)throw new TypeError('Public coin positions are required.');
  for(const coin of coins){
    const prizes=coin?.kind==='mini'?[feature.miniValue]:coin?.kind==='major'?[feature.majorValue]:feature.regularValues;
    if(!coin||!integer(coin.row,0,rows-1)||!integer(coin.col,0,columns-1)||!['regular','mini','major','plus-one'].includes(coin.kind)||!prizes.includes(coin.multiplier)||seen.has(coinKey(coin)))throw new TypeError('A matching public coin value is required.');
    seen.set(coinKey(coin),coin);
  }
  return seen;
}

export function presentationProfile(definition) {
  const profile = MACHINE_PROFILES[definition?.id];
  if (!profile || !FAMILIES.has(definition.family)) throw new TypeError('This machine has no registered presentation.');
  return profile;
}
export function machineGeometry(definition) {
  presentationProfile(definition);
  if (isCascade(definition)) {
    const rows=definition.layout?.rows??definition.rows,columns=definition.layout?.columns??definition.cols;
    if(!integer(rows,1,8)||!integer(columns,1,8)||!Array.isArray(definition.symbols)||!definition.symbols.length)throw new TypeError('Published cascade geometry and symbols are required.');
    if(definition.rows!==undefined&&definition.rows!==rows||definition.cols!==undefined&&definition.cols!==columns)throw new TypeError('Published layout and cascade geometry must agree.');
    return {rows,columns,cascade:true};
  }
  if (definition.family === 'slots') {
    const rows = definition.layout?.rows ?? definition.rows, columns = definition.layout?.columns ?? definition.columns ?? definition.cols ?? definition.paylines?.[0]?.length;
    if (definition.rows !== undefined && definition.rows !== rows || (definition.columns ?? definition.cols) !== undefined && (definition.columns ?? definition.cols) !== columns) throw new TypeError('Published layout and reel geometry must agree.');
    if (!integer(rows,1,8) || !integer(columns,1,8) || !Array.isArray(definition.symbols) || !definition.symbols.length) throw new TypeError('Published reel geometry and symbols are required.');
    return {rows,columns};
  }
  if (definition.family === 'plinko') {
    if (!integer(definition.rows,3,20) || definition.bucketMultipliersBps?.length !== definition.rows + 1) throw new TypeError('Published Plinko geometry is required.');
    return {rows:definition.rows,columns:definition.rows + 1};
  }
  if (definition.family === 'mines') {
    const rows = definition.rows, columns = definition.cols ?? definition.columns;
    if (!integer(rows,1,10) || !integer(columns,1,10) || definition.cells !== rows * columns) throw new TypeError('Published mine-board geometry is required.');
    return {rows,columns,cells:definition.cells};
  }
  if (definition.family === 'ladder') {
    const steps = definition.maxSteps ?? definition.multipliersBps?.length;
    if (!integer(steps,1,40)) throw new TypeError('Published step geometry is required.');
    return {steps};
  }
  if (definition.family === 'wheel') {
    if (!Array.isArray(definition.sectors) || !integer(definition.sectors.length,2,32)) throw new TypeError('Published wheel sectors are required.');
    return {sectors:definition.sectors.length};
  }
  return {};
}
function assertRound(definition, round) {
  if (!round) return;
  const id = round.gameId ?? round.game_id;
  if (id && id !== definition.id) throw new TypeError('The server result belongs to another machine.');
  if (definition.family === 'slots' || isCascade(definition)) {
    const {rows,columns} = machineGeometry(definition), grid = round.outcome?.grid ?? round.grid;
    const ids = new Set(symbolsOf(definition).map(symbol => symbol.id));
    if (!Array.isArray(grid) || grid.length !== rows || grid.some(row => !Array.isArray(row) || row.length !== columns || row.some(id => !ids.has(id)))) throw new TypeError('A matching server reel grid is required.');
    if(definition.respinFeature){
      const frames=round.outcome?.bonusFrames;
      if(!Array.isArray(frames)||frames.length>definition.respinFeature.maximumFrames)throw new TypeError('Completed server respin frames are required.');
      let previous=Array.from({length:rows},()=>Array(columns).fill(null)),locks=0;
      for(const [index,frame]of frames.entries()){
        if(!Array.isArray(frame.grid)||frame.grid.length!==rows||frame.grid.some((row,r)=>!Array.isArray(row)||row.length!==columns||row.some((id,c)=>id!==null&&!ids.has(id)||previous[r][c]!==null&&id!==previous[r][c])))throw new TypeError('A matching locked server respin grid is required.');
        const count=frame.grid.flat().filter(id=>id!==null).length;
        if(frame.index!==index+1||frame.lockedCells!==count||frame.newLocks!==count-locks||typeof frame.terminal!=='boolean'||![1,...definition.respinFeature.values].includes(frame.multiplierApplied))throw new TypeError('The server respin frame is incomplete.');
        previous=frame.grid;locks=count;
      }
    }
    if(definition.coinFeature){
      const outcome=round.outcome,frames=outcome?.bonusFrames,feature=definition.coinFeature;
      if(outcome?.featureType!=='coin-respin'||!Array.isArray(frames)||frames.length>feature.maximumFrames)throw new TypeError('Completed server coin-respin frames are required.');
      let previous=publicCoins(definition,outcome.coinValues),remaining=feature.initialRespins,reset=feature.initialRespins;
      for(const [index,frame]of frames.entries()){
        const coins=publicCoins(definition,frame.coinValues),added=[...coins.values()].filter(coin=>!previous.has(coinKey(coin)));
        if([...previous].some(([key,coin])=>coins.get(key)?.kind!==coin.kind||coins.get(key)?.multiplier!==coin.multiplier))throw new TypeError('A locked public coin changed.');
        if(added.some(coin=>coin.kind==='plus-one'))reset=feature.plusOneResetLimit;
        remaining=added.length?reset:remaining-1;
        const full=coins.size===rows*columns;
        if(!Array.isArray(frame.grid)||frame.grid.length!==rows||frame.grid.some((row,r)=>!Array.isArray(row)||row.length!==columns||row.some((id,c)=>{const coin=coins.get(r+':'+c);return id!==(coin?(coin.kind==='plus-one'?definition.plusRespinSymbol.id:definition.coinSymbol.id):null);})))throw new TypeError('A matching nullable coin grid is required.');
        if(frame.index!==index+1||frame.lockedCells!==coins.size||frame.newCoins!==added.length||frame.resetLimit!==reset||frame.respinsRemaining!==remaining||remaining<0||frame.terminal!==(full||remaining===0)||frame.multiplierApplied!==(full?feature.fullBoardMultiplier:1)||frame.terminal&&index!==frames.length-1)throw new TypeError('The public coin-respin counter is inconsistent.');
        previous=coins;
      }
      const final=publicCoins(definition,outcome.finalCoinValues);
      if(final.size!==previous.size||[...previous].some(([key,coin])=>final.get(key)?.kind!==coin.kind||final.get(key)?.multiplier!==coin.multiplier))throw new TypeError('The final public coin board changed.');
    }
  }
  if (definition.family === 'plinko') {
    const outcome = round.outcome;
    if (!outcome || !Array.isArray(outcome.path) || outcome.path.length !== definition.rows || outcome.path.some(bit => bit !== 0 && bit !== 1) || !integer(outcome.bucket,0,definition.rows) || outcome.path.reduce((total,bit) => total + bit,0) !== outcome.bucket) throw new TypeError('A matching server Plinko path is required.');
  }
  if (definition.family === 'wheel' && !definition.sectors.some(sector => sector.id === round.outcome?.sector)) throw new TypeError('A matching server wheel sector is required.');
  if (definition.family === 'dice' && (!integer(round.outcome?.roll,0,99) || !integer(round.outcome?.target,definition.minTarget,definition.maxTarget))) throw new TypeError('A matching server dice result is required.');
}
const svg = (body, className = '', viewBox = '0 0 100 100') => '<svg class="m74-art ' + className + '" viewBox="' + viewBox + '" aria-hidden="true">' + body + '</svg>';
function icon(kind) {
  const line = 'fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
  const shapes = {
    plane:'<path d="M8 52 40 43 55 9 67 9 61 43 89 55 89 63 60 57 62 81 72 89 71 94 50 87 32 92 30 87 41 78 39 57 9 61Z" fill="currentColor"/><path d="M48 43 51 18M48 58 49 76" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>',
    balloon:'<path d="M17 35C17-2 83-2 83 35Q80 57 61 73H39Q20 57 17 35" fill="currentColor"/><path d="M50 8C29 17 33 49 43 70M50 8C71 17 67 49 57 70" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M38 74 43 86M62 74 57 86M42 87H58L56 96H44Z" fill="#d3ab6d" stroke="#edd9a9" stroke-width="2"/>',
    rocket:'<path d="M50 5Q73 26 66 62L54 78H46L34 62Q27 26 50 5" fill="currentColor"/><path d="M34 45 20 67 21 82 39 68M66 45 80 67 79 82 61 68" fill="currentColor"/><circle cx="50" cy="36" r="9" fill="#14364a" stroke="#fff" stroke-width="3"/><path d="M42 77 50 98 58 77" fill="#ffba66"/>',
    car:'<path d="M13 57 21 35 36 25H66L80 42 88 55V76H12Z" fill="currentColor"/><path d="M29 39 38 31H61L70 42H26Z" fill="#193c48"/><rect x="22" y="52" width="55" height="11" rx="5" fill="#fff" opacity=".2"/><circle cx="26" cy="77" r="10" fill="#141923" stroke="#d2e0e8" stroke-width="3"/><circle cx="75" cy="77" r="10" fill="#141923" stroke="#d2e0e8" stroke-width="3"/>',
    helicopter:'<path d="M26 45Q27 28 54 30Q76 32 84 54L74 64H27L20 55 6 53 3 39 15 39 20 48Z" fill="currentColor"/><path d="M54 32 56 56H77Q70 37 54 32" fill="#163e4c"/><path d="M48 29V16M15 16H85M31 64V77M65 64V77M20 78H79" '+line+'/>',
    football:'<circle cx="50" cy="50" r="37" fill="#f4f5e9" stroke="#516c5e" stroke-width="3"/><path d="M50 28 65 39 60 57H40L35 39ZM21 29 35 22 38 35 26 45 15 40M79 29 65 22 62 35 74 45 85 40M21 72 36 69 45 84 33 85M79 72 64 69 55 84 67 85" fill="#203c32"/>',
    cricket:'<path d="M65 11 77 19 52 55 38 47Z" fill="#d4a760" stroke="#f0d19b" stroke-width="3"/><path d="M38 45 56 57 35 88 21 78Z" fill="#ead19b"/><circle cx="73" cy="76" r="12" fill="#e6b785"/><path d="M67 66 78 85" stroke="#fff3d8" stroke-width="2"/>',
    trophy:'<path d="M28 17H72V43Q68 60 50 64Q32 60 28 43Z" fill="currentColor"/><path d="M29 24H14Q10 51 35 49M71 24H86Q90 51 65 49M50 64V82M33 85H67" '+line+'/><path d="M40 27 50 43 60 27" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3"/>',
    chicken:'<path d="M22 63Q16 38 37 31Q35 15 49 18Q52 8 60 17Q72 12 74 26L85 31 75 36Q89 58 68 72H35Z" fill="currentColor"/><path d="M29 53Q44 42 54 55Q51 69 34 63" fill="#fff" opacity=".4"/><circle cx="65" cy="28" r="3" fill="#142b28"/><path d="M42 72V87H31M62 71V86H74" stroke="#f5bd66" stroke-width="4"/>',
    mouse:'<circle cx="29" cy="26" r="16" fill="currentColor"/><circle cx="65" cy="23" r="16" fill="currentColor"/><path d="M23 43Q43 18 69 40L87 66Q57 86 30 67Z" fill="currentColor"/><circle cx="58" cy="48" r="4" fill="#18332a"/><circle cx="85" cy="65" r="6" fill="#f8b8b1"/><path d="M28 62Q1 65 12 87Q22 99 33 90" '+line+'/>',
    bottle:'<path d="M40 9H60V30Q76 40 75 56V89H25V56Q24 40 40 30Z" fill="currentColor"/><rect x="36" y="7" width="28" height="9" rx="3" fill="#e5ca87"/><path d="M32 55H68V75H32Z" fill="#fff" opacity=".35"/><path d="M36 37Q30 44 32 51" '+line+'/>',
    hammer:'<path d="M45 39 58 44 37 93 24 87Z" fill="#edc58c"/><path d="M19 15 44 4 85 38 67 61 26 40Z" fill="currentColor"/><path d="M25 19 63 49" stroke="#fff" stroke-opacity=".4" stroke-width="4"/>',
    book:'<path d="M8 22Q27 12 50 26Q73 12 92 22V82Q70 72 50 85Q30 72 8 82Z" fill="currentColor" stroke="#edcd83" stroke-width="3"/><path d="M50 27V81M16 33Q29 28 41 36M59 36Q74 28 84 33M16 44Q29 39 41 47M59 47Q74 39 84 44" fill="none" stroke="#fff" stroke-opacity=".65" stroke-width="3"/>',
    bat:'<path d="M8 27 33 39 39 24 49 34 61 24 67 39 92 27 85 58 69 53 62 72 50 61 38 72 31 53 15 58Z" fill="currentColor"/><circle cx="45" cy="42" r="2" fill="#ffdd8c"/><circle cx="55" cy="42" r="2" fill="#ffdd8c"/>',
    blade:'<path d="M71 7 81 12 47 72 36 65Z" fill="#d8eef3" stroke="currentColor" stroke-width="3"/><path d="M28 60 55 77M36 72 23 93" '+line+'/>',
    dice:'<rect x="16" y="15" width="68" height="68" rx="15" fill="currentColor"/><g fill="#203d40"><circle cx="33" cy="32" r="5"/><circle cx="65" cy="32" r="5"/><circle cx="49" cy="49" r="5"/><circle cx="33" cy="66" r="5"/><circle cx="65" cy="66" r="5"/></g>',
    star:'<path d="M50 6 61 36 94 37 68 58 77 91 50 72 23 91 32 58 6 37 39 36Z" fill="currentColor"/><path d="M50 6V55L23 91M50 55 94 37M50 55 6 37M50 55 77 91" stroke="#fff" stroke-opacity=".3" stroke-width="3"/>',
    crown:'<path d="M13 30 33 44 50 15 67 44 87 30 78 78H22Z" fill="currentColor" stroke="#fff2b7" stroke-width="3"/><path d="M23 66H77" stroke="#a06d33" stroke-width="6"/><circle cx="50" cy="50" r="7" fill="#d44d6a"/>',
    leaf:'<path d="M13 75Q2 15 83 13Q92 79 13 75" fill="currentColor"/><path d="M16 77 73 24M39 51 36 27M39 51 65 55M56 36 57 23" stroke="#fff" stroke-opacity=".5" stroke-width="4" fill="none"/>',
    sun:'<circle cx="50" cy="50" r="23" fill="currentColor"/><path d="M50 6V16M50 84V94M6 50H16M84 50H94M19 19 27 27M73 73 81 81M19 81 27 73M73 27 81 19" '+line+'/>',
    gem:'<path d="M26 12H74L94 42 50 94 6 42Z" fill="currentColor" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M26 12 32 42 50 94 68 42 74 12M6 42H94M32 42 50 12 68 42" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3"/>',
    coin:'<circle cx="50" cy="50" r="37" fill="currentColor" stroke="#f6dd9c" stroke-width="4"/><circle cx="50" cy="50" r="27" fill="none" stroke="#825e26" stroke-opacity=".6" stroke-width="3"/><path d="M50 28 65 50 50 72 35 50Z" fill="#fff3bb" opacity=".8"/>',
    flame:'<path d="M53 6Q64 35 49 44Q69 42 73 29Q104 75 64 92Q24 110 13 75Q10 51 31 36Q25 62 40 63Q22 35 53 6Z" fill="currentColor"/><path d="M51 49Q70 77 52 91Q29 91 35 73Z" fill="#ffe3a1"/>',
    lightning:'<path d="M55 4 16 57H43L32 96 84 36H56L69 4Z" fill="currentColor"/>',
    tower:'<path d="M18 92V33H12V10H28V21H42V10H58V21H72V10H88V33H82V92Z" fill="currentColor"/><path d="M42 92V66Q50 53 58 66V92M29 44H35M65 44H71" fill="#142b31"/>',
    fish:'<path d="M17 50 5 28 35 36Q63 9 91 50Q63 91 35 64L5 72Z" fill="currentColor"/><circle cx="73" cy="43" r="4" fill="#102f39"/><path d="M59 31Q49 50 59 69" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>',
    clock:'<circle cx="50" cy="50" r="36" fill="currentColor"/><circle cx="50" cy="50" r="28" fill="#183238"/><path d="M50 28V50L66 60" stroke="#f1d591" stroke-width="5" fill="none" stroke-linecap="round"/>',
    lamp:'<path d="M14 59Q35 45 74 53L94 42Q93 69 69 70H25Q13 67 14 59M43 47V39H61V48M42 73 36 88H68L62 73" fill="currentColor"/><path d="M20 54Q2 31 6 56Q9 67 17 64" fill="none" stroke="currentColor" stroke-width="5"/>',
    flower:'<g fill="currentColor"><ellipse cx="50" cy="27" rx="14" ry="23"/><ellipse cx="50" cy="73" rx="14" ry="23"/><ellipse cx="27" cy="50" rx="23" ry="14"/><ellipse cx="73" cy="50" rx="23" ry="14"/></g><circle cx="50" cy="50" r="15" fill="#f8d578"/>',
    candy:'<path d="M29 39 9 27 7 65 28 60M71 39 91 27 93 65 72 60" fill="currentColor"/><rect x="24" y="28" width="52" height="48" rx="17" fill="currentColor" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><path d="M37 32 55 72M51 31 67 66" stroke="#fff" stroke-opacity=".6" stroke-width="8"/>',
    bubble:'<circle cx="50" cy="50" r="35" fill="currentColor" fill-opacity=".45" stroke="currentColor" stroke-width="5"/><path d="M26 42Q30 23 49 22" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/>',
  };
  if (kind === 'duel') return svg('<g transform="translate(0 0) scale(.7)">' + shapes.plane + '</g><g transform="translate(33 28) scale(.65)">' + shapes.plane + '</g>');
  if (['tiger','lion','dragon'].includes(kind)) return svg('<path d="M19 21 34 29 50 22 66 29 81 21 85 53 69 78 50 92 31 78 15 53Z" fill="currentColor"/><path d="M28 48 42 53M58 53 72 48M45 62 50 68 55 62M50 68V78M29 33 38 41M71 33 62 41" '+line+' stroke="#2b261e"/><path d="M38 78Q50 84 62 78" fill="none" stroke="#fff1ca" stroke-width="4"/>');
  if (kind === 'island') return svg('<ellipse cx="50" cy="71" rx="43" ry="18" fill="#d7ca8b"/><ellipse cx="50" cy="66" rx="32" ry="15" fill="#6db67d"/><path d="M55 65 61 24" stroke="#ab905b" stroke-width="5"/><path d="M61 26Q26 7 30 35Q46 26 61 28Q73 0 90 22Q72 21 61 29Q89 24 87 48Q73 34 61 30" fill="currentColor"/>');
  if (kind === 'fruit') return fruitArt('cherry', shapes.coin);
  if (kind === 'orb') return svg(shapes.bubble);
  if (kind === 'guitar') return svg('<path d="M57 37Q78 45 66 62Q80 82 57 92Q33 100 25 79Q20 60 40 51Q35 31 57 37" fill="currentColor"/><circle cx="49" cy="64" r="10" fill="#4b2933"/><path d="M54 48 72 10M49 83 73 11" stroke="#e9cc8e" stroke-width="5"/>');
  if (kind === 'feather') return svg('<path d="M17 84Q-2 26 74 7Q103 49 17 84" fill="currentColor"/><path d="M12 93 66 23M31 63 28 39M31 63 57 58M46 46 46 27" '+line+'/>');
  return svg(shapes[kind] || shapes.gem);
}

function symbolArt(symbol, profile) {
  const name = (symbol?.art ?? symbol?.id ?? '') + ' ' + (symbol?.label ?? '');
  const lower = name.toLowerCase();
  if (/dollar|\$\$/.test(lower)) return svg('<text x="50" y="72" text-anchor="middle" font-size="62" font-weight="900" font-family="Georgia,serif" fill="#ffd66d" stroke="#a77825" stroke-width="2">$$</text>');
  if (/double.?seven|77/.test(lower)) return svg('<text x="50" y="76" text-anchor="middle" font-size="69" font-style="italic" font-weight="900" font-family="Georgia,serif" fill="#e6464a" stroke="#f4d375" stroke-width="3">77</text>');
  for (const fruit of ['watermelon','cherry','grape','orange','lemon','plum','seven','bell']) if (lower.includes(fruit)) return fruitArt(fruit, icon('gem'));
  if (/\bwild\b/.test(lower)) return '<div class="m74-wild">' + icon(profile.motif) + '<b>WILD</b></div>';
  if (/scatter/.test(lower)) return '<div class="m74-wild">' + icon('star') + '<b>SCATTER</b></div>';
  for (const kind of ['crown','leaf','sun','star','coin','book','flame','tiger','lion','dragon','flower']) if (lower.includes(kind)) return icon(kind);
  if (/pearl|orb/.test(lower)) return icon('bubble');
  if (/lantern/.test(lower)) return svg('<path d="M32 17H68V27Q92 51 68 75V85H32V75Q8 51 32 27Z" fill="currentColor"/><path d="M32 28H68M32 74H68M50 27V75M42 87 39 97M58 87 61 97" stroke="#f5da92" stroke-width="4"/>');
  return icon('gem');
}
function scenery(profile) {
  const stars = [[45,38],[112,77],[190,22],[268,61],[355,26],[429,75],[515,39],[577,94]].map(([x,y],i) => '<circle cx="'+x+'" cy="'+y+'" r="'+(i%3+1)+'"/>').join('');
  const leaf = '<path d="M0 210Q24 40 104 2Q124 110 0 210M600 210Q576 40 496 2Q476 110 600 210"/>';
  const scene = {
    ocean:'<path d="M0 80Q75 45 150 80T300 80T450 80T600 80M0 125Q75 90 150 125T300 125T450 125T600 125M0 170Q75 135 150 170T300 170T450 170T600 170" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="495" cy="35" r="26"/>',
    sky:'<path d="M10 95Q10 60 44 60Q54 26 87 55Q122 51 127 95ZM385 152Q382 112 422 110Q442 70 471 107Q515 98 532 152Z"/>',
    space:stars+'<circle cx="502" cy="45" r="35" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="502" cy="45" rx="58" ry="11" fill="none" stroke="currentColor" stroke-width="3" transform="rotate(-25 502 45)"/>',
    neon:'<path d="M0 210 170 0M600 210 430 0M0 145H600M0 95H600M0 55H600" fill="none" stroke="currentColor" stroke-width="2"/>'+stars,
    jungle:leaf+'<path d="M25 0Q90 70 20 135M575 0Q510 70 580 135" fill="none" stroke="currentColor" stroke-width="5"/>',
    orchard:leaf+'<circle cx="88" cy="156" r="25"/><circle cx="520" cy="145" r="30"/>',
    palace:'<path d="M0 210V20H34V210M566 210V20H600V210M44 30Q300-30 556 30M55 40Q300-3 545 40" fill="none" stroke="currentColor" stroke-width="7"/>',
    castle:'<path d="M8 210V75H3V43H20V56H37V43H54V75H48V210M552 210V75H546V43H563V56H580V43H597V75H592V210M78 210V108L111 71 144 108V210M455 210V108L488 71 521 108V210"/>',
    farm:'<path d="M0 182 95 113 190 182V210H0M26 165V116L95 71 164 116V165M433 210V108H444V210M507 210V108H518V210M402 143H546M402 180H546" fill="none" stroke="currentColor" stroke-width="9"/><circle cx="500" cy="37" r="28"/>',
    road:'<path d="M169 210 258 0H342L431 210Z"/><path d="M300 0V210" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="5" stroke-dasharray="18 20"/>',
    stadium:'<ellipse cx="300" cy="135" rx="276" ry="90" fill="none" stroke="currentColor" stroke-width="5"/><path d="M25 130H575M300 48V210M20 0V80M580 0V80M0 20H68M532 20H600" fill="none" stroke="currentColor" stroke-width="5"/>',
    temple:'<path d="M12 20H70M20 32H62V210M530 20H588M538 32H580V210M80 30 300-10 520 30" fill="none" stroke="currentColor" stroke-width="9"/>',
    fire:'<path d="M0 210Q-7 148 46 91Q23 172 67 180Q43 117 99 69Q95 142 127 210ZM600 210Q607 148 554 91Q577 172 533 180Q557 117 501 69Q505 142 473 210Z"/>',
    city:'<path d="M0 210V95H40V43H83V210M94 210V118H143V210M455 210V96H495V210M514 210V33H558V106H600V210"/>',
    canyon:'<path d="M0 210 24 110 47 161 81 46 112 148 145 210M455 210 488 148 519 46 553 161 576 110 600 210Z"/>',
    snow:stars+'<path d="M58 18V100M24 39 92 79M24 79 92 39M532 60V142M498 81 566 121M498 121 566 81" fill="none" stroke="currentColor" stroke-width="4"/>',
    savanna:'<circle cx="504" cy="52" r="40"/><path d="M49 210 55 142Q-15 132 20 113Q50 91 90 113Q130 131 64 144L70 210M550 210 545 171Q489 164 515 148Q547 133 578 150Q604 168 555 172Z"/>',
    ice:'<path d="M0 210 8 87 37 129 63 26 92 148 116 210M484 210 508 148 537 26 563 129 592 87 600 210Z" fill="none" stroke="currentColor" stroke-width="3"/>',
    festival:'<path d="M0 12Q300 82 600 12" fill="none" stroke="currentColor" stroke-width="3"/><path d="M38 24 68 65 96 32M146 44 174 89 203 50M260 56 290 102 321 57M375 52 403 94 430 45M487 34 514 76 542 25"/>',
    lantern:'<path d="M66 0V29M534 0V29" stroke="currentColor" stroke-width="3"/><path d="M45 30H87Q111 70 87 110H45Q21 70 45 30M513 30H555Q579 70 555 110H513Q489 70 513 30"/><path d="M66 112V142M534 112V142" stroke="currentColor" stroke-width="4"/>',
    crypt:'<circle cx="480" cy="50" r="30"/><path d="M13 210V141Q35 106 57 141V210M68 210V178Q88 145 108 178V210M485 210V177Q505 140 525 177V210M544 210V141Q566 106 588 141V210"/>',
    candy:'<circle cx="65" cy="75" r="35"/><path d="M65 110V210M535 108V210" stroke="currentColor" stroke-width="7"/><circle cx="535" cy="73" r="35"/><path d="M42 51 87 98M511 49 557 97" stroke="#fff" stroke-opacity=".5" stroke-width="11"/>',
  }[profile.scene] || stars;
  return '<svg class="m74-scenery" viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true"><g fill="currentColor">'+scene+'</g></svg>';
}

export function minorText(value) {
  if (!/^\d{1,24}$/.test(String(value))) return '—';
  const text = String(value).padStart(3,'0');
  return text.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + text.slice(-2);
}
export function presentationTier(round) {
  const win = round?.winMinor ?? round?.payoutMinor;
  if (!settled(round) || !/^\d{1,24}$/.test(String(win))) return null;
  if (BigInt(win) === 0n) return {key:'none',label:'NO WIN',amount:minorText(win)};
  const bet = /^\d{1,24}$/.test(String(round.betMinor ?? round.stakeMinor)) ? BigInt(round.betMinor ?? round.stakeMinor) : 0n;
  const ratio = bet > 0n ? BigInt(win) * 100n / bet : 0n;
  const key = ratio >= 5000n ? 'mega' : ratio >= 2000n ? 'big' : ratio >= 1000n ? 'medium' : 'small';
  return {key,label:{mega:'MEGA WIN',big:'BIG WIN',medium:'NICE WIN',small:'WIN'}[key],amount:minorText(win)};
}
function resultMarkup(round) {
  const tier = presentationTier(round);
  if (!tier) return '';
  const particles = tier.key === 'none' ? '' : '<div class="m74-confetti" aria-hidden="true">' + Array.from({length:18},(_,index) => '<i class="p'+index+'"></i>').join('') + '</div>';
  return '<div class="m74-result m74-result-'+tier.key+'" role="status">'+particles+'<span>'+tier.label+'</span><strong>'+tier.amount+'</strong></div>';
}
function pendingMarkup(round) {
  const pending = round?.status === 'active' && /^\d{1,24}$/.test(String(round.pendingWinMinor));
  const history = Array.isArray(round?.gambleHistory) ? round.gambleHistory : [];
  const cards = history.map(item => {
    // A gamble choice is not the revealed card. Never substitute item.color.
    const color = ['red','black'].includes(item.revealedColor) ? item.revealedColor : ['red','black'].includes(item.cardColor) ? item.cardColor : null;
    if (!color) return '';
    return '<span class="m74-card m74-card-'+color+'" aria-label="Revealed '+color+' card">'+(color==='red'?'♥':'♠')+'</span>';
  }).join('');
  if (!pending && !cards) return '';
  return '<div class="'+(pending?'m74-pending-win':'m74-gamble-history-panel')+'" role="status"><span>'+(pending?'WIN TO COLLECT':'GAMBLE RESULT')+'</span>'+(pending?'<strong>'+minorText(round.pendingWinMinor)+'</strong>':'')+(cards?'<div class="m74-card-history" aria-label="Revealed gamble history">'+cards+'</div>':'')+'</div>';
}
function symbolCell(symbol, profile, row, column, win) {
  return '<div class="m74-symbol'+(win?' is-winning':'')+'" data-symbol="'+escape(symbol.id)+'" data-row="'+row+'" data-col="'+column+'" aria-label="'+escape(symbol.label || symbol.id)+'">'+symbolArt(symbol,profile)+'</div>';
}
function slotMarkup(definition, round, profile,options={}) {
  const {rows,columns} = machineGeometry(definition),sourceOutcome=round?.outcome;
  const coinFeature=definition.coinFeature,coinMode=coinFeature&&sourceOutcome?.featureType==='coin-respin';
  const frames=definition.respinFeature||coinFeature?sourceOutcome?.bonusFrames??[]:[];
  const frameIndex=Number.isInteger(options.bonusFrameIndex)?options.bonusFrameIndex:frames.length-1;
  const featureFrame=frameIndex>=0?frames[frameIndex]:null;
  const previousFrame=frameIndex>0?frames[frameIndex-1]:null;
  const displayFeature=!!featureFrame||coinMode&&sourceOutcome.bonusTriggered&&frames.length===0&&options.bonusFrameIndex!==-1;
  const outcome=featureFrame?{...sourceOutcome,grid:featureFrame.grid,lineWins:featureFrame.lineWins,expandedColumns:[]}:sourceOutcome;
  const coins=coinMode?publicCoins(definition,featureFrame?.coinValues??sourceOutcome.coinValues):new Map();
  const priorCoins=coinMode?publicCoins(definition,previousFrame?.coinValues??sourceOutcome.coinValues):null;
  const grid = outcome?.grid ?? round?.grid ?? Array.from({length:rows},(_,row) => Array.from({length:columns},(_,column) => definition.symbols[(row + column) % definition.symbols.length].id));
  const symbols = new Map(symbolsOf(definition).map(symbol => [symbol.id,symbol]));
  const lines = Array.isArray(outcome?.lineWins) ? outcome.lineWins : [];
  const winning = new Set(lines.flatMap(line => (line.positions || []).filter(p => integer(p.row,0,rows-1) && integer(p.col,0,columns-1)).map(p => p.row + ':' + p.col)));
  const expanded = new Set(Array.isArray(outcome?.expandedColumns) ? outcome.expandedColumns.filter(column => integer(column,0,columns-1)) : []);
  const cell=(id,row,column)=>{
    if(id===null)return '<div class="m74-symbol" data-blank="true" data-row="'+row+'" data-col="'+column+'" aria-label="Blank"></div>';
    let markup=symbolCell(symbols.get(id),profile,row,column,winning.has(row+':'+column));
    const coin=coins.get(row+':'+column);
    if(coin&&(id===definition.coinSymbol?.id||id===definition.plusRespinSymbol?.id)){
      const label=coin.kind==='mini'?'MINI':coin.kind==='major'?'MAJOR':coin.kind==='plus-one'?'+1 RESPIN':'';
      markup=markup.replace(/<\/div>$/,'<span class="m74-coin-value" data-coin-kind="'+coin.kind+'">'+(label?'<small>'+label+'</small>':'')+'<b>'+coin.multiplier+'×</b></span></div>');
    }
    return displayFeature?markup.replace(' data-symbol=',' data-locked="true" data-new-lock="'+String(coinMode?!priorCoins.has(row+':'+column):previousFrame?.grid[row][column]===null||!previousFrame)+'" data-symbol='):markup;
  };
  const reels = Array.from({length:columns},(_,column) => '<div class="m74-reel-window'+(expanded.has(column)?' is-expanded':'')+'" data-column="'+column+'"'+(expanded.has(column)?' aria-label="Expanded wild reel '+(column+1)+'"':'')+'><div class="m74-reel-strip">'+grid.map((row,index) => cell(row[column],index,column)).join('')+'</div></div>').join('');
  const paths = lines.slice(0,20).map((line,index) => {
    const positions = (line.positions || []).filter(p => integer(p.row,0,rows-1) && integer(p.col,0,columns-1));
    return positions.length > 1 ? '<polyline class="m74-payline line'+index%5+'" points="'+positions.map(p => ((p.col+.5)/columns*1000).toFixed(2)+','+((p.row+.5)/rows*1000).toFixed(2)).join(' ')+'"/>' : '';
  }).join('');
  const multipliers = Array.isArray(definition.multiplierValues) ? definition.multiplierValues : [];
  const multi = multipliers.length ? '<div class="m74-multiplier-reel" aria-label="Reel multiplier">'+multipliers.map(value => '<span'+(outcome?.reelMultiplier===value?' class="is-selected"':'')+'>'+escape(value)+'×</span>').join('')+'</div>' : '';
  const missingMultiplier = definition.layout?.multiplier?.placement === 'top-arc' && definition.layout.multiplier.calculationImplemented === false;
  const pending = missingMultiplier ? '<div class="m74-multiplier-pending" role="note"><span>MULTIPLIER</span><b>Weli la dhisayo</b></div>' : '';
  const countLabel=definition.ways?definition.ways+' WAYS':(definition.paylines?.length??'—')+' LINES';
  const winsLabel=lines.length+' WINNING '+(definition.ways?'WAYS':'LINES');
  const coinFull=coinMode&&(featureFrame?featureFrame.multiplierApplied===coinFeature.fullBoardMultiplier:frames.length===0&&sourceOutcome.featureFinishedReason==='full-board')&&options.bonusFrameIndex!==-1;
  const conditional=coinFeature?'<div class="m74-conditional-factor">'+(coinFull?'FULL COIN BOARD · '+coinFeature.fullBoardMultiplier+'× APPLIED':coinFeature.triggerCoins+' COINS · '+coinFeature.initialRespins+' RESPINS · FULL BOARD '+coinFeature.fullBoardMultiplier+'×')+'</div>':definition.baseGameMultiplier?'<div class="m74-conditional-factor">'+(featureFrame?'RESPIN FACTOR '+escape(sourceOutcome.featureMultiplier)+'× · APPLIED '+escape(featureFrame.multiplierApplied)+'×':sourceOutcome?'BASE MULTIPLIER '+escape(sourceOutcome.baseMultiplier)+'×':'FULL BOARD / ALL 5 LINES · '+definition.baseGameMultiplier.values.map(value=>escape(value)+'×').join(' / '))+'</div>':'';
  const feature=featureFrame?'<div class="m74-respin-meter" data-frame="'+featureFrame.index+'" data-locked="'+featureFrame.lockedCells+'" data-new-locks="'+(coinMode?featureFrame.newCoins:featureFrame.newLocks)+'"'+(coinMode?' data-respins-remaining="'+featureFrame.respinsRemaining+'" data-reset-limit="'+featureFrame.resetLimit+'"':'')+'><span>'+(coinMode?'RESPINS '+featureFrame.respinsRemaining+' / '+featureFrame.resetLimit:'RESPIN '+featureFrame.index)+' · LOCKED '+featureFrame.lockedCells+' / '+rows*columns+'</span><span>'+escape(featureFrame.terminal?'FEATURE COMPLETE':'NEW '+(coinMode?'COINS '+featureFrame.newCoins:'LOCKS '+featureFrame.newLocks))+'</span></div>':displayFeature?'<div class="m74-respin-meter" data-frame="0" data-locked="'+coins.size+'"><span>LOCKED '+coins.size+' / '+rows*columns+'</span><span>FEATURE COMPLETE</span></div>':'';
  return pending+conditional+'<div class="m74-slot-cabinet'+(multipliers.length?' has-multiplier':'')+'">'+multi+'<div class="m74-reels" data-rows="'+rows+'" data-columns="'+columns+'">'+reels+'<svg class="m74-paylines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">'+paths+'</svg></div></div>'+feature+'<div class="m74-stage-strip"><span>'+columns+' × '+rows+' REELS</span><span>'+escape(countLabel)+'</span><span>'+(round?.status==='active'&&round.pendingWinMinor?'WIN TO COLLECT':lines.length?winsLabel:round?'ROUND COMPLETE':'READY')+'</span></div>';
}
function crashMarkup(definition, round, profile) {
  if(isCascade(definition))return cascadeMarkup(definition,round,profile);
  const status = round?.status === 'active' ? 'active' : settled(round) ? 'settled' : 'ready';
  const value = round?.bustMultiplierBps ?? round?.multiplierBps ?? 10000;
  const resultStatus = round?.resultStatus ?? round?.status;
  const label = round?.pendingResolution ? 'CONFIRMING ROUND' : status === 'active' ? 'LIVE · SERVER CONFIRMED' : resultStatus === 'lost' || settled(round) && (round.winMinor ?? round.payoutMinor) === '0' ? 'ROUND ENDED' : status === 'settled' ? 'COLLECTED' : 'READY';
  return '<div class="m74-flight '+status+'"><svg class="m74-flight-route" viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true"><path class="m74-flight-grid" d="M35 25V265H570M35 205H570M35 145H570M35 85H570M140 25V265M245 25V265M350 25V265M455 25V265"/><path class="m74-flight-line" d="M38 260Q245 254 482 65"/></svg><div class="m74-vehicle m74-vehicle-'+profile.motif+'">'+icon(profile.motif)+'</div><div class="m74-flight-value"><strong class="m74-counter">'+multiplier(value)+'</strong><span>'+label+'</span></div></div>';
}
function cascadeMarkup(definition,round,profile) {
  const {rows,columns}=machineGeometry(definition),outcome=round?.outcome,grid=outcome?.grid??round?.grid;
  const symbols=new Map(definition.symbols.map((symbol,index)=>[symbol.id,{...symbol,index}]));
  const matches=Array.isArray(outcome?.matchedPositions)?outcome.matchedPositions:[];
  const marked=new Set(matches.filter(point=>integer(point.row,0,rows-1)&&integer(point.col,0,columns-1)).map(point=>point.row+':'+point.col));
  const artwork=['flower','star','gem','leaf','sun','candy','coin','bubble','lightning','crown','flame'];
  const cells=Array.from({length:rows},(_,row)=>Array.from({length:columns},(_,column)=>{
    const symbol=symbols.get(grid?.[row]?.[column]),matched=marked.has(row+':'+column);
    return '<div class="m74-cascade-cell'+(matched?' is-matched':'')+(symbol?'':' is-waiting')+'" data-row="'+row+'" data-col="'+column+'"'+(symbol?' data-symbol="'+escape(symbol.id)+'"':'')+' aria-label="'+escape(symbol?.label??'Awaiting server')+'"><span class="m74-cascade-orb orb-'+(symbol?symbol.index%11:'waiting')+'">'+(symbol?icon(artwork[symbol.index%artwork.length]):'<i aria-hidden="true"></i>')+'</span></div>';
  }).join('')).join('');
  const resultStatus=round?.resultStatus??round?.status;
  const label=!round?'READY':round.status==='active'?'LIVE · SERVER CONFIRMED':resultStatus==='lost'?'ROUND ENDED':'COLLECTED';
  return '<div class="m74-cascade-score"><strong class="m74-counter">'+multiplier(round?.multiplierBps??10000)+'</strong><span>'+label+'</span></div><div class="m74-cascade-board" data-rows="'+rows+'" data-columns="'+columns+'" aria-label="'+columns+' columns and '+rows+' rows">'+cells+'</div><div class="m74-stage-strip"><span>'+columns+' × '+rows+' GRID</span><span>'+(round?'CASCADE '+escape(outcome?.cascadeIndex??round?.cascadeIndex??0):escape(definition.minMatch??'—')+'+ MATCH')+'</span><span>'+marked.size+' MATCHED</span></div>';
}
function highwayMarkup(definition,round,profile,options,values,steps) {
  const history=historyOf(round),current=round?.step??0;
  // The original road pans horizontally. Show a bounded window around the
  // confirmed progress rather than squeezing an entire unknown route on screen.
  const start=Math.max(0,Math.min(steps-7,current-1)),end=Math.min(steps,start+7);
  const next=Array.from({length:steps},(_,i)=>i).find(cell=>!history.some(item=>item.cell===cell));
  const lanes=Array.from({length:end-start},(_,offset)=>{
    const cell=start+offset,item=history.find(item=>item.cell===cell),active=!options.disabled&&allowed(round,'reveal')&&cell===next;
    const occupied=current>0&&cell===current-1;
    return '<div class="m74-highway-lane'+(occupied?' is-current':'')+(item&&!item.survived?' is-collision':'')+'" data-lane="'+cell+'"><span class="m74-highway-car" aria-hidden="true"></span>'+
      '<button type="button" class="m74-highway-target'+(item?item.survived?' safe':' lost':'')+'" data-m74-cell="'+cell+'"'+(active?'':' disabled')+' aria-label="Lane '+(cell+1)+', '+multiplier(values[cell])+(item?item.survived?', crossed':', collision':', next crossing')+'">'+multiplier(values[cell])+'</button>'+
      (occupied?'<span class="m74-highway-chicken" aria-label="Chicken at lane '+current+'">'+icon('chicken')+'</span>':'')+'</div>';
  }).join('');
  return '<div class="m74-highway" data-total-lanes="'+steps+'" data-window-start="'+start+'"><div class="m74-highway-verge"><span aria-hidden="true">🌵</span>'+(!current?'<span class="m74-highway-chicken">'+icon('chicken')+'</span>':'')+'</div><div class="m74-highway-road" style="--m74-visible-lanes:'+String(end-start)+'">'+lanes+'</div></div>'+
    '<div class="m74-stage-strip"><span>LANE '+current+'</span><strong>'+multiplier(round?.multiplierBps??0)+'</strong><span>NEXT '+multiplier(round?.nextMultiplierBps)+'</span></div>';
}
function ladderMarkup(definition, round, profile, options) {
  const {steps} = machineGeometry(definition), history = historyOf(round);
  const mode = round?.mode ?? options.selectedOptions?.mode ?? definition.defaultMode;
  const table = Array.isArray(definition.paytable) ? definition.paytable.find(item => item.mode === mode)?.rows : null;
  const values = table?.map(row => row.multiplierBps) ?? definition.multipliersBps ?? [];
  if(definition.id==='ind74_official_chickenhighway')return highwayMarkup(definition,round,profile,options,values,steps);
  const nextCell = Array.from({length:steps},(_,i) => i).find(cell => !history.some(item => item.cell === cell));
  const buttons = Array.from({length:steps},(_,cell) => {
    const item = history.find(item => item.cell === cell), state = item ? item.survived ? 'safe' : 'lost' : 'covered';
    const enabled = !options.disabled && allowed(round,'reveal') && cell === nextCell;
    const active = enabled ? ' is-next' : '';
    return '<button type="button" class="m74-step '+state+active+'" data-m74-cell="'+cell+'"'+(enabled?'':' disabled')+' aria-label="Step '+(cell+1)+(item?item.survived?', safe':', lost':', unrevealed')+'"><span class="m74-step-art">'+icon(profile.motif)+'</span><b>'+(cell+1)+'</b><span class="m74-step-value">'+(values[cell]!==undefined?multiplier(values[cell]):'—')+'</span><i aria-hidden="true">'+(item?item.survived?'✓':'×':'')+'</i></button>';
  }).join('');
  return '<div class="m74-ladder m74-trail-'+profile.scene+'" aria-label="'+steps+' steps">'+buttons+'</div><div class="m74-stage-strip"><span>STEP '+(round?.step ?? 0)+' / '+steps+'</span><strong>'+multiplier(round?.multiplierBps ?? 0)+'</strong><span>NEXT '+multiplier(round?.nextMultiplierBps)+'</span></div>';
}
function minesMarkup(definition, round, profile, options) {
  const {rows,columns,cells} = machineGeometry(definition), history = historyOf(round);
  const revealedMines = settled(round) && Array.isArray(round.mineCells) ? new Set(round.mineCells) : new Set();
  const buttons = Array.from({length:cells},(_,cell) => {
    const item = history.find(item => item.cell === cell), state = item ? item.survived ? 'safe' : 'lost' : revealedMines.has(cell) ? 'mine' : 'covered';
    const enabled = !options.disabled && allowed(round,'reveal') && !item;
    return '<button type="button" class="m74-mine-cell '+state+'" data-m74-cell="'+cell+'"'+(enabled?'':' disabled')+' aria-label="Cell '+(cell+1)+', '+state+'">'+(state==='safe'?icon('gem'):state==='lost'||state==='mine'?icon('flame'):'<span aria-hidden="true">'+icon('island')+'</span>')+'</button>';
  }).join('');
  return '<div class="m74-mine-board" data-rows="'+rows+'" data-columns="'+columns+'" aria-label="'+cells+' cells">'+buttons+'</div><div class="m74-stage-strip"><span>'+escape(round?.mines ?? definition.mines)+' MINES</span><strong>'+multiplier(round?.multiplierBps ?? 0)+'</strong><span>'+history.filter(item => item.survived).length+' REVEALED</span></div>';
}
export function plinkoGeometry(definition, path) {
  const {rows,columns} = machineGeometry(definition), dx = 520 / (rows + 2), dy = 320 / rows;
  const points = [{x:300,y:18}]; let x = 300;
  if (path) {
    if (!Array.isArray(path) || path.length !== rows || path.some(bit => bit !== 0 && bit !== 1)) throw new TypeError('Only a server-supplied Plinko path can be animated.');
    path.forEach((bit,index) => { x += (bit ? 1 : -1) * dx / 2; points.push({x,y:50 + index * dy}); });
    points.push({x,y:392});
  }
  return {rows,columns,dx,dy,points};
}
function plinkoMarkup(definition, round, profile, options) {
  const {rows,columns,dx,dy,points} = plinkoGeometry(definition,round?.outcome?.path);
  let pegs = '';
  for (let row=0;row<rows;row++) for (let col=0;col<row+3;col++) pegs += '<circle cx="'+(300+(col-(row+2)/2)*dx).toFixed(2)+'" cy="'+(50+row*dy).toFixed(2)+'" r="3.2"/>';
  const buckets = definition.bucketMultipliersBps.map((value,index) => {
    const x = 300+(index-rows/2)*dx;
    return '<g class="m74-bucket'+(round?.outcome?.bucket===index?' is-selected':'')+'" data-bucket="'+index+'"><rect x="'+(x-dx/2+1).toFixed(2)+'" y="404" width="'+(dx-2).toFixed(2)+'" height="32" rx="4"/><text x="'+x.toFixed(2)+'" y="424">'+escape(value/10000)+'×</text><title>Bucket '+(index+1)+': '+multiplier(value)+'</title></g>';
  }).join('');
  const ball = points.at(-1);
  const ballType = ['pink','orange','fire'].includes(round?.outcome?.ballType) ? round.outcome.ballType : null;
  const ballFactor = round?.outcome?.ballMultiplier ?? round?.ballMultiplier;
  const publishedBalls = Array.isArray(definition.ballTypes) ? definition.ballTypes : [];
  const legend = publishedBalls.length ? '<div class="m74-ball-legend" aria-label="Ball multipliers">'+publishedBalls.map(item=>'<span class="m74-ball-'+(['pink','orange','fire'].includes(item.type)?item.type:'neutral')+'"><i aria-hidden="true"></i>'+escape(item.multiplier)+'×</span>').join('')+'</div>' : '';
  return legend+'<svg class="m74-plinko" viewBox="0 0 600 450" role="img" aria-label="'+rows+' rows and '+columns+' buckets"><g class="m74-pegs">'+pegs+'</g>'+buckets+'<circle class="m74-plinko-ball'+(ballType?' m74-ball-'+ballType:!round?' is-waiting':'')+'" cx="'+ball.x+'" cy="'+ball.y+'" r="6"/></svg><div class="m74-stage-strip"><span>'+rows+' ROWS'+(ballFactor!==undefined?' · BALL '+escape(ballFactor)+'×':'')+'</span><strong>'+multiplier(round?.outcome?.multiplierBps)+'</strong><span>'+(round?'BUCKET '+(round.outcome.bucket+1):columns+' BUCKETS')+'</span></div>';
}
const point = (radius,angle) => [300+radius*Math.cos(angle*Math.PI/180),300+radius*Math.sin(angle*Math.PI/180)];
function wedge(start,end) {
  const a=point(255,start),b=point(255,end);
  return 'M300 300L'+a.join(' ')+'A255 255 0 '+(end-start>180?1:0)+' 1 '+b.join(' ')+'Z';
}
export function wheelRotation(definition, round) {
  machineGeometry(definition);
  const index=definition.sectors.findIndex(sector => sector.id===round?.outcome?.sector);
  return index<0?0:-(index+.5)*360/definition.sectors.length;
}
function wheelMarkup(definition, round, profile) {
  const {sectors:count}=machineGeometry(definition);
  const sectors=definition.sectors.map((sector,index) => {
    const start=index*360/count-90,end=(index+1)*360/count-90,middle=(start+end)/2,[x,y]=point(178,middle);
    return '<g class="m74-wheel-sector sector-'+index%4+(round?.outcome?.sector===sector.id?' is-selected':'')+'" data-sector="'+escape(sector.id)+'"><path d="'+wedge(start,end)+'"/><text x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" transform="rotate('+(middle+90)+' '+x+' '+y+')">'+escape(sector.multiplierBps/10000)+'×</text><title>'+escape(sector.label)+' · '+multiplier(sector.multiplierBps)+'</title></g>';
  }).join('');
  return '<div class="m74-wheel-wrap"><svg class="m74-wheel" viewBox="0 0 600 600" role="img" aria-label="'+count+'-sector wheel"><circle class="m74-wheel-rim" cx="300" cy="300" r="274"/><g class="m74-wheel-rotor" transform="rotate('+wheelRotation(definition,round)+' 300 300)">'+sectors+'</g><circle class="m74-wheel-hub" cx="300" cy="300" r="80"/><path class="m74-wheel-pointer" d="M276 8H324L300 62Z"/></svg><div class="m74-wheel-center">'+icon(profile.motif)+'</div></div><div class="m74-stage-strip"><span>'+count+' SECTORS</span><strong>'+multiplier(round?.outcome?.multiplierBps)+'</strong><span>'+escape(round?.outcome?.label ?? 'READY')+'</span></div>';
}
export function rollXRotation(round) {
  const roll=round?.outcome?.roll;
  return integer(roll,0,99)?-(roll+.5)*3.6:0;
}
function rollXMarkup(definition,round,options) {
  const target=round?.outcome?.target??options.selectedOptions?.target??definition.defaultTarget;
  if(!integer(target,definition.minTarget,definition.maxTarget))throw new TypeError('A published Roll X target is required.');
  // The observed provider dial has a continuous green sector and fixed pointer.
  // This original presentation maps our existing public 00–99 roll/target to
  // that form; it does not claim the provider's multiplier-selection semantics.
  const end=-90+target*3.6;
  const won=round?.outcome?.success===true;
  const label=!round?'READY':won?'WON':'TRY AGAIN';
  const amount=won?minorText(round.winMinor??round.payoutMinor):null;
  return '<div class="m74-rollx-dial"><svg class="m74-rollx-wheel" viewBox="0 0 600 600" role="img" aria-label="Continuous green and black dial with fixed top pointer"><g class="m74-rollx-rotor" transform="rotate('+rollXRotation(round)+' 300 300)"><circle cx="300" cy="300" r="255" class="m74-rollx-dark"/><path class="m74-rollx-green" d="'+wedge(-90,end)+'"/></g><path class="m74-rollx-pointer" d="M273 46H327L300 91Z"/></svg><div class="m74-rollx-readout" role="status"><span>'+label+'</span>'+(amount?'<strong>'+amount+'</strong>':'')+'</div><div class="m74-rollx-pending" aria-hidden="true">SPINNING</div></div><div class="m74-stage-strip"><span>TARGET '+target+' / 100</span><strong>'+multiplier(round?.outcome?.offeredMultiplierBps)+'</strong><span>'+(round?'ROUND COMPLETE':'READY')+'</span></div>';
}
function diceMarkup(definition,round,profile,options) {
  if(definition.id==='ind74_official_rollx')return rollXMarkup(definition,round,options);
  const target=round?.outcome?.target ?? options.selectedOptions?.target ?? definition.defaultTarget;
  return '<div class="m74-dice-scene"><div class="m74-dice-decoration">'+icon(profile.motif)+'</div><div class="m74-roll-result" aria-label="Server roll"><span>ROLL</span><strong>'+(round?escape(String(round.outcome.roll).padStart(2,'0')):'—')+'</strong></div><div class="m74-dice-track"><span>0</span><div class="m74-roll-marker" data-roll="'+(round?.outcome?.roll ?? 0)+'"></div><span>99</span></div></div><div class="m74-stage-strip"><span>ROLL UNDER '+escape(target)+'</span><strong>'+(round?round.outcome.success?'WIN':'ROUND ENDED':'READY')+'</strong><span>'+multiplier(round?.outcome?.offeredMultiplierBps)+'</span></div>';
}
export function machineMarkup(definition,publicRound=null,options={}) {
  const profile=presentationProfile(definition); machineGeometry(definition); assertRound(definition,publicRound);
  const body={slots:slotMarkup,crash:crashMarkup,ladder:ladderMarkup,mines:minesMarkup,plinko:plinkoMarkup,wheel:wheelMarkup,dice:diceMarkup}[definition.family](definition,publicRound,profile,options);
  return '<section class="m74-machine m74-scene-'+profile.scene+'" data-profile="'+escape(profile.id)+'" data-family="'+definition.family+'" data-status="'+escape(publicRound?.status ?? 'ready')+'" aria-label="'+escape(definition.catalogName ?? definition.title)+' machine">'+scenery(profile)+'<div class="m74-machine-heading"><span class="m74-title-mark">'+icon(profile.motif)+'</span><h2>'+escape(definition.catalogName ?? definition.title)+'</h2><span class="m74-machine-indicator" aria-hidden="true"></span></div><div class="m74-game-area">'+body+'</div>'+pendingMarkup(publicRound)+resultMarkup(publicRound)+'</section>';
}

export function renderMachine(stage,definition,publicRound=null,options={}) {
  if (!stage || typeof stage.replaceChildren!=='function') throw new TypeError('A machine stage is required.');
  const markup=machineMarkup(definition,publicRound,options),profile=presentationProfile(definition),geometry=machineGeometry(definition);
  handles.get(stage)?.dispose();
  stage.classList.add('m74-host'); stage.classList.remove('m74-animating'); stage.innerHTML=markup;
  stage.style.setProperty('--m74-background',profile.background);
  stage.style.setProperty('--m74-accent',profile.accent);
  stage.style.setProperty('--m74-trim',profile.trim);
  if(geometry.rows)stage.style.setProperty('--m74-rows',String(geometry.rows));
  if(geometry.columns)stage.style.setProperty('--m74-cols',String(geometry.columns));
  stage.classList.toggle('m74-reduced',!!options.reduced);
  const marker=stage.querySelector('.m74-roll-marker'); if(marker)marker.style.left=((publicRound?.outcome?.roll ?? 0)/99*100)+'%';
  const onClick=event => {
    const button=event.target.closest?.('[data-m74-cell]');
    if(!button || !stage.contains(button) || button.disabled || options.disabled || !allowed(publicRound,'reveal'))return;
    const cell=Number(button.dataset.m74Cell);
    if(!integer(cell,0,(geometry.cells ?? geometry.steps ?? 0)-1))return;
    options.onAction?.({type:'reveal',options:{cell}});
  };
  stage.addEventListener('click',onClick);
  const handle={metadata:profile,dispose(){stage.removeEventListener('click',onClick);if(handles.get(stage)===handle)handles.delete(stage);}};
  handles.set(stage,handle);return handle;
}

/** Animate only between supplied server states. STOP never emits a game action. */
export function animateRound(stage,definition,previous,next,options={}) {
  assertRound(definition,next);
  const {turbo=false,reduced=false,audio}=options;
  const renderOptions={...options,disabled:options.disabled ?? true};
  const mounted=renderMachine(stage,definition,next,definition.respinFeature||definition.coinFeature?{...renderOptions,bonusFrameIndex:-1}:renderOptions);
  stage.classList.add('m74-animating');
  if(definition.family==='plinko'&&!reduced){
    // Mounting the confirmed state places the ball in its destination bucket.
    // Reset before yielding to the browser so the first painted frame begins
    // at release, including successive rounds and a delayed animation frame.
    const ball=stage.querySelector('.m74-plinko-ball');
    const release=plinkoGeometry(definition,next.outcome.path).points[0];
    ball?.setAttribute('cx',String(release.x));
    ball?.setAttribute('cy',String(release.y));
  }
  if(definition.id==='ind74_official_rollx'&&!reduced){
    stage.querySelector('.m74-rollx-rotor')?.setAttribute('transform','rotate('+rollXRotation(previous)+' 300 300)');
  }
  let done=false,resolve,frame=0;
  const timers=new Set(),animations=new Set(),pendingResolves=new Set();
  const promise=new Promise(value=>{resolve=value;});
  const schedule=(fn,delay)=>{const id=setTimeout(()=>{timers.delete(id);if(!done)fn();},delay);timers.add(id);return id;};
  const cue=name=>{try{audio?.cue?.(name);}catch{}};
  const spin=()=>{try{audio?.startSpin?.();}catch{}};
  const cleanup=()=>{
    for(const id of timers)clearTimeout(id);timers.clear();
    if(frame && typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);
    for(const animation of animations){try{animation.cancel();}catch{}}animations.clear();
    for(const settle of pendingResolves)settle();pendingResolves.clear();
    try{audio?.stopSpin?.();}catch{}
  };
  function finish(cancelled=false) {
    if(done)return;done=true;cleanup();
    const stillCurrent=handles.get(stage)===mounted;
    if(stillCurrent) {
      stage.classList.remove('m74-animating');
      if(!cancelled){
        renderMachine(stage,definition,next,renderOptions);
        const tier=presentationTier(next);
        if(tier)cue({none:'lose',small:'smallWin',medium:'mediumWin',big:'bigWin',mega:'megaWin'}[tier.key]);
        else if(definition.family==='ladder'||definition.family==='mines')cue('reveal');
      }
    }
    resolve({cancelled:cancelled||!stillCurrent});
  }
  function animate(element,keyframes,duration,delay=0) {
    if(!element || typeof element.animate!=='function')return new Promise(res=>{pendingResolves.add(res);schedule(()=>{pendingResolves.delete(res);res();},duration+delay);});
    const animation=element.animate(keyframes,{duration,delay,fill:'both',easing:'cubic-bezier(.18,.66,.18,1)'});
    animations.add(animation);
    return animation.finished.catch(()=>{}).finally(()=>{animations.delete(animation);try{animation.cancel();}catch{}});
  }
  function tween(duration,draw) {
    return new Promise(res=>{
      if(typeof requestAnimationFrame!=='function'){draw(1);res();return;}
      pendingResolves.add(res);
      let start;
      const tick=time=>{
        if(done){pendingResolves.delete(res);res();return;}
        start??=time;const progress=Math.min(1,(time-start)/Math.max(1,duration));
        draw(progress);
        if(progress>=1){frame=0;pendingResolves.delete(res);res();}else frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    });
  }
  async function run() {
    if(done)return;
    if(reduced){finish();return;}
    if(definition.family==='slots') {
      spin();
      const {rows}=machineGeometry(definition),profile=presentationProfile(definition);
      const symbols=new Map(symbolsOf(definition).map(symbol=>[symbol.id,symbol]));
      const previousGrid=previous?.outcome?.grid ?? previous?.grid;
      const originalGrid=next?.outcome?.originalGrid;
      const expandedColumns=new Set(Array.isArray(next?.outcome?.expandedColumns)?next.outcome.expandedColumns:[]);
      const columns=[...stage.querySelectorAll('.m74-reel-window')];
      await Promise.all(columns.map(async(window,column)=>{
        const strip=window.querySelector('.m74-reel-strip');
        const finalMarkup=strip.innerHTML;
        const originalColumn=Array.isArray(originalGrid)&&originalGrid.length===rows&&originalGrid.every(row=>Array.isArray(row)&&symbols.has(row[column]))&&expandedColumns.has(column)
          ? originalGrid.map((row,index)=>symbolCell(symbols.get(row[column]),profile,index,column,false)).join('') : null;
        window.classList.remove('is-expanded');
        const height=window.getBoundingClientRect().height || rows*76;
        const cellHeight=height/rows;
        const initial=Array.from({length:rows},(_,row)=>{
          const symbol=symbols.get(previousGrid?.[row]?.[column]) ?? definition.symbols[(row+column)%definition.symbols.length];
          return symbolCell(symbol,profile,row,column,false);
        }).join('');
        const cycle=definition.symbols.map((symbol,index)=>symbolCell(symbol,profile,index,column,false)).join('');
        window.style.height=height+'px';strip.style.setProperty('--m74-animation-cell',cellHeight+'px');
        strip.innerHTML=initial+cycle+cycle+(originalColumn??finalMarkup);
        strip.classList.add('m74-moving-strip');window.classList.add('is-rolling');
        const distance=(rows+definition.symbols.length*2)*cellHeight;
        await animate(strip,[{transform:'translateY(0)',filter:'blur(0)'},{transform:'translateY('+(-distance*.12)+'px)',filter:'blur(2px)',offset:.2},{transform:'translateY('+(-distance*.9)+'px)',filter:'blur(1.7px)',offset:.74},{transform:'translateY('+(-distance)+'px)',filter:'blur(0)'}],turbo?150+column*20:850+column*135);
        if(done||handles.get(stage)!==mounted)return;
        strip.innerHTML=originalColumn??finalMarkup;strip.classList.remove('m74-moving-strip');strip.style.transform='none';
        window.classList.remove('is-rolling');window.classList.add('is-landed');cue('reelStop');
        if(originalColumn){
          await animate(strip,[{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.5},{filter:'brightness(1)'}],turbo?80:190);
          if(done||handles.get(stage)!==mounted)return;
          strip.innerHTML=finalMarkup;window.classList.add('is-expanded');
          await animate(strip,[{transform:'scaleY(.15)',opacity:.3},{transform:'scaleY(1.05)',opacity:1,offset:.8},{transform:'scaleY(1)',opacity:1}],turbo?90:290);
          if(!done)cue('bonus');
        }
      }));
      if(!done&&Array.isArray(definition.multiplierValues)&&definition.multiplierValues.length)cue('multiplier');
      if(!done&&definition.baseGameMultiplier&&next.outcome?.baseMultiplier>1)cue('multiplier');
      const frames=definition.respinFeature||definition.coinFeature?next.outcome?.bonusFrames??[]:[];
      // Coin features can contain up to60 completed frames. Compress their
      // visual replay to3.5s normal/2.4s turbo, in addition to the base spin.
      // Slow displays fast-forward remaining past frames at that wall budget.
      const frameBudget=definition.coinFeature?Math.min(turbo?145:540,(turbo?2400:3500)/Math.max(1,frames.length)):turbo?145:540;
      const replayDeadline=definition.coinFeature?performance.now()+(turbo?2400:3500):Infinity;
      for(const [index,feature]of frames.entries()){
        if(done||handles.get(stage)!==mounted)return;
        if(performance.now()>=replayDeadline)break;
        const area=stage.querySelector('.m74-game-area');
        if(!area)break;
        area.innerHTML=slotMarkup(definition,next,presentationProfile(definition),{bonusFrameIndex:index});
        cue('bonus');
        const previousFrame=frames[index-1];
        const held=definition.coinFeature?new Set((previousFrame?.coinValues??next.outcome.coinValues).map(coinKey)):null;
        const changing=[...area.querySelectorAll('.m74-symbol')].filter(cell=>held?!held.has(cell.dataset.row+':'+cell.dataset.col):previousFrame?.grid[Number(cell.dataset.row)][Number(cell.dataset.col)]==null);
        const available=Math.min(frameBudget,replayDeadline-performance.now());
        await Promise.all(changing.map(cell=>animate(cell,[{opacity:.15,filter:'blur(3px)',transform:'translateY(-12px)'},{opacity:1,filter:'blur(0)',transform:'translateY(0)'}],Math.max(12,Math.round(available*.7)))));
        if(done||handles.get(stage)!==mounted)return;
        if(feature.multiplierApplied>1)cue('multiplier');
        await new Promise(res=>{pendingResolves.add(res);schedule(()=>{pendingResolves.delete(res);res();},Math.max(0,Math.min(Math.floor(frameBudget*.3),replayDeadline-performance.now())));});
      }
    } else if(definition.family==='wheel') {
      const rotor=stage.querySelector('.m74-wheel-rotor');
      rotor.style.transformOrigin='300px 300px';
      const from=previous?wheelRotation(definition,previous):0,to=wheelRotation(definition,next)+1080;
      let ticks=0;const tick=()=>{if(done)return;cue('wheelTick');ticks++;schedule(tick,turbo?30:70+ticks*5);};tick();
      await animate(rotor,[{transform:'rotate('+from+'deg)'},{transform:'rotate('+to+'deg)'}],turbo?220:1700);
      if(!done)cue('wheelStop');
    } else if(definition.family==='plinko') {
      cue('tap');
      const ball=stage.querySelector('.m74-plinko-ball'),{points}=plinkoGeometry(definition,next.outcome.path);
      let lastPoint=-1;
      await tween(turbo?190:1450,progress=>{
        const cursor=progress*(points.length-1),index=Math.min(points.length-2,Math.floor(cursor)),fraction=cursor-index;
        const a=points[index],b=points[index+1],bounce=Math.sin(fraction*Math.PI)*3;
        ball.setAttribute('cx',String(a.x+(b.x-a.x)*fraction));
        ball.setAttribute('cy',String(a.y+(b.y-a.y)*fraction-bounce));
        if(index!==lastPoint){lastPoint=index;cue('wheelTick');}
      });
      if(!done)cue('wheelStop');
    } else if(definition.family==='mines'||definition.family==='ladder') {
      const last=historyOf(next).at(-1),cell=stage.querySelector('[data-m74-cell="'+Number(last?.cell)+'"]');
      if(definition.id==='ind74_official_chickenhighway') {
        const chicken=stage.querySelector('.m74-highway-chicken');
        if(chicken)await animate(chicken,[{transform:'translateX(-100%) translateY(0)'},{transform:'translateX(-45%) translateY(-15px)',offset:.5},{transform:'translateX(0) translateY(0)'}],turbo?100:430);
      } else if(cell)await animate(cell,[{transform:'scale(.92) rotateY(75deg)',opacity:.3},{transform:'scale(1.08) rotateY(0deg)',opacity:1,offset:.72},{transform:'scale(1) rotateY(0deg)',opacity:1}],turbo?100:430);
    } else if(definition.family==='dice') {
      cue('spin');
      if(definition.id==='ind74_official_rollx'){
        const rotor=stage.querySelector('.m74-rollx-rotor');
        if(rotor)rotor.style.transformOrigin='300px 300px';
        await animate(rotor,[{transform:'rotate('+rollXRotation(previous)+'deg)'},{transform:'rotate('+(rollXRotation(next)+1080)+'deg)'}],turbo?220:1600);
      }else await animate(stage.querySelector('.m74-roll-result'),[{transform:'rotateX(0deg)',filter:'blur(4px)'},{transform:'rotateX(720deg)',filter:'blur(0)'}],turbo?160:720);
      if(!done)cue('reelStop');
    } else if(isCascade(definition)) {
      const previousGrid=previous?.outcome?.grid??previous?.grid;
      const cells=[...stage.querySelectorAll('.m74-cascade-cell')];
      await Promise.all(cells.filter(cell=>previousGrid?.[Number(cell.dataset.row)]?.[Number(cell.dataset.col)]!==cell.dataset.symbol)
        .map(cell=>animate(cell,[{transform:'translateY(-24px) scale(.84)',opacity:.15},{transform:'translateY(2px) scale(1.04)',opacity:1,offset:.8},{transform:'translateY(0) scale(1)',opacity:1}],turbo?85:250,Number(cell.dataset.row)*(turbo?4:15))));
      if(!done)cue('reveal');
    } else if(definition.family==='crash') {
      const counter=stage.querySelector('.m74-counter');
      const from=Number(previous?.multiplierBps ?? 10000),to=Number(next.bustMultiplierBps ?? next.multiplierBps ?? 10000);
      if(Number.isFinite(from)&&Number.isFinite(to))await tween(turbo?70:240,progress=>{counter.textContent=multiplier(Math.round(from+(to-from)*progress));});
    }
    finish();
  }
  // Start in a microtask so the caller obtains STOP/dispose before any completion.
  Promise.resolve().then(run).catch(error=>{try{options.onError?.(error);}catch{}finish();});
  return {promise,stop:()=>finish(false),dispose:()=>finish(true)};
}
