#!/usr/bin/env node
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {normalizeFrame, normalizeTextureAtlas, parseSpineAtlas, normalizeSpineRegions} from './atlas.mjs';
import {verifyAssetBytes} from '../scripts/fetch-reference-assets.mjs';
import {withSmartSoftNativeAssets} from './smartsoft-native-assets.mjs';
import {withSmartSoftStartupAssets} from './smartsoft-startup-assets.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const names = {
  multihot40_native: 'Multi Hot 40', multihot100_native: 'Multi Hot 100',
  multihot5superwilds_native: 'Multi Hot 5 Super Wilds', multihot5wild_native: 'Multi Hot 5 Wild',
  multihotwildways_native: 'Multi Hot Wild Ways', habeshafortune5_native: 'Habesha Fortune 5', safarisimba_native: 'Safari Simba',
  multihotdeluxe_native:'Multi Hot 5 Deluxe',burningice_native:'Burning Ice 5',burningice10_native:'Burning Ice 10',burningice40_native:'Burning Ice 40',
};

// These descriptors concern visible artwork only. The three displayed positions
// are not a claim about the provider's multiplier-selection probabilities.
const LEFT_MULTIPLIERS = {
  multihotwildways_native: {gapRatio:.05, rowCenters:[.21,.5,.79], numberScale:1},
  multihot5wild_native: {gapRatio:.05, rowCenters:[.21,.5,.79], numberScale:1},
  multihotdeluxe_native: {gapRatio:-.015, rowCenters:[1/6,.5,5/6], numberScale:1},
  safarisimba_native: {gapRatio:-.025, rowCenters:[.18,.5,.82], numberScale:1.5},
  habeshafortune5_native: {gapRatio:-.025, rowCenters:[.18,.5,.82], numberScale:1},
};

export function first11FeatureDescriptors(id, frames, presentation={}) {
  const mappedFrame=key=>frames['@Image/'+key]?'@Image/'+key:frames[key]?key:null;
  let featurePresentation=presentation.feature?{type:presentation.feature,iceLogoFrame:mappedFrame(presentation.iceLogoFrame),lineIconsFrame:mappedFrame(presentation.lineIconsFrame),holdFrame:mappedFrame('Start/HoldActive'),declaredUnfetchedAnimations:presentation.declaredUnfetchedAnimations||[]}:null;
  const side=LEFT_MULTIPLIERS[id];
  if(side&&frames['Multiplier/Background'])featurePresentation={
    ...featurePresentation,type:'vertical-multipliers',position:'left',visibleRows:3,selectedRow:1,
    backgroundFrame:'Multiplier/Background',backgroundFillFrame:mappedFrame('Multiplier/BackgroundBorder'),
    slotFrame:mappedFrame('Multiplier/Bottom'),activeSlotFrame:mappedFrame('Multiplier/BottomActive'),activeBorderFrame:mappedFrame('Multiplier/TopActive'),
    values:[1,2,3,4,5],valueFrames:Object.fromEntries([1,2,3,4,5].map(value=>[value,mappedFrame('Multiplier/'+value)])),
    activeValueFrames:Object.fromEntries([1,2,3,4,5].map(value=>[value,mappedFrame('Multiplier/Active-'+value)])),
    ...side,
    source:'Official free-demo visual audit 2026-11-09: left-side strip, three visible positions, selected value in the middle. Original locked atlas frames retained. Authored mobile placement; neighboring labels are decorative unless explicitly supplied.',
  };
  const wheel=/^multihot(?:40|100)_native$/.test(id)||id==='multihot5superwilds_native';
  const multiplier=wheel?{type:'wheel',values:[1,2,3,4,5],angleNumerators:[null,3,5,2,4,1],angleDenominator:7,angleUnit:'pi',normal:'Multiplier/Numbers',light:'Multiplier/Light',background:'Multiplier/Background',source:'Public MultiHot40.js / MultiHot100.js drawWheelRotationStop mapping; artwork and angle are presentation only.'}:null;
  if(id==='multihot5superwilds_native')Object.assign(multiplier,{
    placement:'above-board',
    source:'SuperWilds wheel observed above the board in the official free demo. Its locked Numbers, Light and Background frames decode to identical RGBA pixels and original geometry as the established MultiHot40/100 wheel; reuse that artwork orientation, not outcome selection.',
  });
  return {featurePresentation,multiplier};
}

