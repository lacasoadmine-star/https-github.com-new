import {ReferenceAssetStore, paintScene, minorMoney, validGrid} from '../machine-renderer.mjs';

// Display-only. This module cannot create a round, decide an outcome, change a
// balance, start autoplay, or request any provider session or wallet endpoint.
const box = (x, y, width, height) => ({x, y, width, height});
const money=value=>typeof value==='string'&&/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value)?value:'—';
const STATIC_FIXTURES = {
  vegasnights_native: [
    ['vegas3', 'vegas8', 'vegas4'], ['vegas5', 'wild', 'vegas9'],
    ['vegas10', 'vegas6', 'scatter'], ['vegas7', 'vegas11', 'royal-wild'],
    ['gold', 'vegas4', 'vegas5'],
  ],
  bookofmagic_native: [
    ['nine', 'amulet', 'wizard'], ['sorceress', 'ten', 'j'],
    ['sceptre', 'wild', 'q'], ['k', 'chest', 'scatter'], ['a', 'wizard', 'amulet'],
  ],
};

export function reviewFixture(gameId) {
  const grid = STATIC_FIXTURES[gameId];
  return grid ? {grid: grid.map(column => [...column]), source: 'authored static art fixture; not a spin result'} : {};
}
export function paylineCells(manifest, lineNumber) {
  if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > (manifest.paylines?.length || 0)) return [];
  return manifest.paylines[lineNumber - 1].map((row, column) => [column, row]);
}

