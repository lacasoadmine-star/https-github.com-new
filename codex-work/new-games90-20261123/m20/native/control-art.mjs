// Continued own M20 control atlas rendering; no gameplay or provider client code.
// Captured Images-0..3 TexturePacker Buttons frames. Frame w/h describe the
// unrotated trimmed sprite; a rotated frame occupies h/w pixels in its atlas.
const CONTROL_ATLASES=[[2047,2047],[2047,2025],[2047,2047],[1093,1946]];
const controlFrame=(atlas,x,y,w,h,rotated=false,trimX=0,trimY=0,sourceW=w,sourceH=h)=>Object.freeze({
 atlas:`atlas-${atlas}.png`,atlasWidth:CONTROL_ATLASES[atlas][0],atlasHeight:CONTROL_ATLASES[atlas][1],
 x,y,w,h,rotated,trimX,trimY,sourceW,sourceH
});
const spinFrame=controlFrame(2,1593,1534,255,255,false,12,12,279,279);
const spinActiveFrame=controlFrame(2,868,1751,255,255,false,12,12,279,279);
const spinTurboFrame=controlFrame(2,1580,1791,255,255,false,12,12,279,279);
const spinTurboStopFrame=controlFrame(2,1080,1,255,255,false,12,12,279,279);
const autoActiveFrame=controlFrame(3,545,1715,136,135,false,4,6,141,141);
const autoStopActiveFrame=controlFrame(3,383,1769,141,141);
const betActiveFrame=controlFrame(3,956,1676,133,134);
const quickFrame=controlFrame(0,875,1984,61,75,true,12,18,84,99);
const quickActiveFrame=controlFrame(1,1820,1933,82,96,true,1,1,84,99);
const menuFrame=controlFrame(0,1,1984,48,33),menuActiveFrame=controlFrame(0,51,1984,48,33);
const soundOffActiveFrame=controlFrame(0,1856,1984,48,37,true,0,0,48,38);
const soundOnActiveFrame=controlFrame(0,1747,1667,38,37,true,0,0,48,38);
const doubleFrame=controlFrame(1,1936,1407,111,110,true);
const doubleTakeActiveFrame=controlFrame(1,1936,1745,110,110);
const doubleDisabledFrame=controlFrame(0,2039,860,1,1);
export const CONTROL_TEXTURES=Object.freeze({
 'Buttons/Spin':spinFrame,'Buttons/SpinDisabled':spinFrame,
 'Buttons/SpinActive':spinActiveFrame,'Buttons/SpinHover':spinActiveFrame,
 'Buttons/SpinStop':controlFrame(2,1125,1751,255,255,false,12,12,279,279),
 'Buttons/SpinTurbo':spinTurboFrame,'Buttons/SpinTurboHover':spinTurboFrame,
 'Buttons/SpinTurboStop':spinTurboStopFrame,'Buttons/SpinTurboStopHover':spinTurboStopFrame,
 'Buttons/AutoPlay':controlFrame(3,927,1539,136,135,false,4,6,141,141),
 'Buttons/AutoPlayActive':autoActiveFrame,'Buttons/AutoPlayHover':autoActiveFrame,
 'Buttons/AutoPlayDisabled':controlFrame(3,683,1715,136,135,false,4,6,141,141),
 'Buttons/AutoPlayStop':controlFrame(2,1850,1608,141,141),
 'Buttons/AutoPlayStopActive':autoStopActiveFrame,'Buttons/AutoPlayStopHover':autoStopActiveFrame,
 'Buttons/AutoPlayStopDisabled':controlFrame(3,788,1554,137,137,false,3,3,141,141),
 'Buttons/Bet':controlFrame(3,821,1693,133,134),
 'Buttons/BetActive':betActiveFrame,'Buttons/BetHover':betActiveFrame,
 'Buttons/BetDisabled':controlFrame(3,956,1812,133,134,true),
 'Buttons/QuickPlay':quickFrame,'Buttons/QuickPlayDisabled':quickFrame,
 'Buttons/QuickPlayActive':quickActiveFrame,'Buttons/QuickPlayTurbo':quickActiveFrame,
 'Buttons/QuickPlayHover':controlFrame(1,1719,1933,84,99,true),
 'Buttons/Menu':menuFrame,'Buttons/MenuDisabled':menuFrame,
 'Buttons/MenuActive':menuActiveFrame,'Buttons/MenuHover':menuActiveFrame,
 'Buttons/SoundOff':controlFrame(0,1817,1984,48,37,true,0,0,48,38),
 'Buttons/SoundOffActive':soundOffActiveFrame,'Buttons/SoundOffHover':soundOffActiveFrame,'Buttons/SoundOffDisabled':soundOffActiveFrame,
 'Buttons/SoundOn':controlFrame(0,1934,1984,38,37,true,0,0,48,38),
 'Buttons/SoundOnActive':soundOnActiveFrame,'Buttons/SoundOnHover':soundOnActiveFrame,
 'Buttons/SoundOnDisabled':controlFrame(0,1707,1667,39,38,true,0,0,48,38),
 'Buttons/Double':doubleFrame,'Buttons/DoubleActive':doubleFrame,
 'Buttons/DoubleHover':controlFrame(1,1936,1520,111,110,true),
 'Buttons/DoubleDisabled':doubleDisabledFrame,
 'Buttons/DoubleTake':controlFrame(1,1936,1633,110,110),
 'Buttons/DoubleTakeActive':doubleTakeActiveFrame,'Buttons/DoubleTakeHover':doubleTakeActiveFrame,
 'Buttons/DoubleTakeDisabled':doubleDisabledFrame
});

