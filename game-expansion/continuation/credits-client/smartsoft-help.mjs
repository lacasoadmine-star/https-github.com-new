import {SmartSoftHelpPreview,supportsSmartSoftHelp} from './smartsoft-help-model.mjs';
import {drawAtlasFrame} from './presentation/atlas.mjs';
export {supportsSmartSoftHelp};

function node(document,tag,text,className){
 const element=document.createElement(tag);if(text!==undefined)element.textContent=String(text);if(className)element.className=className;return element;
}
function verifiedSymbol(manifest,store,gameId,symbol){
 if(manifest?.id!==gameId||store?.manifest?.id!==gameId||typeof store.loadImage!=='function')return null;
 const key=manifest.symbols?.[symbol]?.frame,frame=key&&manifest.frames?.[key],file=frame&&manifest.files?.[frame.file];
 if(!frame||!file||!/^[a-f0-9]{64}\.(?:png|jpe?g|webp)$/.test(frame.file)||file.sha256!==frame.file.slice(0,64)||!Number.isSafeInteger(file.bytes)||file.bytes<1)return null;
 const stored=store.manifest.files?.[frame.file];if(!stored||stored.sha256!==file.sha256||stored.bytes!==file.bytes)return null;
 if(store.manifest.symbols?.[symbol]?.frame!==key||JSON.stringify(store.manifest.frames?.[key])!==JSON.stringify(frame))return null;
 return {key,frame};
}

