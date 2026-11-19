import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Static cascade and layout arithmetic checks, not a browser rendering test.
const root=new URL('../changes/dedicated-resume/games/deluxe/',import.meta.url);
const [base,critical,dialogs,cabinet]=await Promise.all(['style.css','official-startup-critical.css','deluxe-dialogs.css','deluxe-cabinet.css'].map(name=>readFile(new URL(name,root),'utf8')));
const own='body[data-machine="multi_hot_5_deluxe_native"]';
const cover='body[data-game="multi_hot_5_deluxe_native"] #official-startup';
const consent=own+' #sound-consent.official-sound-consent';

function split(text,separator){
 let depth=0,quote=null,start=0;const parts=[];
 for(let i=0;i<text.length;i++){
  const c=text[i];if(quote){if(c==='\\')i++;else if(c===quote)quote=null;continue;}
  if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;
  else if(c===separator&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;}
 }
 parts.push(text.slice(start).trim());return parts.filter(Boolean);
}
function rules(css,media=[]){
 css=css.replace(/\/\*[\s\S]*?\*\//g,'');const result=[];let start=0;
 for(let i=0;i<css.length;i++){
  if(css[i]!=='{')continue;
  const selector=css.slice(start,i).trim(),begin=++i;let depth=1,quote=null;
  for(;i<css.length&&depth;i++){const c=css[i];if(quote){if(c==='\\')i++;else if(c===quote)quote=null;}else if(c==='"'||c==="'")quote=c;else if(c==='{')depth++;else if(c==='}')depth--;}
  assert.equal(depth,0,'Balanced CSS block');const body=css.slice(begin,i-1);start=i;
  if(selector.startsWith('@media'))result.push(...rules(body,[...media,selector]));
  else if(!selector.startsWith('@')){
   const declarations=split(body,';').map(value=>{const colon=value.indexOf(':');return [value.slice(0,colon).trim(),value.slice(colon+1).trim()];});
   for(const item of split(selector,','))result.push({selector:item,media,declarations});
  }
  i--;
 }
 return result;
}
const sheets=[rules(base),rules(critical),rules(dialogs)];
function specificity(selector){
 // Only simple selectors and :not are used in the target rules below.
 const stripped=selector.replace(/:not\(([^)]+)\)/g,'$1');
 const ids=(stripped.match(/#[\w-]+/g)||[]).length;
 const classes=(stripped.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g)||[]).length;
 const types=(stripped.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:[\w-]+/g,'').match(/(?:^|[\s>+~])([a-z][\w-]*)/gi)||[]).length;
 return [ids,classes,types];
}
function cascade(matchingSelectors,{width=1366,loaded=true}={}){
 const result=new Map();let order=0;
 for(const sheet of sheets.slice(0,loaded?3:2))for(const rule of sheet){
  order++;if(!matchingSelectors.includes(rule.selector))continue;
  if(rule.media.some(media=>{const maximum=media.match(/max-width:\s*(\d+)px/);return maximum?width>Number(maximum[1]):true;}))continue;
  for(const [property,value]of rule.declarations){
   const important=/!important\s*$/.test(value),score=[Number(important),...specificity(rule.selector),order];
   const previous=result.get(property),wins=!previous||score.some((part,i)=>part!==previous.score[i]&&score.slice(0,i).every((v,j)=>v===previous.score[j])&&part>previous.score[i]);
   if(wins)result.set(property,{value:value.replace(/\s*!important\s*$/,''),score,selector:rule.selector});
  }
 }
 return Object.fromEntries([...result].map(([key,value])=>[key,value.value]));
}
const declaration=(css,selector)=>Object.fromEntries(rules(css).find(rule=>rule.selector===selector)?.declarations||[]);

test('runtime startup styling takes over the immediate cover and centers logo plus progress',()=>{
 const selectors=['*','#official-startup',cover+':not([hidden])'];
 assert.equal(cascade(selectors,{loaded:false}).display,'block');
 const loader=cascade(selectors);assert.equal(loader.display,'flex');assert.equal(loader['flex-direction'],'column');assert.equal(loader['align-items'],'center');assert.equal(loader['justify-content'],'center');
 const logo=cascade(['*','.official-loader-logo',cover+' .official-loader-logo']);
 assert.equal(logo.position,'static');assert.equal(logo.top,'auto');assert.equal(logo.left,'auto');assert.equal(logo.margin,'0');assert.equal(logo.width,logo.height);
 assert.equal(cascade(['*','[hidden]','#official-startup','#official-startup[hidden]']).display,'none');
});

