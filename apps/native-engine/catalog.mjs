import {SMARTSOFT_CATALOG} from '../../deploy/cloudflare/smartsoft-catalog.mjs';

const crash=new Set(['jetx','cappadocia','balloon','cricket_crash','urban_rise','football_x','aqua_jump']);
const plinko=new Set(['plinkox','galaxy_space']);
const mines=new Set(['turbo_mines','crazy_hunt','toto_goal']);
const dice=new Set(['roll_dice','neon_dice']);

export const GAMES=Object.freeze(Object.fromEntries(SMARTSOFT_CATALOG.games.map((game,index)=>{
 const family=crash.has(game.id)?'crash':plinko.has(game.id)?'plinko':mines.has(game.id)?'mines':dice.has(game.id)?'dice':game.id==='mega_hilo'?'hilo':game.id==='spin_x'?'wheel':'slots';
 return [game.id,Object.freeze({id:game.id,name:game.name,family,theme:index%6,version:'superwin-native-families-v1',implementation:'Independent Superwin internal game',official_provider_game:false,currency:'ETB',min_stake_minor:'100',max_stake_minor:'100000',symbols:6+index%3,plinko_rows:10+index%3,max_picks:5,max_hilo_steps:3,crash_growth:0.28,max_multiplier:100,house_edge_percent:3,lease_ms:1800000})];
})));

export function gameById(id){const game=typeof id==='string'&&Object.hasOwn(GAMES,id)?GAMES[id]:null;if(!game)throw Object.assign(Error('GAME_NOT_FOUND'),{status:404});return game;}
