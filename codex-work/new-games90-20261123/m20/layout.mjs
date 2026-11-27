import { CONTROLS, VIEW } from './render/layout.mjs';

// Below the former 240px canvas budget, retain the complete accessible control
// rows and shrink only the artwork. Less than 144px must scroll in the host.
export const MIN_PRESENTATION_HEIGHT = 144;

/** Responsive adaptation; desktop uses this game's measured native coordinates. */
export function presentationLayout(width, height) {
  if (!Number.isFinite(width) || width < 240 || !Number.isFinite(height) || height < MIN_PRESENTATION_HEIGHT) throw new RangeError('M20_VIEWPORT');
  const portrait = width < 700;
  const crop = portrait ? { x: 310, y: 0, width: 724, height: 740 } : { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
  let scale = Math.min(width / crop.width, portrait ? Math.min(1, (height - 136) / crop.height) : height / crop.height);
  let scene = { width: crop.width * scale, height: crop.height * scale };
  let controls = portrait ? {
    menu: { x: 0, y: scene.height + 8, width: width / 5, height: 48 },
    sound: { x: width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    quick: { x: 2 * width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    bet: { x: 3 * width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    auto: { x: 4 * width / 5, y: scene.height + 8, width: width / 5, height: 48 },
    double: { x: 0, y: scene.height + 64, width: width / 4, height: 64 },
    spin: { x: width / 4, y: scene.height + 64, width: width / 2, height: 64 },
    take: { x: 3 * width / 4, y: scene.height + 64, width: width / 4, height: 64 },
  } : Object.fromEntries(Object.entries(CONTROLS).map(([name, r]) => [name, {
    x: r.x * scale, y: r.y * scale, width: Math.max(44, r.width * scale), height: Math.max(44, r.height * scale),
  }]));
  if (!portrait) {
    // The retained rectangular QUICK hitbox overlapped the main circular control.
    // Keep its enlarged accessible target outside SPIN rather than intercepting it.
    const q = controls.quick, spin = controls.spin;
    if (spin.x + spin.width + 2 + q.width <= scene.width) q.x = spin.x + spin.width + 2;
    else q.y = spin.y - q.height - 2;
  }
  // Small landscape canvases cannot contain every enlarged native hitbox.
  // Keep the complete artwork and use a separate accessible control strip.
  const entries = Object.values(controls);
  const invalid = !portrait && entries.some((r,i) => r.x < 0 || r.y < 0 ||
    r.x+r.width > scene.width+.001 || r.y+r.height > scene.height+.001 ||
    entries.slice(i+1).some(s => Math.min(r.x+r.width,s.x+s.width)-Math.max(r.x,s.x)>.001 &&
      Math.min(r.y+r.height,s.y+s.height)-Math.max(r.y,s.y)>.001));
  if(invalid){
    const strip=56;
    scale=Math.min(width/crop.width,(height-strip)/crop.height);
    scene={width:crop.width*scale,height:crop.height*scale};
    const names=['menu','sound','quick','bet','auto','double','spin','take'];
    const stageWidth=Math.min(width,Math.max(scene.width,8*44));
    controls=Object.fromEntries(names.map((name,i)=>[name,{x:i*stageWidth/8,y:scene.height+4,width:stageWidth/8,height:48}]));
    return Object.freeze({portrait:false,compact:true,crop:Object.freeze(crop),scene:Object.freeze(scene),scale,width:stageWidth,height:scene.height+strip,controls:Object.freeze(controls)});
  }
  return Object.freeze({ portrait, crop: Object.freeze(crop), scene: Object.freeze(scene), scale,
    width: portrait ? width : scene.width, height: scene.height + (portrait ? 136 : 0), controls: Object.freeze(controls) });
}