// The caller supplies the already hash-verified ReferencePresentationHost's
// resources. There is no direct URL fetch, outcome request, wallet callback,
// stake setter or persistent preference in this view.
export function mountSmartSoftHelp({container,game,selectedStake,manifest,store,document=container?.ownerDocument,displayCurrency='ETB'}={}){
 if(!supportsSmartSoftHelp(game))return null;
 if(!container||!document)throw Error('SMARTSOFT_HELP_CONTAINER_REQUIRED');
 const currencyLabel=displayCurrency==='CREDITS'?'CREDITS':'ETB';
 const describe=value=>currencyLabel==='ETB'?String(value):String(value).replace(/\bETB\b/g,'CREDITS').replace(/\bsantim\b/g,'0.01 credit');
 const preview=new SmartSoftHelpPreview(game,{selectedStake});let disposed=false;
 const mh100=game.id==='multihot100_native',loadedFonts=[];
 const root=node(document,'section',undefined,'smartsoft-help'+(mh100?' smartsoft-help-mh100':''));root.dataset.gameId=game.id;
 const heading=node(document,'h3',mh100?'All Symbol wins are in '+currencyLabel:'PAYTABLE','smartsoft-help-title');root.append(heading);
 const toolbar=node(document,'div',undefined,'smartsoft-help-preview'),label=node(document,'label',mh100?undefined:'BET PREVIEW'),controls=node(document,'div',undefined,'smartsoft-help-preview-controls');
 if(mh100)label.append(node(document,'span','BET PREVIEW','smartsoft-help-visually-hidden'));
 const decrease=node(document,'button','−'),increase=node(document,'button','+'),select=node(document,'select'),currency=node(document,'span',currencyLabel);
 decrease.type=increase.type='button';decrease.setAttribute('aria-label','Decrease paytable preview bet');increase.setAttribute('aria-label','Increase paytable preview bet');select.setAttribute('aria-label','Paytable preview bet');
 label.append(select);if(mh100){label.append(currency);controls.append(decrease,label,increase);}else controls.append(decrease,label,increase,currency);toolbar.append(controls);
 const initial=preview.snapshot();for(const value of initial.stakeValues){const option=node(document,'option',value);option.value=value;select.append(option);}
 const note=node(document,'p','Preview only. Your selected game bet stays '+initial.selectedStake+' '+currencyLabel+'.','smartsoft-help-preview-note');toolbar.append(note);root.append(toolbar);
 const basis=node(document,'p',initial.ways?'Cash prize for each winning way.':initial.paylines+' fixed paylines. Cash prizes are shown for one winning line.','smartsoft-help-basis');if(!mh100)root.append(basis);
 const multiplier=initial.multiplier?node(document,'p','The 1×–5× multiplier applies after the winning combinations are added.','smartsoft-help-basis'):null;if(multiplier&&!mh100)root.append(multiplier);
 const cards=node(document,'div',undefined,'smartsoft-help-cards');root.append(cards);
 const cells=new Map(),tasks=[];
 // Only MH100 has this independently observed Help composition: four high
 // symbols followed by Lemon/Plum/Orange/Cherries and one shared cash table.
 const lowIds=['7','6','5','4'],rows=mh100?['0','1','2','3',...lowIds].map(id=>initial.rows.find(row=>row.symbol===id)):initial.rows;
 if(rows.some(row=>!row))throw Error('SMARTSOFT_HELP_MH100_SYMBOL_LAYOUT_MISMATCH');
 const lowRows=mh100?rows.slice(4):[],equalPrizes=row=>JSON.stringify(row.prizes.map(({count,numerator,denominator})=>({count,numerator,denominator})));
 if(mh100&&lowRows.some(row=>equalPrizes(row)!==equalPrizes(lowRows[0])))throw Error('SMARTSOFT_HELP_MH100_SHARED_PRIZE_MISMATCH');
 const lowGroup=mh100?node(document,'section',undefined,'smartsoft-help-low-group'):null,lowArt=mh100?node(document,'div',undefined,'smartsoft-help-low-symbols'):null;
 if(lowGroup){lowGroup.setAttribute('aria-label','Lemon, Plum, Orange and Cherries share the following cash prizes');lowGroup.append(lowArt);}
 function tableFor(row,symbols=[row.symbol]){
  const table=node(document,'dl',undefined,'smartsoft-help-prizes');table.dataset.symbols=symbols.join(' ');
  const prizes=mh100?[...row.prizes].sort((a,b)=>b.count-a.count):row.prizes;
  for(const prize of prizes){
   const count=node(document,'dt',mh100?prize.count:prize.count+' match'),amount=node(document,'dd',prize.cash);amount.dataset.count=String(prize.count);symbols.forEach(symbol=>cells.set(symbol+':'+prize.count,amount));table.append(count,amount);
  }
  return table;
 }
 for(const row of rows){
  const shared=mh100&&lowIds.includes(row.symbol);
  const card=node(document,'section',undefined,'smartsoft-help-card');card.dataset.symbol=row.symbol;card.dataset.kind=row.kind;
  const title=node(document,'h4',row.label),art=node(document,'div',undefined,'smartsoft-help-symbol'),status=node(document,'span','Loading symbol artwork…','smartsoft-help-art-status');
  art.append(status);card.append(art,title);
  const resource=verifiedSymbol(manifest,store,game.id,row.symbol);
  if(resource){
   const canvas=node(document,'canvas');canvas.width=192;canvas.height=mh100?192:144;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',row.label);canvas.dataset.symbol=row.symbol;canvas.dataset.frame=resource.key;canvas.hidden=true;art.append(canvas);
   tasks.push((async()=>{
    try{
     const image=await store.loadImage(resource.frame.file);if(disposed)return;
     const context=canvas.getContext('2d');if(!context)throw Error('Canvas unavailable');
     // MH100's Help shows the symbol itself at the captured row size, not the
     // much larger transparent reel-cell padding around the atlas artwork.
     const inset=mh100?(shared?6:15):0;
     drawAtlasFrame(context,image,resource.frame,{x:inset,y:inset,width:canvas.width-2*inset,height:canvas.height-2*inset},{padding:!mh100});
     canvas.hidden=false;status.hidden=true;art.dataset.state='ready';
    }catch{
     if(disposed)return;canvas.hidden=true;status.textContent='Symbol artwork unavailable';art.dataset.state='unavailable';
    }
   })());
  }else{status.textContent='Symbol artwork unavailable';art.dataset.state='unavailable';}
  const kind=node(document,'p',row.kind==='scatter'?'SCATTER':row.kind==='way'?'PER WINNING WAY':row.kind==='wild'?'WILD SUBSTITUTE':'PER WINNING LINE','smartsoft-help-card-kind');card.append(kind);
  if(row.prizes.length){if(!shared)card.append(tableFor(row));}
  else card.append(node(document,'p','Substitutes for eligible paying symbols.','smartsoft-help-substitute'));
  (shared?lowArt:cards).append(card);
 }
 if(lowGroup){lowGroup.append(tableFor(lowRows[0],lowIds));cards.append(lowGroup);root.append(basis);if(multiplier)root.append(multiplier);}
 if(mh100&&manifest?.id===game.id&&store?.manifest?.id===game.id&&typeof store.loadBytes==='function'&&typeof FontFace!=='undefined'&&document.fonts){
  const font=manifest.fonts?.find(item=>item.name==='Intro-Regular.otf'),file=font&&manifest.files?.[font.file],stored=font&&store.manifest.files?.[font.file];
  if(font&&file&&stored&&/^[a-f0-9]{64}\.otf$/.test(font.file)&&font.sha256===file.sha256&&file.sha256===font.file.slice(0,64)&&file.sha256===stored.sha256&&Number.isSafeInteger(file.bytes)&&file.bytes>0&&file.bytes===stored.bytes){
   tasks.push((async()=>{try{const bytes=await store.loadBytes(font.file,{priority:1});if(disposed)return;const face=new FontFace('ZplayMH100Help',bytes,{weight:'400'});await face.load();if(disposed)return;document.fonts.add(face);loadedFonts.push(face);root.dataset.helpFont='ready';}catch{if(!disposed)root.dataset.helpFont='unavailable';}})());
  }
 }
 const rounding=node(document,'p',undefined,'smartsoft-help-rounding');root.append(rounding);
 const rules=Array.isArray(game.rules)?game.rules.filter(rule=>typeof rule==='string'&&rule.trim()):[];
 if(rules.length){const details=node(document,'details'),summary=node(document,'summary','Game rules'),list=node(document,'ul');rules.forEach(rule=>list.append(node(document,'li',describe(rule))));details.append(summary,list);root.append(details);}
 root.append(node(document,'p','Prizes shown apply to this ZPLAY game. Probability settings are independent; no provider-certified return is claimed.','smartsoft-help-account-note'));
 function paint(snapshot){
  select.value=snapshot.previewStake;decrease.disabled=!snapshot.canDecrease;increase.disabled=!snapshot.canIncrease;
  root.dataset.previewStake=snapshot.previewStake;
  for(const row of snapshot.rows)for(const prize of row.prizes){const cell=cells.get(row.symbol+':'+prize.count);cell.textContent=prize.cash;cell.dataset.numerator=prize.numerator;cell.dataset.denominator=prize.denominator;}
  rounding.textContent=snapshot.hasFractionalMinor?(currencyLabel==='ETB'?'Exact cash values are shown, including fractions of a santim. The complete round win is floored once to santim.':'Exact credit values are shown, including fractions of 0.01 credit. The complete round win is floored once to 0.01 credit.'):'All prizes shown are in '+currencyLabel+'. Separate winning combinations add before final round settlement.';
  return snapshot;
 }
 const change=()=>{if(disposed)return;try{paint(preview.setPreviewStake(select.value));}catch{select.value=preview.snapshot().previewStake;}};
 const lower=()=>{if(!disposed)paint(preview.step(-1));},higher=()=>{if(!disposed)paint(preview.step(1));};
 select.addEventListener('change',change);decrease.addEventListener('click',lower);increase.addEventListener('click',higher);
 paint(initial);container.replaceChildren(root);
 return {
  element:root,ready:Promise.all(tasks),snapshot:()=>preview.snapshot(),
  select:value=>{if(disposed)throw Error('SMARTSOFT_HELP_DISPOSED');return paint(preview.setPreviewStake(value));},
  dispose(){if(disposed)return;disposed=true;select.removeEventListener('change',change);decrease.removeEventListener('click',lower);increase.removeEventListener('click',higher);for(const face of loadedFonts)document.fonts.delete(face);loadedFonts.length=0;},
 };
}
