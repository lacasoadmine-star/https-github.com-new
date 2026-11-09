export const ICE_STARTUP_PATHS=Object.freeze(['/demo/games/burningice10_native','/demo/games/burningice40_native']);
export const ICE_STARTUP_STYLE_PATH='/native-library/remaining20/20261110-ice-startup-r1/ice-startup-layout.css';
// Use after the existing Worker has selected successful HTML; no client module
// or audio/choice callback is replaced. Non-pair paths return identical bytes.
export function patchIceStartupHtml(html,pathname){
 if(!ICE_STARTUP_PATHS.includes(pathname)||typeof html!=='string'||html.includes('data-zplay-ice-startup=')||!html.includes('id="startupCover"')||!html.includes('smartsoft-startup.css')||!/<html(?=[\s>])/i.test(html)||!/<\/head\s*>/i.test(html))return html;
 return html.replace(/<html(?=[\s>])/i,'<html data-zplay-ice-startup="1"').replace(/<\/head\s*>/i,'<link id="iceStartupLayout" rel="stylesheet" href="'+ICE_STARTUP_STYLE_PATH+'">\n</head>');
}
