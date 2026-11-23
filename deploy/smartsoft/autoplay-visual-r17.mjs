const IDS=new Set(['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native']);
// Use each title's locked AUTO-stop art; legacy Ice retains its own AUTO art.
// The original host/controller remains the sole owner of wager scheduling.
export function autoplayVisual(scene,manifest){
 if(!IDS.has(manifest?.id)||scene?.mobileState?.autoplayActive!==true)return scene;
 const modern=scene.modernMobileLayout===true;
 const key=modern?manifest.controls?.autoPlay?.stop:'Buttons/AutoPlayVertical';
 const frame=key&&(manifest.frames['@Mobile/'+key]?'@Mobile/'+key:manifest.frames[key]?key:null);
 if(!frame)return scene;
 return {...scene,commands:scene.commands.map(command=>command.role==='mobile-control'&&command.control==='autoplay'?{...command,frame}:command)};
}