export async function buildManifests(lock, {readAsset, publicConfigs = []} = {}) {
  const byURL = new Map(lock.assets.flatMap(asset => asset.urls.map(url => [url, asset])));
  const manifests = {};
  async function bytes(asset) { const data = await readAsset(asset); verifyAssetBytes(asset, data); return data; }
  const lookup = url => { const value = byURL.get(url); if (!value) throw new Error('Dependency is not in locked inventory: ' + url); return value; };
  for (const [id, inventory] of Object.entries(lock.games)) {
    const name = inventory.name, presentation=inventory.presentation||{}, assetBaseName=presentation.assetBaseName||name, config = publicConfigs.find(item => item.id === id), frames = {}, atlases = [], spine = [], fonts = [], audio = {};
    const missing = [], files = {};
    const belongs = url => decodeURIComponent(new URL(url).pathname).includes('/' + assetBaseName + '/');
    const observedURLs=asset=>asset.references?asset.references.filter(reference=>reference.games.includes(id)).map(reference=>reference.url):asset.urls;
    const assets = lock.assets.filter(asset => asset.games.includes(id));
    let background = null, logo = null;
    for (const asset of assets) {
      files[asset.file] = {sha256: asset.sha256, bytes: asset.bytes, kind: asset.kinds, urls: observedURLs(asset)};
      const source = observedURLs(asset).find(belongs);
      if (asset.kinds.includes('font')) fonts.push({file: asset.file, name: decodeURIComponent(new URL(asset.urls[0]).pathname.split('/').at(-1)), sha256: asset.sha256});
      if (asset.kinds.includes('audio'))for(const soundSource of observedURLs(asset).filter(belongs))audio[decodeURIComponent(new URL(soundSource).pathname.split('/Content/Sound/' + assetBaseName + '/')[1] || new URL(soundSource).pathname.split('/').at(-1))] = {file: asset.file, sha256: asset.sha256};
      if (source && /\/background\.(png|webp|jpe?g)$/i.test(source)) background = {file: asset.file, sha256: asset.sha256, source};
      if (!source || !asset.kinds.includes('texture-atlas') || !source.includes('/Images/Sprites/')) continue;
      try {
        const data = JSON.parse((await bytes(asset)).toString('utf8'));
        const textureURL = new URL(data.meta.image, source).href, texture = lookup(textureURL);
        await bytes(texture);
        const normalized = normalizeTextureAtlas(data, {file: texture.file, sha256: texture.sha256});
        for (const [key, value] of Object.entries(normalized)) {
          if (frames[key]) throw new Error('Duplicate UI frame: ' + key);
          frames[key] = value;
        }
        atlases.push({source, file: asset.file, textureFile: texture.file, frames: Object.keys(normalized).length, size: data.meta.size});
      } catch (error) { missing.push({asset: asset.file, source, error: error.message}); }
    }
    for(const[key,image]of Object.entries(presentation.wholeImageFrames||{})){
      try{const asset=lookup(image.url);await bytes(asset);frames[key]=normalizeFrame(key,{frame:{x:0,y:0,w:image.width,h:image.height}},{file:asset.file,sha256:asset.sha256,width:image.width,height:image.height});}
      catch(error){missing.push({source:image.url,error:error.message});}
    }
    // Preserve exact page/region names for every inventoried Spine group. The
    // authored first-pair adapter uses only the proven static logo attachment.
    for (const asset of assets.filter(item => item.kinds.includes('spine-atlas'))) {
      const source = asset.urls.find(belongs); if (!source) continue;
      const path = decodeURIComponent(new URL(source).pathname), group = path.split('/Spine/')[1]?.split('/')[0];
      if (!group) continue;
      try {
        const text = (await bytes(asset)).toString('utf8'), parsed = parseSpineAtlas(text), textures = {};
        for (const page of parsed.pages) { const texture = lookup(new URL(page.name, source).href); await bytes(texture); textures[page.name] = {file: texture.file, sha256: texture.sha256}; }
        const regions = normalizeSpineRegions(text, textures), skeletonURL = source.replace(/\.atlas\.txt$/, '.json'), skeletonAsset = byURL.get(skeletonURL);
        let skeleton = null;
        if (skeletonAsset) skeleton = JSON.parse((await bytes(skeletonAsset)).toString('utf8'));
        const item = {group, source, atlasFile: asset.file, skeletonFile: skeletonAsset?.file || null, version: skeleton?.skeleton?.spine || null, pages: parsed.pages.map(page => ({name: page.name, ...textures[page.name]})), regionCount: Object.keys(regions).length, animationNames: Object.keys(skeleton?.animations || {})};
        spine.push(item);
        if ((group === 'Logo'||/\/Spine\/Start\/Logo\//.test(path)) && skeleton) {
          const skin = Array.isArray(skeleton.skins) ? skeleton.skins.find(item => item.name === 'default')?.attachments : skeleton.skins.default;
          if(id==='multihotdeluxe_native'&&regions['5X']&&regions['Layer 1']){
            // Both named title parts are plain rectangular meshes on the same
            // master bone. Preserve their actual setup coordinates; the first
            // slot is a flame effect and is not the title's base artwork.
            const layers=['5X','Layer 1'].map(name=>{
              const attachment=skin?.[name]?.[name];
              if(attachment?.vertices?.length!==8)throw new Error('Unsupported Deluxe static title mesh');
              const xs=attachment.vertices.filter((_,index)=>index%2===0),ys=attachment.vertices.filter((_,index)=>index%2===1);
              const key='@Logo/'+name;frames[key]=regions[name];
              return{frame:key,box:{x:Math.min(...xs),y:-Math.max(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}};
            });
            const minX=Math.min(...layers.map(item=>item.box.x)),minY=Math.min(...layers.map(item=>item.box.y));
            logo={frame:layers[0].frame,layers,bounds:{x:minX,y:minY,width:Math.max(...layers.map(item=>item.box.x+item.box.width))-minX,height:Math.max(...layers.map(item=>item.box.y+item.box.height))-minY},source:skeletonURL,staticPoseOnly:true,omittedAnimatedLayers:['fire','fire2','light sweep','deluxe2','5']};
            continue;
          }
          const slot = /\/Spine\/Start\/Logo\//.test(path)?skeleton.slots.find(item=>item.name==='logo'&&item.attachment):skeleton.slots.find(item => item.attachment && item.blend !== 'additive');
          const attachment = skin?.[slot?.name]?.[slot?.attachment], regionName = attachment?.path || slot?.attachment;
          if (regions[regionName]) {
            const key = '@Logo/' + regionName; frames[key] = regions[regionName];
            logo = {frame: key, source: skeletonURL, attachmentName: slot.attachment, staticPoseOnly: true};
          }
        }
      } catch (error) { missing.push({asset: asset.file, source, error: error.message}); }
    }
    const symbols = {};
    for (const symbol of config?.symbols || []){
      const override=presentation.symbolOverrides?.[symbol.id],frame=override?.frame||'Box/'+symbol.id;
      const blurFrame=override?.blurFrame||['Box/Blur/'+symbol.id,'BlurBox/'+symbol.id].find(key=>frames[key])||null;
      if(frames[frame])symbols[symbol.id]={frame,blurFrame:frames[blurFrame]?blurFrame:null,label:symbol.label};
    }
    if (!Object.keys(symbols).length) for (let index = 0; index < inventory.grid.symbolCount; index++) if (frames['Box/' + index]) symbols[String(index)] = {frame: 'Box/' + index, blurFrame: frames['Box/Blur/' + index] ? 'Box/Blur/' + index : null, label: 'Symbol ' + index};
    const controls = {};
    for (const [id, prefix] of Object.entries({spin: 'Spin', bet: 'Bet', autoPlay: 'AutoPlay', collect: 'DoubleTake', gamble: 'Double', menu: 'Menu', sound: 'SoundOn', turbo: 'QuickPlay'})) {
      controls[id] = Object.fromEntries([['idle',''],['hover','Hover'],['active','Active'],['disabled','Disabled'],['stop','Stop']].filter(([,suffix]) => frames['Buttons/' + prefix + suffix]).map(([state,suffix]) => [state,'Buttons/' + prefix + suffix]));
    }
    if (!background) {
      const candidates=assets.flatMap(asset=>observedURLs(asset).filter(url=>/\/background\.(png|webp|jpe?g)$/i.test(url)).map(source=>({file:asset.file,sha256:asset.sha256,source,observedCrossGameDependency:true})));
      if(candidates.length===1)background=candidates[0];
    }
    if (!background) {
      const key = Object.keys(frames).find(key => /^(?:Start\/)?Background$/i.test(key) && frames[key].width > 200);
      if (key) background = {frame:key, file:frames[key].file, sha256:frames[key].textureSha256};
    }
    if (!logo) {
      const key = [presentation.logoFrame&&'@Image/'+presentation.logoFrame,presentation.logoFrame,'Start/logo','Start/Logo','Common/Logo','Logo'].filter(Boolean).find(key => frames[key]?.width > 10);
      if (key) logo = {frame:key, staticPoseOnly:true};
    }
    const mappedFrame=key=>frames['@Image/'+key]?'@Image/'+key:frames[key]?key:null;
    const board=presentation.boardColumnFrame?{type:'columns',frame:mappedFrame(presentation.boardColumnFrame),activeFrame:mappedFrame(presentation.boardColumnFrame.replace('Column','ColumnActive'))}:{type:'single',frame:presentation.boardFrame||'Box/Background'};
    const expectedSymbolCount = config?.symbols?.length || inventory.grid.symbolCount;
    const adapterReady = !!background && Object.keys(symbols).length === expectedSymbolCount && !!frames[board.frame];
    const features=first11FeatureDescriptors(id,frames,presentation);
    manifests[id] = {
      schemaVersion: 1, id, name: names[id] || name, providerName: name, source: inventory.officialDemo,
      status: adapterReady ? 'asset-backed-presentation-review' : 'incomplete-asset-mapping', productionLaunchEnabled: false,
      grid: {columns: config?.columns || inventory.grid.reels, rows: config?.rows || inventory.grid.rows}, symbols, frames, atlases, spine, fonts, audio, background, logo, controls, files,board,symbolPlacement:presentation.symbolPlacement||null,
      featurePresentation:features.featurePresentation,
      layout: {referenceWidth:420, referenceHeight:900, provenance:'Authored mobile review layout; first Multi Hot geometry derives from the existing player-machines hundredLayout. Full official mobile/desktop parity is not yet verified.'},
      multiplier:features.multiplier,
      capabilities: {originalSymbolArt: Object.keys(symbols).length, originalBackground: !!background, originalStaticTitle: !!logo, mappedControlStates: Object.values(controls).reduce((sum,item)=>sum+Object.keys(item).length,0), mappedAudioFiles: Object.keys(audio).length, spineAnimationPlayback: false, financialActions: false},
      missing,
      remaining: ['Full provider mobile/desktop placement comparison', 'Animated logo and all Spine feature/win sequences', 'Complete per-machine menu, gamble and bonus interaction presentation', 'Host session/controller integration and public browser validation; this preview cannot place bets'],
    };
    manifests[id] = withSmartSoftStartupAssets(withSmartSoftNativeAssets(manifests[id]));
  }
  return {schemaVersion:1, productionLaunchEnabled:false, assetsBase:'./assets/', games:manifests, inventoryMissing:Object.keys(names).filter(id=>!manifests[id])};
}

async function main() {
  const index = process.argv.indexOf('--cache-dir'), cacheDir = index >= 0 ? resolve(process.argv[index+1]) : resolve(ROOT, 'assets');
  const lock = JSON.parse(await readFile(resolve(ROOT, 'reference-assets.lock.json'), 'utf8'));
  const publicConfigs = JSON.parse(await readFile(resolve(ROOT, '../models/smartsoft-slots.public.json'), 'utf8'));
  const manifest = await buildManifests(lock, {publicConfigs, readAsset: asset => readFile(resolve(cacheDir, asset.file))});
  await mkdir(resolve(ROOT, 'manifests'), {recursive:true});
  for (const [id, game] of Object.entries(manifest.games)) await writeFile(resolve(ROOT, 'manifests/' + id + '.json'), JSON.stringify(game,null,2)+'\n');
  await writeFile(resolve(ROOT, 'renderer-manifest.json'), JSON.stringify({...manifest,games:Object.fromEntries(Object.entries(manifest.games).map(([id,game])=>[id,{name:game.name,file:'manifests/'+id+'.json',status:game.status,capabilities:game.capabilities,missing:game.missing}]))},null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.games).map(([id,game])=>[id,{frames:Object.keys(game.frames).length,symbols:Object.keys(game.symbols).length,atlases:game.atlases.length,missing:game.missing.length}]))));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
