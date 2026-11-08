#!/usr/bin/env node
// Authored mappings of public static art. Provider runtimes are neither stored
// here nor executed. Layout confidence is recorded separately from art identity.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {normalizeFrame, normalizeTextureAtlas} from '../atlas.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VEGAS_SYMBOLS = [
  ['scatter', 'Welcome Vegas scatter sign'], ['wild', 'Silver wild chip'],
  ['vegas3', 'Hostess'], ['vegas4', 'Red sports car'],
  ['vegas5', 'Roulette wheel'], ['vegas6', 'Red die'],
  ['vegas7', 'Playing cards'], ['vegas8', 'A'], ['vegas9', 'K'],
  ['vegas10', 'Q'], ['vegas11', 'J'], ['royal-wild', 'Converted gold wild chip'],
  ['gold', 'Gold SuperWild chip'],
];
const BOOK_SYMBOLS = [
  ['nine', '9'], ['ten', '10'], ['j', 'J'], ['q', 'Q'], ['k', 'K'], ['a', 'A'],
  ['amulet', 'Winged necklace'], ['sceptre', 'Magic sceptre'],
  ['chest', 'Treasure chest'], ['sorceress', 'Sorceress'],
  ['wizard', 'Wizard'], ['wild', 'Wild book'], ['scatter', 'Crystal-ball scatter'],
];
const HELP_LABELS = {
  'background.png': 'Help panel border', 'firstSlideWild.png': 'Wild substitution illustration',
  'firstSlideWilds.png': 'Stacked wild illustration', 'bonusSymbol.png': 'Bonus symbol',
  'fourthSlide.png': 'Consecutive-reel bonus illustration',
  'thirdSlideObjects.png': 'Symbol identities shown in help',
  'moonStoneBuyBonus.png': 'Buy-bonus help artwork', 'border.png': 'Help panel border',
  'help-1-left.png': 'Wild substitution illustration', 'help-1-right.png': 'Stacked wild illustration',
  'one-one.png': 'Samurai', 'one-two.png': 'Woman with parasol',
  'one-three.png': 'Elder', 'one-four.png': 'Flowering tree',
  'one-five.png': 'Inscribed scroll', 'two-one.png': 'Mountain landscape',
  'two-two.png': 'Sushi', 'two-three.png': 'Paired fish',
  'two-four.png': 'Helmet', 'two-five.png': 'Bonus wave',
  'help-4.png': 'Consecutive-reel bonus illustration',
};
const SAMURAI_HELP_IDS = {
  'one-one.png': 9, 'one-two.png': 8, 'one-three.png': 7,
  'one-four.png': 6, 'one-five.png': 5, 'two-one.png': 4,
  'two-two.png': 3, 'two-three.png': 2, 'two-four.png': 1, 'two-five.png': 10,
};

function base(id, lock) {
  return {
    schemaVersion: 1, id, name: lock.games[id].name,
    sourceInventory: '../source-inventory.json', assetLock: '../assets.lock.json',
    productionLaunchEnabled: false, financialActions: false,
    providerRuntimeIncluded: false, providerRuntimeExecuted: false,
    officialPrivateMathVerified: false, browserVerified: false,
    grid: null, frames: {}, symbols: {}, files: {}, fonts: [], audio: {}, controls: {},
    presentationStatus: 'incomplete', fidelityGaps: [],
  };
}
function attachFiles(manifest, lock) {
  const referenced = new Set(Object.values(manifest.frames).map(frame => frame.file));
  for (const item of manifest.helpPanels || []) referenced.add(item.file);
  for (const file of referenced) {
    const entry = lock.assets.find(asset => asset.file === file && asset.games.includes(manifest.id));
    if (!entry) throw new Error('Unproven asset mapping: ' + file);
    manifest.files[file] = {...entry};
  }
  return manifest;
}
function texture(lock, file) {
  const result = lock.assets.find(asset => asset.file === file);
  if (!result) throw new Error('Missing locked texture');
  return result;
}
function nguiFrames(inventory, lock) {
  const frames = {};
  for (const atlas of inventory.vegas.atlases) {
    const source = texture(lock, inventory.vegas.textureFiles[atlas.texture]);
    for (const [sprite, value] of Object.entries(atlas.sprites)) {
      const name = atlas.name + '/' + sprite;
      const left = value.paddingLeft || 0, top = value.paddingTop || 0;
      const frame = normalizeFrame(name, {
        frame: {x: value.x || 0, y: value.y || 0, w: value.width, h: value.height},
        spriteSourceSize: {x: left, y: top, w: value.width, h: value.height},
        sourceSize: {w: value.width + left + (value.paddingRight || 0), h: value.height + top + (value.paddingBottom || 0)},
      }, source);
      frame.providerAtlasId = atlas.id;
      frame.providerTextureId = atlas.texture;
      if (['borderLeft', 'borderRight', 'borderTop', 'borderBottom'].some(key => value[key])) {
        frame.referenceBorders = Object.fromEntries(['borderLeft', 'borderRight', 'borderTop', 'borderBottom'].map(key => [key, value[key] || 0]));
      }
      frames[name] = frame;
    }
  }
  return frames;
}
function fullFrame(name, file, lock) {
  const source = texture(lock, file);
  return normalizeFrame(name, {frame: {x: 0, y: 0, w: source.width, h: source.height}}, source);
}