export function controlTextureName(id,{disabled=false,pressed=false,hovered=false,spinning=false,
 autoplay=false,turbo=false,soundOn=false}={}){
 const suffix=disabled?'Disabled':pressed?'Active':hovered?'Hover':'';
 if(id==='spin'){
  if(disabled)return 'Buttons/SpinDisabled';
  if(autoplay)return 'Buttons/SpinStop';
  if(spinning)return turbo?'Buttons/SpinTurboStop':'Buttons/SpinStop';
  return turbo?(hovered||pressed?'Buttons/SpinTurboHover':'Buttons/SpinTurbo'):'Buttons/Spin'+suffix;
 }
 if(id==='auto')return 'Buttons/AutoPlay'+(autoplay?'Stop':'')+suffix;
 if(id==='bet')return 'Buttons/Bet'+suffix;
 if(id==='turbo')return 'Buttons/QuickPlay'+(turbo&&!disabled?'Turbo':suffix);
 if(id==='menu')return 'Buttons/Menu'+suffix;
 if(id==='sound')return 'Buttons/Sound'+(soundOn?'On':'Off')+suffix;
 if(id==='gamble')return 'Buttons/Double'+suffix;
 if(id==='take-win')return 'Buttons/DoubleTake'+suffix;
 throw Error('UNKNOWN_CONTROL_TEXTURE');
}

export function createControlArt(name,url,dom=globalThis.document,{autoplay=false}={}){
 const frame=CONTROL_TEXTURES[name];
 if(!frame||typeof url!=='string'||!url)throw Error('CONTROL_ART_UNAVAILABLE');
 const ns='http://www.w3.org/2000/svg',svg=dom.createElementNS(ns,'svg'),crop=dom.createElementNS(ns,'svg'),image=dom.createElementNS(ns,'image');
 svg.setAttribute('viewBox',`0 0 ${frame.sourceW} ${frame.sourceH}`);
 svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.classList.add('control-art');svg.dataset.texture=name;
 if(autoplay&&name==='Buttons/SpinStop'){
  // The original gold STOP disk has a baked square. Exclude that centre and
  // insert the pixel-identical clean centre from SpinActive exactly once;
  // simply overpainting would leave its translucent glyph underneath.
  const slice=(sx,sy,w,h,x,y,part)=>{
   const viewport=dom.createElementNS(ns,'svg'),art=dom.createElementNS(ns,'image');
   for(const [key,value]of Object.entries({x,y,width:w,height:h,viewBox:`0 0 ${w} ${h}`,overflow:'hidden'}))viewport.setAttribute(key,value);
   if(part==='centre')viewport.dataset.autoplayCentre='true';else viewport.dataset.autoplayBase=part;
   art.setAttribute('width',frame.atlasWidth);art.setAttribute('height',frame.atlasHeight);art.setAttribute('href',url);
   art.setAttribute('transform',`translate(${-sx} ${-sy})`);viewport.append(art);svg.append(viewport);
  };
  svg.dataset.autoplay='true';
  slice(frame.x,frame.y,255,96,12,12,'top');
  slice(frame.x,frame.y+96,96,64,12,108,'left');
  slice(frame.x+160,frame.y+96,95,64,172,108,'right');
  slice(frame.x,frame.y+160,255,95,12,172,'bottom');
  slice(spinActiveFrame.x+96,spinActiveFrame.y+96,64,64,108,108,'centre');
  return svg;
 }
 // The inner viewport clips exactly the packed sprite, including after a
 // quarter-turn. Atlas neighbours cannot bleed into transparent trim margins.
 for(const [key,value]of Object.entries({x:frame.trimX,y:frame.trimY,width:frame.w,height:frame.h,
  viewBox:`0 0 ${frame.w} ${frame.h}`,overflow:'hidden'}))crop.setAttribute(key,value);
 image.setAttribute('width',frame.atlasWidth);image.setAttribute('height',frame.atlasHeight);image.setAttribute('href',url);
 image.setAttribute('transform',frame.rotated?`matrix(0 -1 1 0 ${-frame.y} ${frame.x+frame.h})`:`translate(${-frame.x} ${-frame.y})`);
 crop.append(image);svg.append(crop);return svg;
}

