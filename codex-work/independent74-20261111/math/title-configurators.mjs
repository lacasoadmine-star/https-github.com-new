// Explicit per-title configurators. Shared evaluators do not select another title.
import {configureOfficialGame as multihot10} from './games/multihot10.mjs';
import {configureOfficialGame as multihot20} from './games/multihot20.mjs';
import {configureOfficialGame as multihot5burnwilds} from './games/multihot5burnwilds.mjs';
import {configureOfficialGame as multifruitschargingwilds} from './games/multifruitschargingwilds.mjs';
import {configureOfficialGame as gemscrownchargingwilds} from './games/gemscrownchargingwilds.mjs';
import {configureOfficialGame as gatesofmerlyn} from './games/gatesofmerlyn.mjs';
import {configureOfficialGame as coinsofatlantis} from './games/coinsofatlantis.mjs';
import {configureOfficialGame as poweroftiger} from './games/poweroftiger.mjs';
import {configureOfficialGame as geniesbonanza} from './games/geniesbonanza.mjs';
import {configureOfficialGame as mariachicoins} from './games/mariachicoins.mjs';
import {configureOfficialGame as hotsamba} from './games/hotsamba.mjs';
import {configureOfficialGame as baoslot5x} from './games/baoslot5x.mjs';
import {configureOfficialGame as farmsfortune} from './games/farmsfortune.mjs';
import {configureOfficialGame as draculasfortune} from './games/draculasfortune.mjs';
import {configureOfficialGame as dicejungle} from './games/dicejungle.mjs';
import {configureOfficialGame as junglesisters} from './games/junglesisters.mjs';
import {configureOfficialGame as junglesistersdeluxe} from './games/junglesistersdeluxe.mjs';
import {configureOfficialGame as vampires} from './games/vampires.mjs';
import {configureOfficialGame as bookoffuturia} from './games/bookoffuturia.mjs';

const configurators=new Map([
  ['ind74_official_multihot10',multihot10],
  ['ind74_official_multihot20',multihot20],
  ['ind74_official_multihot5burnwilds',multihot5burnwilds],
  ['ind74_official_multifruitschargingwilds',multifruitschargingwilds],
  ['ind74_official_gemscrownchargingwilds',gemscrownchargingwilds],
  ['ind74_official_gatesofmerlyn',gatesofmerlyn],
  ['ind74_official_coinsofatlantis',coinsofatlantis],
  ['ind74_official_poweroftiger',poweroftiger],
  ['ind74_official_geniesbonanza',geniesbonanza],
  ['ind74_official_mariachicoins',mariachicoins],
  ['ind74_official_hotsamba',hotsamba],
  ['ind74_official_baoslot5x',baoslot5x],
  ['ind74_official_farmsfortune',farmsfortune],
  ['ind74_official_draculasfortune',draculasfortune],
  ['ind74_official_dicejungle',dicejungle],
  ['ind74_official_junglesisters',junglesisters],
  ['ind74_official_junglesistersdeluxe',junglesistersdeluxe],
  ['ind74_official_vampires',vampires],
  ['ind74_official_bookoffuturia',bookoffuturia],
]);
export const ISOLATED_TITLE_CONFIG_IDS=Object.freeze([...configurators.keys()]);
export function configureIsolatedTitle(d){
  const configure=configurators.get(d?.id);if(!configure)return false;configure(d);return true;
}