export function buildRemainingManifests(inventory, lock) {
  if (inventory.schemaVersion !== 1 || lock.schemaVersion !== 1) throw new Error('Unsupported source inventory');
  const vegas = base('vegasnights_native', lock);
  Object.assign(vegas, {
    presentationStatus: 'reference-art-review', grid: {columns: 5, rows: 3},
    frames: nguiFrames(inventory, lock), paylines: inventory.vegas.paylinePaths,
    background: {frame: 'background_portrait/s_bg_portrait', freeSpinsFrame: 'background_portrait/s_bg_fs_portrait'},
    logo: {frame: 'title/s_vegas_title'},
    board: {frame: 'reels_frame/s_reels_frame', freeSpinsFrame: 'reels_frame/s_reels_frame_FS'},
    controls: {
      spin: {idle: 'GUI_v11_desktop/s_spin_normal', hover: 'GUI_v11_desktop/s_spin_hover', pressed: 'GUI_v11_desktop/s_spin_pressed'},
      autoPlay: {idle: 'GUI_v11/s_autoplay'}, bet: {idle: 'GUI_v11/s_bets'},
      menu: {idle: 'GUI/s_Menu'}, sound: {idle: 'GUI/s_Sound'},
      info: {idle: 'GUI_v11/s_paytable'}, home: {idle: 'GUI_v11/s_home'},
    },
    layout: {
      width: 999, height: 1777, basis: 'Authored portrait review arrangement using exact public frames',
      exactProviderViewportArrangement: false,
      board: {x: 29, y: 523, width: 941, height: 516.5},
      grid: {x: 86, y: 576, cellWidth: 165.5, cellHeight: 142, columnGap: 0},
      logo: {x: 249, y: 227, width: 501, height: 159},
    },
    verifiedPresentation: [
      '13 distinct provider symbol IDs, ordinary/converted/SuperWild identities, idle/blurred/thumbnail frames',
      'Base/free-spin backgrounds, reel frames, title and mapped static controls',
      '25 exact public payline paths',
    ],
    fidelityGaps: [
      'Full NGUI responsive layout and control-state transitions have not been reconstructed or browser compared.',
      'Fallback stills do not reproduce full symbol, win, bonus and transition animations; external lazy animation textures remain unfetched.',
      'Audio, interactive rules/paytable panels, actual autoplay menus and mobile/landscape parity remain unfinished.',
      'Static assets and a draw-only renderer do not establish complete public-rule or private-math parity.',
    ],
  });
  for (const [index, [id, label]] of VEGAS_SYMBOLS.entries()) {
    const key = String(index + 1).padStart(2, '0');
    const fallback = 'symbol' + key + '_win_fallback/' + Object.keys(inventory.vegas.atlases.find(atlas => atlas.name === 'symbol' + key + '_win_fallback').sprites)[0];
    vegas.symbols[id] = {providerId: index + 1, label, frame: 'symbol' + key + '/s_' + key + '_idle', blurFrame: 'symbols_blurred/s_' + key + '_blurred', thumbnailFrame: 'symbol_thumbnails/s_' + key + '_thumbnail', winFallbackFrame: fallback};
  }

  const book = base('bookofmagic_native', lock);
  for (const atlas of inventory.book.atlases) {
    const source = texture(lock, atlas.file);
    if (source.width !== atlas.data.meta.size.w || source.height !== atlas.data.meta.size.h) throw new Error('Book atlas dimensions differ from PNG fallback');
    for (const [key, frame] of Object.entries(normalizeTextureAtlas(atlas.data, source))) {
      const name = atlas.name + '/' + key;
      book.frames[name] = {...frame, name, atlasSourceId: atlas.sourceId};
    }
  }
  for (const [name, file] of Object.entries(inventory.book.controls)) book.frames['controls/' + name] = fullFrame('controls/' + name, file, lock);
  Object.assign(book, {
    presentationStatus: 'reference-art-review', grid: {columns: 5, rows: 3},
    paylines: inventory.book.paylinePaths,
    background: {frame: 'background/background_Portrait.png'},
    logo: {frame: 'mainResources/gameName_Portrait.png'},
    board: {frame: 'mainResources/reelsBackground_Portrait.png', border: 'mainResources/reelBorder_Portrait.png'},
    layout: {...inventory.book.portrait, exactProviderCoreGeometry: true, exactProviderControlPlacement: false},
    controls: {
      spin: {idle: 'controls/icon-play-DGsvOx8c', layers: ['controls/play-button-outer-layer-Cz9-PWG6', 'controls/play-button-inner-bottom-layer-8u5au0bO', 'controls/play-button-inner-top-layer-QGG6tITv']},
      autoPlay: {idle: 'controls/icon-auto-play-Dg2lfP4E', disabled: 'controls/icon-auto-play-inactive-Dz5zrbay'},
      menu: {idle: 'controls/menu-button-2n_AQCzw'}, sound: {idle: 'controls/volume-button-vsRSMr2m'},
      info: {idle: 'controls/icon-information-Cv2WCea4'}, home: {idle: 'controls/home-button-CUF9tmSX'},
      lessBet: {idle: 'controls/button-betstepper-enabled-minus-CIFyMRL2'},
      moreBet: {idle: 'controls/button-betstepper-enabled-plus-Bg0HyVKC'},
    },
    imageDecoding: 'Exact public GameUI PNG fallback for KTX2 atlas metadata; all four PNGs returned HTTP 200 with matching dimensions.',
    verifiedPresentation: [
      '13 distinct provider symbol IDs and an additional scatter still',
      'Actual 810 by 1440 portrait background, title, reel border and configured core geometry',
      '20 exact public payline paths and 12 observed current GameUI SVG assets',
    ],
    fidelityGaps: [
      'GameUI control composition, positions, hit areas and responsive states still need comparison with the actual running official demo.',
      'Win/free-spin transitions, animations, audio, feature panels and landscape presentation remain incomplete.',
      'The observed demo startup has an age-confirmation wall; this task did not assert age or bypass that gate.',
      'Static presentation does not validate official mathematics or make the underlying draft launch ready.',
    ],
  });
  for (const [providerId, [id, label]] of BOOK_SYMBOLS.entries()) {
    const key = String(providerId).padStart(2, '0');
    book.symbols[id] = {providerId, label, frame: 'reelImages/' + key + '.png', thumbnailFrame: 'smallReelImages/s' + key + '.png'};
  }
  book.presentationVariants = {scatterAlternate: 'reelImages/13.png'};

  const helpGames = ['moonstone_native', 'samurai_native'].map(id => {
    const manifest = base(id, lock);
    manifest.presentationStatus = 'help-art-only';
    manifest.helpPanels = inventory.helpFiles[id].map(item => ({...item, label: HELP_LABELS[item.name] || item.name, ...(id === 'samurai_native' && Object.hasOwn(SAMURAI_HELP_IDS, item.name) ? {providerSymbolId: SAMURAI_HELP_IDS[item.name]} : {})}));
    manifest.verifiedPresentation = ['Exact public help images referenced by the current first-party help CSS; these are not gameplay textures.'];
    manifest.fidelityGaps = [
      'Actual gameplay atlas, background, reel frame, controls, animations, audio and responsive arrangement remain unresolved.',
      'Help illustrations are not substituted for a complete gameplay presentation.',
      'Native draft symbol IDs are intentionally not assigned to these help-only images without a verified game bootstrap mapping.',
    ];
    return manifest;
  });
  const magic = base('magicgarden_native', lock);
  magic.presentationStatus = 'no-verified-public-art';
  magic.fidelityGaps = ['Observed Magic Garden help, CSS and script routes did not expose usable artwork. No other game is substituted.', 'Actual symbol mapping, geometry, controls, animation, audio and responsive presentation are unresolved.'];
  return [vegas, book, ...helpGames, magic].map(manifest => attachFiles(manifest, lock));
}

