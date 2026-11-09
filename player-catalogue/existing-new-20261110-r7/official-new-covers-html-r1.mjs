export const COVER_PREFIX='/native-library/existing-new/20261110-official-covers-r1/';
export function patchOfficialNewCoversHtml(html,pathname){
 if(!['/','/games','/games/'].includes(pathname)||html.includes('data-zplay-official-new-covers')||!html.includes('id="root"')||!html.includes('/native-library/expansion/r1/lobby.mjs')||!/<\/head\s*>/i.test(html))return html;
 return html.replace(/<\/head\s*>/i,'<link rel="stylesheet" href="'+COVER_PREFIX+'covers.css"><script type="module" data-zplay-official-new-covers src="'+COVER_PREFIX+'covers.mjs"></script></head>');
}