test('dedicated sound consent overrides inherited ID styling on both choices and heading',()=>{
 const dialog=cascade(['*','dialog',own+' dialog','#sound-consent','.official-sound-consent',consent]);
 assert.equal(dialog.width,'min(500px,90vw)');assert.equal(dialog.padding,'32px 20px');assert.equal(dialog.background,'rgba(34,31,19,.96)');assert.equal(dialog['max-width'],'calc(100vw - 24px)');
 const heading=['*','dialog h2','#sound-consent h2','.official-sound-consent h2',consent+' h2'];
 assert.equal(cascade(heading).font,'400 24px/1.25 Arial,sans-serif');assert.equal(cascade(heading,{width:390})['font-size'],'21px');
 for(const id of ['sound-yes','sound-no']){
  const button=cascade(['*','button','dialog button','.sound-choices button','#'+id,'.official-sound-consent .sound-choices button',consent+' #'+id]);
  assert.equal(button.background,'linear-gradient(#866013,#4e3b14)');assert.equal(button['min-height'],'48px');assert.equal(button.flex,'0 1 135px');assert.equal(button['min-width'],'0');
 }
});

function cssNumber(expression,viewport,variables={}){
 let value=expression;
 while(value.includes('var(')){
  const start=value.lastIndexOf('var('),end=value.indexOf(')',start);assert.ok(end>start);
  const [name,fallback]=split(value.slice(start+4,end),',');assert.ok(name in variables||fallback,'Known CSS variable '+name);
  value=value.slice(0,start)+'('+cssNumber(variables[name]??fallback,viewport,variables)+')'+value.slice(end+1);
 }
 value=value.replace(/env\([^)]*\)/g,'0').replace(/([0-9.]+)(svh|vh|vw|px)/g,(_,amount,unit)=>String(Number(amount)*(unit==='vw'?viewport.width/100:unit==='svh'||unit==='vh'?viewport.height/100:1))).replace(/calc\(/g,'(');
 assert.match(value.replace(/min|max|clamp/g,''),/^[\d\s.,()+*/-]+$/);
 return Function('min','max','clamp','return ('+value+')')(Math.min,Math.max,(a,b,c)=>Math.max(a,Math.min(b,c)));
}

test('BET popup stays inside short landscape and portrait viewports with working arrow heights',()=>{
 const popup=declaration(dialogs,own+' #settings.official-bet-deluxe');
 assert.equal(popup.overflow,'auto');assert.equal(popup.top,'var(--deluxe-bet-top)');
 for(const [width,height]of [[1366,768],[844,390],[667,375],[390,844],[320,568],[1024,600]]){
  const viewport={width,height},landscape=width>height,header=landscape?26:24;
  const machineWidth=landscape?Math.min(width,(height-header)*1366/768):Math.min(width,(height-header)*.4666667,560);
  const machineHeight=machineWidth*(landscape?768/1366:15/7);
  const variables={'--dialog-machine-top':header+'px','--dialog-machine-height':machineHeight+'px','--deluxe-bet-top':popup['--deluxe-bet-top']};
  const top=cssNumber(popup.top,viewport,variables),maxHeight=cssNumber(popup['max-height'],viewport,variables);
  assert.ok(top>=12&&maxHeight>0);assert.ok(top+maxHeight<=height-12+1e-9,`${width}×${height}: popup bottom ${top+maxHeight}`);
 }
 for(const direction of ['up','down'])assert.equal(cascade(['*','button','dialog button','#settings.official-bet-deluxe .official-bet-'+direction])['min-height'],'28px');
});

test('consent width and flexible choices fit narrow phones and desktop without an inherited cap',()=>{
 const popup=declaration(dialogs,consent),choices=declaration(dialogs,consent+' .sound-choices');
 for(const width of [280,320,390,768,1366]){
  const viewport={width,height:844},actual=Math.min(cssNumber(popup.width,viewport),cssNumber(popup['max-width'],viewport));
  const inner=actual-42,gap=cssNumber(choices.gap,viewport),button=Math.min(135,(inner-gap)/2);
  assert.ok(actual<=width-24+1e-9);assert.ok(button>=75);assert.ok(button*2+gap<=inner+1e-9);
  if(width===1366)assert.equal(actual,500);
 }
 assert.ok(rules(cabinet).some(rule=>rule.media.includes('@media (orientation:landscape)')));
});