export async function writeRemainingManifests(root = HERE) {
  const inventory = JSON.parse(await readFile(join(root, 'source-inventory.json'), 'utf8'));
  const lock = JSON.parse(await readFile(join(root, 'assets.lock.json'), 'utf8'));
  const manifests = buildRemainingManifests(inventory, lock);
  await mkdir(join(root, 'manifests'), {recursive: true});
  for (const manifest of manifests) await writeFile(join(root, 'manifests', manifest.id + '.json'), JSON.stringify(manifest, null, 2) + '\n');
  const index = {schemaVersion: 1, productionLaunchEnabled: false, assetCacheCommitted: false, games: Object.fromEntries(manifests.map(manifest => [manifest.id, {
    name: manifest.name, file: 'manifests/' + manifest.id + '.json', status: manifest.presentationStatus,
    renderer: './renderer.mjs', capabilities: {staticArt: Object.keys(manifest.files).length > 0, mappedGameplaySymbols: Object.keys(manifest.symbols).length > 0, officialCoreGeometry: manifest.layout?.exactProviderCoreGeometry === true, fullMachineParity: false, financialActions: false, browserVerified: false},
  }]))};
  await writeFile(join(root, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  return manifests;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifests = await writeRemainingManifests();
  console.log(JSON.stringify(manifests.map(item => ({id: item.id, status: item.presentationStatus, frames: Object.keys(item.frames).length, files: Object.keys(item.files).length})), null, 2));
}
