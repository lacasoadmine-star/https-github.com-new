// Owner-selected existing dashboard entries. Presentation only: no API, wallet,
// account, game handlers, or stored catalogue records are changed.
const ID='superwin-dashboard-selection-20261113';
const retained=['foxy_hot_20_native','multi_hot_5_native','multi_hot_5_video','hot_foxy_20'];
const allowed=retained.map(id=>`:has(> button.portal-r9-card-open[data-game="${id}"])`).join(',');
const excluded=`main.player-main #portal-r9-gallery .portal-r9-grid > article:not(${allowed}),
main.player-main .collection-grid > .collection-card,
main.player-main .game-grid > .game-card,
main.player-main .native-lobby,
main.player-main #upcoming-games.construction-queue,
#superwin-new74-entry`;
// Layered important declarations beat older unlayered catalogue styles. Two
// legacy modules repeatedly force inline display:block!important; collapse and
// hide those entries without competing mutation observers or replacing nodes.
const css=`@layer superwinDashboardSelection { ${excluded} {
 display:none !important; visibility:hidden !important; pointer-events:none !important;
 position:absolute !important; width:0 !important; height:0 !important;
 max-width:0 !important; max-height:0 !important; margin:0 !important;
 padding:0 !important; border:0 !important; overflow:hidden !important;
} }`;
if(!document.getElementById(ID)){
 const style=document.createElement('style');style.id=ID;style.textContent=css;
 document.head.append(style);
}
