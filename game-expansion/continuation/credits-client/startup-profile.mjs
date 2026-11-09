// Shared SmartSoft public mobile loader art, scoped to new expansion titles.
// Evidence: presentation/evidence/smartsoft-startup-source.json.
export const SMARTSOFT_STARTUP_IDS=Object.freeze([
 'multihot100_native','multihotwildways_native','multihot5wild_native',
 'multihot5superwilds_native','multihotdeluxe_native','habeshafortune5_native',
 'burningice_native','burningice10_native','burningice40_native',
]);
const BASE='https://static.ssg-public.com/cache/b1/SlotsDemo/Content/';
export const STARTUP_ASSETS=Object.freeze(Object.fromEntries([
 ['logo','4d5662742ebb6a6c564a9c225040c034062c1fdc7d4e12e0b1f227350ad26c99','gif',46937,'Images/loader-logo.gif','image'],
 ['bar','2c4fb994168a8a1ba3bc6984849813561b7d19969b56cf3a9daa2ea9f2e7eaca','png',340,'Images/loader-background.png','image'],
 ['icon','5a147a489f158511a11f0b9e2339d2637aeb7b5f716f039eff1c77d05510bd8e','png',475,'Images/loader-icon.png','image'],
 ['yes','eb793c74e011fccfdffafc0f82e2440ceebd8e5ad3244a61dde084a49da5c440','png',2618,'Images/othergames-mobile-yes.png','image'],
 ['no','a31598c757991af6d09c49cd9e3110f3ef9810e4053d264596220bb3d77a5267','png',2013,'Images/othergames-mobile-no.png','image'],
 ['font','e63c19c510ebabb9b336c7fe10204dd3fc86d36b07df756d5fe54b099edc3f66','woff2',52844,'Fonts/font1/fontmt1-regular-webfont.woff2','font'],
].map(([name,sha256,extension,bytes,path,kind])=>[name,Object.freeze({file:sha256+'.'+extension,sha256,bytes,kind:Object.freeze([kind]),urls:Object.freeze([BASE+path])})])));
export function smartSoftStartupProfile(id){
 if(!SMARTSOFT_STARTUP_IDS.includes(id))return null;
 const legacy=id.startsWith('burningice');
 return Object.freeze({id,question:'Would you like sound?',yes:'Yes',no:'No',completionDelayMs:legacy?150:200,loaderFadeMs:100,
  explicitConsentAdaptation:['multihotwildways_native','multihot5wild_native'].includes(id),
  consentProvenance:['multihotwildways_native','multihot5wild_native'].includes(id)?'User-requested explicit consent using the shared source dialog; native mobile VR hides this dialog.':'Shared public SmartSoft mobile sound dialog.'});
}