function drawingTools(manifest, commands) {
  return {
    sprite(frame, target, extra = {}) {
      if (!manifest.frames[frame]) throw new Error('Unmapped presentation frame: ' + frame);
      commands.push({type: 'sprite', frame, box: target, ...extra});
    },
    image(file, target, extra = {}) {
      if (!manifest.files[file]) throw new Error('Unmapped presentation file: ' + file);
      commands.push({type: 'image', file, box: target, ...extra});
    },
    text(text, x, y, size, color = '#fff3c4') {commands.push({type: 'text', text: String(text), x, y, size, color, align: 'center'});},
    rect(target, color) {commands.push({type: 'rect', box: target, color});},
  };
}
function cellsScene(manifest, snapshot, options, commands, draw) {
  const geometry = manifest.layout.grid;
  const supplied = snapshot.grid || snapshot.round?.grid;
  const grid = validGrid(supplied, manifest) ? supplied : null;
  const cells = snapshot.pending?[]:options.selectedLine ? paylineCells(manifest, options.selectedLine) : (snapshot.wins || snapshot.round?.wins || []).flatMap(win => win.cells || []);
  const winningCells=new Set(cells.filter(cell=>Array.isArray(cell)&&cell.length===2).map(cell=>cell.join(':')));
  const cellBox = (column, row) => box(geometry.x + column * (geometry.cellWidth + geometry.columnGap), geometry.y + row * geometry.cellHeight, geometry.cellWidth, geometry.cellHeight);
  for (let column = 0; column < manifest.grid.columns; column++) {
    for (let row = 0; row < manifest.grid.rows; row++) {
      const cell = cellBox(column, row);
      if (grid) {
        const symbol = manifest.symbols[grid[column][row]];
        // Book's official stills use source-size padding; keep this relationship.
        // Vegas review cells have no claimed provider layout equivalence.
        const frame=snapshot.pending&&symbol.blurFrame?symbol.blurFrame:winningCells.has(column+':'+row)&&symbol.winFallbackFrame?symbol.winFallbackFrame:symbol.frame;
        draw.sprite(frame, cell, {padding: manifest.id === 'bookofmagic_native', clip: cell,role:'symbol',column,row});
      } else {draw.text('—', cell.x + cell.width / 2, cell.y + cell.height / 2, 32, '#9b967e');commands.at(-1).role='empty-cell';}
    }
  }
  for (const [column, row] of cells) {
    if (!Number.isInteger(column) || !Number.isInteger(row) || column < 0 || column >= manifest.grid.columns || row < 0 || row >= manifest.grid.rows) continue;
    const cell = cellBox(column, row);
    commands.push({type: 'outline', box: box(cell.x + 3, cell.y + 3, cell.width - 6, cell.height - 6), color: '#ffe74a', lineWidth: 4});
  }
}
function sourceHeader(draw, width) {
  draw.rect(box(0, 0, width, 70), '#031011e6');
  draw.text('OFFLINE ART REVIEW', width / 2, 28, 24, '#e2f5f2');
  draw.text('Exact source images · authored review scene', width / 2, 54, 17, '#bdd2d0');
}
function footer(draw, width, height) {
  draw.rect(box(0, height - 105, width, 105), '#031011ed');
  draw.text('No spin · no wallet connection · production disabled', width / 2, height - 67, 18, '#edf7f2');
  draw.text('Offline display-list export, not a browser screenshot', width / 2, height - 35, 17, '#b1c8c2');
}
function bookScene(manifest, snapshot, options) {
  const commands = [], draw = drawingTools(manifest, commands), {width, height} = manifest.layout;
  draw.sprite(manifest.background.frame, box(0, 0, width, height));
  if(!options.interactive)sourceHeader(draw, width);
  draw.sprite(manifest.logo.frame, manifest.layout.logo);
  draw.sprite(manifest.board.frame, manifest.layout.reelsBackground);
  cellsScene(manifest, snapshot, options, commands, draw);
  draw.sprite(manifest.board.border, manifest.layout.reelsBorder);
  if(!options.interactive){
  draw.rect(box(35, 766, 740, 185), '#06120be0');
  draw.text('13 SYMBOLS · 20 VERIFIED PAYLINES', width / 2, 807, 24);
  draw.text('Portrait background, title and reel coordinates from Config.js', width / 2, 850, 19, '#d6e6c7');
  draw.text(options.selectedLine ? 'Highlighted cells: payline ' + options.selectedLine : 'Symbols shown are a static review arrangement', width / 2, 891, 20, '#d6e6c7');
  draw.text('Reference controls below: positions are still under review', width / 2, 931, 17, '#e4d1a3');
  }else {draw.text('WIN',width/2,805,22);draw.text((snapshot.round?minorMoney(snapshot.round.status==='active'?snapshot.round.currentCashoutMinor:snapshot.round.payoutMinor):'—')+' ETB',width/2,852,38);draw.text('BET '+money(snapshot.stake)+' ETB',width/2,916,24);}
  const control = name => manifest.controls[name]?.idle;
  for (const [name, x] of [['home', 45], ['menu', 166], ['sound', 287], ['info', 408], ['autoPlay', 529], ['moreBet', 650]]) {
    draw.sprite(control(name), box(x, 987, 100, 100), {opacity:options.interactive?1:.8});
  }
  // Source button layers are shown together only as an authored reference strip.
  // This is intentionally not an active or provider-matched control surface.
  for (const [i, layer] of manifest.controls.spin.layers.entries()) {
    draw.sprite(layer, i === 0 ? box(196, 1114, 417, 132) : box(208, 1126, 393, 108));
  }
  if(options.interactive&&snapshot.pending)draw.rect(box(383,1158,44,44),'#ffffff');else draw.sprite(control('spin'), box(364, 1139, 82, 82));
  if(!options.interactive)footer(draw,width,height);else {draw.rect(box(0,height-100,width,100),'#031011ed');draw.text('BALANCE '+money(snapshot.balance)+' ETB',width/2,height-50,26);}
  const controlsGeometry=manifest.id==='bookofmagic_native'?{play:box(196,1114,417,132),menu:box(166,987,100,100),sound:box(287,987,100,100),help:box(408,987,100,100),autoplay:box(529,987,100,100),bet:box(650,987,100,100)}:{play:box(384,1308,231,231),autoplay:box(164,1380,80,80),bet:box(755,1380,80,80),menu:box(96,1580,60,60),sound:box(270,1580,60,60),help:box(668,1580,60,60)};
  return {width,height,commands,gridGeometry:manifest.layout.grid,controlsGeometry};
}
function vegasScene(manifest, snapshot, options) {
  const commands = [], draw = drawingTools(manifest, commands), {width, height} = manifest.layout;
  const freeSpins = snapshot.phase === 'free-spins';
  draw.sprite(freeSpins ? manifest.background.freeSpinsFrame : manifest.background.frame, box(0, 0, width, height));
  if(!options.interactive)sourceHeader(draw, width);
  draw.sprite(manifest.logo.frame, manifest.layout.logo);
  draw.sprite(freeSpins ? manifest.board.freeSpinsFrame : manifest.board.frame, manifest.layout.board);
  // The provider's reel-frame texture includes opaque blue reel wells. It must
  // precede symbols, otherwise the correct symbols are completely concealed.
  cellsScene(manifest, snapshot, options, commands, draw);
  if(!options.interactive){
  draw.rect(box(70, 1088, 859, 176), '#140f22e8');
  draw.text('13 SYMBOL IDENTITIES · 25 VERIFIED PAYLINES', width / 2, 1128, 25);
  draw.text(options.selectedLine ? 'Highlighted cells: payline ' + options.selectedLine : 'Symbols shown are a static review arrangement', width / 2, 1173, 22, '#f0d9ff');
  draw.text('Original frames · authored placement · full layout still under review', width / 2, 1225, 19, '#d5bddb');
  }else {draw.text('WIN',width/2,1135,24);draw.text((snapshot.round?minorMoney(snapshot.round.status==='active'?snapshot.round.currentCashoutMinor:snapshot.round.payoutMinor):'—')+' ETB',width/2,1190,42);draw.text('BET '+money(snapshot.stake)+' ETB',width/2,1240,24);}
  const spin = options.interactive&&snapshot.pending?manifest.controls.spin.pressed:manifest.controls.spin.idle;
  draw.sprite(spin, box(384, 1308, 231, 231), {opacity:options.interactive?1:.75});
  if(options.interactive&&snapshot.pending&&manifest.frames['GUI_v11_desktop/s_Spin_Stop_Icon'])draw.sprite('GUI_v11_desktop/s_Spin_Stop_Icon',box(447,1371,105,105));
  for (const [name, x] of [['autoPlay', 164], ['bet', 755]]) draw.sprite(manifest.controls[name].idle, box(x, 1380, 80, 80), {opacity:options.interactive?1:.7});
  for (const [name, x] of [['menu', 96], ['sound', 270], ['info', 668], ['home', 842]]) draw.sprite(name==='sound'&&snapshot.soundEnabled===false&&manifest.frames['GUI/s_SoundMute']?'GUI/s_SoundMute':manifest.controls[name].idle, box(x, 1580, 60, 60), {opacity:options.interactive?1:.7});
  if(!options.interactive)footer(draw,width,height);else {draw.rect(box(0,height-100,width,100),'#031011ed');draw.text('BALANCE '+money(snapshot.balance)+' ETB',width/2,height-50,26);}
  const controlsGeometry=manifest.id==='bookofmagic_native'?{play:box(196,1114,417,132),menu:box(166,987,100,100),sound:box(287,987,100,100),help:box(408,987,100,100),autoplay:box(529,987,100,100),bet:box(650,987,100,100)}:{play:box(384,1308,231,231),autoplay:box(164,1380,80,80),bet:box(755,1380,80,80),menu:box(96,1580,60,60),sound:box(270,1580,60,60),help:box(668,1580,60,60)};
  return {width,height,commands,gridGeometry:manifest.layout.grid,controlsGeometry};
}
function helpScene(manifest) {
  const commands = [], draw = drawingTools(manifest, commands), width = 810;
  const panels = (manifest.helpPanels || []).filter(item => !['background.png', 'border.png'].includes(item.name));
  const rows = Math.ceil(panels.length / 2), height = 250 + rows * 280 + 150;
  draw.rect(box(0, 0, width, height), manifest.id === 'moonstone_native' ? '#10292f' : '#172514');
  sourceHeader(draw, width);
  draw.text(manifest.name.toUpperCase(), width / 2, 126, 38, '#f8e7b5');
  draw.text('Verified help artwork only', width / 2, 176, 24, '#c3e6d2');
  draw.text('Gameplay scene, native symbol mapping and controls are unfinished', width / 2, 216, 18, '#d4dace');
  panels.forEach((panel, index) => {
    const x = 35 + (index % 2) * 395, y = 258 + Math.floor(index / 2) * 280;
    draw.rect(box(x, y, 345, 245), '#0a1514');
    draw.image(panel.file, box(x + 10, y + 10, 325, 185));
    draw.text(panel.label, x + 172.5, y + 220, 17, '#e5d8a7');
  });
  footer(draw, width, height);
  return {width, height, commands};
}
function unavailableScene(manifest) {
  const commands = [], draw = drawingTools(manifest, commands), width = 810, height = 800;
  draw.rect(box(0, 0, width, height), '#101c24');
  sourceHeader(draw, width);
  draw.text(manifest.name.toUpperCase(), width / 2, 240, 42);
  draw.text('No verified public game art found', width / 2, 350, 28, '#d8e0df');
  draw.text('Artwork and gameplay presentation remain unfinished.', width / 2, 420, 22, '#b2c7c1');
  draw.text('No other machine or generated symbols are substituted.', width / 2, 465, 20, '#b2c7c1');
  footer(draw, width, height);
  return {width, height, commands};
}

export function createRemainingScene(manifest, snapshot = {}, options = {}) {
  if (!manifest || manifest.productionLaunchEnabled !== false) throw new Error('This is a closed presentation review renderer');
  if(options.interactive&&(snapshot.confirmed!==true||snapshot.authenticated!==true||snapshot.round&&(snapshot.round.gameId||snapshot.round.game_id)!==manifest.id))snapshot={};
  let result;
  if (manifest.id === 'bookofmagic_native') result = bookScene(manifest, snapshot, options);
  else if (manifest.id === 'vegasnights_native') result = vegasScene(manifest, snapshot, options);
  else if (manifest.presentationStatus === 'help-art-only') result = helpScene(manifest);
  else result = unavailableScene(manifest);
  return {schemaVersion: 1, gameId: manifest.id, financialActions: false, productionLaunchEnabled: false, reviewOnly: true, browserVerified: false, ...result};
}
export function createStaticReviewScene(manifest, options = {}) {
  return createRemainingScene(manifest, reviewFixture(manifest.id), options);
}

export function validateStaticSvg(bytes) {
  const source = new TextDecoder().decode(bytes);
  if (!/<svg[\s>]/i.test(source) || /<(script|foreignObject)\b|<!DOCTYPE|<!ENTITY|\bon[a-z]+\s*=/i.test(source)) throw new Error('Unsupported active SVG content');
  for (const match of source.matchAll(/(?:href\s*=\s*["']|url\(\s*["']?)([^"')\s>]+)/gi)) {
    if (!match[1].startsWith('#')) throw new Error('SVG external reference is not permitted');
  }
  return source;
}

// Normal images reuse the shared loader. SVGs keep the same byte/hash gate and
// use a declared image MIME type; no provider script or DOM markup is executed.
export class RemainingAssetStore extends ReferenceAssetStore {
  async loadImage(file) {
    if (!file.endsWith('.svg')) return super.loadImage(file);
    if (this.images.has(file)) return this.images.get(file);
    const pending = (async () => {
      const bytes = await this.loadBytes(file);
      validateStaticSvg(bytes);
      const blob = new Blob([bytes], {type: 'image/svg+xml'});
      return this.decodeImage(async () => {
      if (typeof createImageBitmap === 'function') {
        try {return await createImageBitmap(blob);} catch { /* SVG support differs by browser. */ }
      }
      if (typeof Image === 'undefined') throw new Error('SVG image decoding needs a browser image implementation');
      const url = URL.createObjectURL(blob); this.urls.push(url);
      return new Promise((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Static SVG decode failed')); image.src = url;
      });
      });
    })();
    this.images.set(file, pending);
    try {return await pending;} catch (error) {this.images.delete(file); throw error;}
  }
}

export {paintScene, minorMoney};
