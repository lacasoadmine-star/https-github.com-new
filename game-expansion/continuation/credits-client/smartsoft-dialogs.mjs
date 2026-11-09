import {drawAtlasFrame} from './presentation/atlas.mjs';
import {smartSoftDialogProfile} from './smartsoft-dialog-profiles.mjs';
import {nativeBetWindow} from './smartsoft-dialog-state.mjs';
import {COMMON_AUTO_ASSETS} from './smartsoft-common-auto-assets.mjs';
import {smartSoftPortraitGambleScene} from './smartsoft-mobile-gamble.mjs';
import {SmartSoftGambleReveal} from './smartsoft-gamble-reveal.mjs';
import {smartSoftAutoStartLabel} from './presentation/smartsoft-remaining7-view.mjs';

const box=(x,y,width,height)=>({x,y,width,height});
const original=frame=>frame?.original??{width:1,height:1};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const LABELS=['If a win reaches or exceeds','If balance decreases','If balance increases'];
async function copyDialogImage(image,document){
 // The host closes its ImageBitmaps on refresh/recovery. Dialog art must own
 // its decoded copy so a host rebind cannot detach an open or cached panel.
 if(typeof globalThis.createImageBitmap==='function')return globalThis.createImageBitmap(image);
 const canvas=document?.createElement('canvas');if(!canvas)throw Error('DIALOG_IMAGE_COPY_UNAVAILABLE');
 canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
 if(!canvas.width||!canvas.height)throw Error('DIALOG_IMAGE_DETACHED');
 canvas.getContext('2d').drawImage(image,0,0);return canvas;
}
function releaseDialogImages(images,retained){
 const keep=new Set(retained?.values()??[]);
 for(const image of new Set(images?.values()??[]))if(!keep.has(image))image.close?.();
}

// Pure drawing instructions and touch geometry. Coordinates explicitly present
// in the title's captured source take precedence. Inherited shared component
// defaults that were not recovered use the title's own frame dimensions and
// remain marked as responsive fallbacks, never as exact portrait parity.
export function smartSoftDialogScene(manifest,kind,view={}){
 const profile=smartSoftDialogProfile(manifest?.id);if(!profile)return null;
 if(kind==='gamble'&&view.portrait===true){const portrait=smartSoftPortraitGambleScene(manifest,view);if(portrait)return portrait;}
 const commands=[],controls={},positions={},fallbacks=[],v=profile.values,currency=view.currency==='CREDITS'?'CREDITS':'ETB';
 const value=(key,fallback)=>{if(finite(v[key]))return v[key];fallbacks.push(key);return fallback;};
 const size=key=>original(manifest.frames[key]);
 const sprite=(key,x,y,scale=1)=>{const f=manifest.frames[key];if(!f)return null;const s=size(key),b=box(x,y,s.width*scale,s.height*scale);commands.push({type:'sprite',frame:key,box:b});return b;};
 const label=(text,x,y,fontSize=24,{color='#fff',align='center',font='caps'}={})=>commands.push({type:'text',text:String(text),x,y,fontSize,color,align,font});
 const hit=(name,b)=>{if(b)controls[name]=b;};
 const modern=profile.kind==='modern';let width,height;
 if(kind==='auto'&&modern){
  const bg=size('AutoPlay/Popup');width=bg.width;height=bg.height;sprite('AutoPlay/Popup',0,0);
  const b=size('AutoPlay/Button'),counts=[25,50,100,500,1000],gap=value('AutoPlay.button.left',(width-56)/5),start=value('AutoPlay.buttonsContainer.x',(width-(4*gap+b.width))/2),top=value('AutoPlay.buttonsContainer.y',118);
  counts.forEach((count,i)=>{const target=sprite(count===view.count?'AutoPlay/ButtonActive':'AutoPlay/Button',start+i*gap,top);hit('count'+count,target);label(count,target.x+target.width/2,target.y+target.height/2,38,{color:count===view.count?'#fff':'#ffffffaa'});});
  const close=sprite('AutoPlay/Close',value('AutoPlay.close.x',width-size('AutoPlay/Close').width-18),value('AutoPlay.close.y',16));hit('close',close);
  label('STOP AUTOPLAY',value('AutoPlay.stopText.x',width/2),value('AutoPlay.stopText.y',235),22,{color:'#ffffffaa'});
  const rowX=value('AutoPlay.rowsContainer.x',7),rowY=value('AutoPlay.rowsContainer.y',278),rowHeight=value('AutoPlay.rowsContainer.height',86);
  for(let i=0;i<3;i++){
   const y=rowY+i*rowHeight,on=!!view.limits?.[i];sprite('AutoPlay/Line',rowX,y);
   const toggle=sprite(on?'AutoPlay/CheckboxActive':'AutoPlay/Checkbox',rowX+value('AutoPlay.checkboxContainer.x',11),y+value('AutoPlay.checkboxContainer.y',12));
   const iconX=value('AutoPlay.checkboxIcon.x',-2)+(on?value('AutoPlay.checkboxIcon.left',29):0),iconY=value('AutoPlay.checkboxIcon.y',-5);
   sprite(on?'AutoPlay/CheckboxIconActive':'AutoPlay/CheckboxIcon',toggle.x+iconX,toggle.y+iconY);hit('toggle'+i,toggle);
   label(LABELS[i],rowX+value('AutoPlay.label.x',106),y+value('AutoPlay.label.y',31),22,{align:'left',color:on?'#fff':'#ffffff99',font:'regular'});
   const input=sprite(on?'AutoPlay/InputActive':'AutoPlay/Input',rowX+value('AutoPlay.inputContainer.x',width-258),y+value('AutoPlay.inputContainer.y',3));
   const ix=value('AutoPlay.inputAmount.x',35),iy=value('AutoPlay.inputAmount.y',30);
   const currencyX=currency==='CREDITS'?Math.min(value('AutoPlay.inputAmountCurrency.x',170),input.width-80):value('AutoPlay.inputAmountCurrency.x',170);
   positions['input'+i]=box(input.x+ix,input.y+iy-5,currency==='CREDITS'?Math.max(65,currencyX-ix-8):Math.max(65,input.width-ix-70),36);
   label(currency,input.x+currencyX,input.y+value('AutoPlay.inputAmountCurrency.y',34)+12,18,{align:'left',color:on?'#fff':'#ffffff77'});
  }
  const save=sprite('AutoPlay/Save',value('AutoPlay.save.x',(width-size('AutoPlay/Save').width)/2),value('AutoPlay.save.y',height-size('AutoPlay/Save').height-18));hit('start',save);label('START PLAY',save.x+save.width/2,save.y+save.height/2,24);
 }else if(kind==='bet'&&modern){
  const bg=size('Bets/Popup');width=bg.width;height=bg.height;sprite('Bets/Popup',0,0);
  const list=nativeBetWindow(view.values,view.selected,view.offset);if(!list)return null;
  const rowHeight=value('Bets.rowHeight',122),rowX=value('Bets.rowX',0),rowY=(height-5*rowHeight)/2,mask=profile.polygons?.['Bets.mask'];
  if(mask)commands.push({type:'clip',points:mask});
  for(let i=0;i<list.values.length;i++){
   const amount=list.values[i],target=sprite(amount===view.selected?'Bets/ButtonActive':'Bets/Button',rowX,rowY+i*rowHeight);hit('bet'+i,{...target,height:Math.min(target.height,height-target.y)});
   label(amount,target.x+target.width*.46,target.y+target.height/2,52,{align:'right'});label(currency,target.x+target.width*.50,target.y+target.height/2+4,30,{align:'left'});
  }
  if(mask)commands.push({type:'unclip'});
  hit('up',sprite('Bets/Up',value('Bets.up.x',width-65),value('Bets.up.y',53)));
  hit('down',sprite('Bets/Down',value('Bets.down.x',width-65),value('Bets.down.y',height-77)));
  positions.list=list;
 }else if(kind==='gamble'){
  // Retain desktop composition for landscape and manifests that have not yet
  // acquired a complete, independently bound set of mobile gamble artwork.
  const bg=size('Double/Background');width=bg.width;height=bg.height;
  const prefix='Double.redBlack.',pick=(keys,fallback)=>{const key=keys.find(key=>finite(v[key]));if(key)return v[key];fallbacks.push(keys.join('|'));return fallback;},originX=modern?pick([prefix+'background.mobile.x',prefix+'background.x'],0):431,originY=modern?pick([prefix+'background.mobile.y',prefix+'background.y'],0):200;
  const coord=(name,axis,fallback)=>modern?pick([prefix+name+'.mobile.'+axis,prefix+name+'.'+axis],fallback+({x:originX,y:originY}[axis]))-({x:originX,y:originY}[axis]):fallback;
  sprite('Double/Background',0,0);
  const card=view.card??(modern?'Double/Card/Hidden':'Cards/Hidden'),cardScale=modern?value(prefix+'card.mobile.scale',value(prefix+'card.scale',1)):1;
  sprite(card,coord('card','x',(width-size(card).width*cardScale)/2),coord('card','y',221),cardScale);
  const red=sprite('Double/Red',coord('red','x',modern?width*.13:259),coord('red','y',modern?height*.46:291));hit('red',red);label('RED',red.x+red.width/2,red.y+red.height/2,32);
  const black=sprite('Double/Black',coord('black','x',modern?width*.63:803),coord('black','y',modern?height*.46:291));hit('black',black);label('BLACK',black.x+black.width/2,black.y+black.height/2,32);
  const take=sprite('Double/Take',coord('take','x',modern?(width-size('Double/Take').width)/2:506),coord('take','y',modern?height*.74:485));hit('collect',take);label('TAKE WIN',take.x+take.width/2,take.y+take.height/2,28);
  hit('close',sprite('Double/Close',coord('close','x',modern?width-size('Double/Close').width-18:1206),coord('close','y',modern?10:-8)));
  const amountX=coord('amount','x',modern?width*.25:315),amountY=coord('amount','y',modern?48:47),toWinX=coord('toWin','x',modern?width*.77:937),toWinY=coord('toWin','y',modern?48:47),ink=manifest.id==='habeshafortune5_native'?'#fdd54b':modern?'#fff23c':'#ffcb1f';
  label('GAMBLE AMOUNT',amountX,amountY+12,24,{color:ink});label((view.amount??'—')+' '+currency,amountX,amountY+43,28);
  label('GAMBLE TO WIN',toWinX,toWinY+12,24,{color:ink});label((view.toWin??'—')+' '+currency,toWinX,toWinY+43,28);
  const historyX=coord('history','x',width/2),historyY=coord('history','y',modern?105:93),previousX=coord('previous','x',width/2),previousY=coord('previous','y',modern?49:48);
  label('Previous Cards',previousX,previousY+10,20,{font:'regular'});
  const history=view.history??[],scale=value(prefix+'historyItem.scale',72/167),cardW=size(card).width*scale;
  history.forEach((entry,i)=>sprite(entry.frame,historyX+(i-(history.length-1)/2)*cardW-cardW/2,historyY,scale));
  label('Choose Red or Black gamble, or take the win!',coord('text','x',width/2),coord('text','y',modern?height-45:586)+10,22,{font:'regular'});
 }else return null;
 if(kind==='gamble'){
  const boxes=commands.filter(command=>command.type==='sprite').map(command=>command.box),left=Math.min(0,...boxes.map(b=>b.x)),top=Math.min(0,...boxes.map(b=>b.y)),right=Math.max(width,...boxes.map(b=>b.x+b.width)),bottom=Math.max(height,...boxes.map(b=>b.y+b.height));
  if(left||top||right!==width||bottom!==height){
   for(const command of commands){if(command.box)command.box={...command.box,x:command.box.x-left,y:command.box.y-top};else if(command.type==='text'){command.x-=left;command.y-=top;}}
   for(const[name,b]of Object.entries(controls))controls[name]={...b,x:b.x-left,y:b.y-top};width=right-left;height=bottom-top;
  }
 }
 return{kind,width,height,commands,controls,positions,fallbacks:[...new Set(fallbacks)],usesPortraitGambleArt:false,statusEffect:kind==='gamble'&&view.cardStatus?{...view.cardStatus,frame:null,transparentFallback:true}:null};
}

export class SmartSoftDialogs{
 constructor({gameId,document=globalThis.document,getResources=()=>null,onSound=()=>{},copyImage=copyDialogImage,currency='ETB'}={}){
  this.id=gameId;this.currency=currency==='CREDITS'?'CREDITS':'ETB';this.profile=smartSoftDialogProfile(gameId);this.document=document;this.getResources=getResources;this.onSound=onSound;this.copyImage=copyImage;this.records=new Map();this.state=null;this.disposed=false;this.binding=null;this.fonts=[];this.offset=null;this.token=0;
  this.reveal=new SmartSoftGambleReveal({onChange:()=>this.render('gamble')});
  if(!this.profile||!document)return;
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./smartsoft-dialogs.css',import.meta.url).href;document.head.append(css);this.css=css;
  this.resize=()=>this.renderAll();document.defaultView?.addEventListener('resize',this.resize);
 }
 async prepare(kind){
  if(!this.profile||this.disposed||!['auto','bet','gamble'].includes(kind))return false;
  if(this.profile.kind==='legacy'&&kind==='bet')return false;
  const resource=this.getResources();if(!resource?.manifest||resource.manifest.id!==this.id||!resource.store)return false;
  const token=++this.token,manifest=resource.manifest,store=resource.store;
  const required=kind==='auto'?(this.profile.kind==='legacy'?[]:['Popup','Button','ButtonActive','Checkbox','CheckboxActive','CheckboxIcon','CheckboxIconActive','Input','InputActive','Line','Save','Close'].map(name=>'AutoPlay/'+name)):kind==='bet'?['Popup','Button','ButtonActive','Up','Down'].map(name=>'Bets/'+name):['Double/Background','Double/Red','Double/Black','Double/Take','Double/Close',...(this.profile.kind==='legacy'?['Hidden','Ace_Clubs','Ace_Diamonds','Ace_Hearts','Ace_Spades'].map(name=>'Cards/'+name):['Hidden','Ace_Clubs','Ace_Diamonds','Ace_Hearts','Ace_Spades'].map(name=>'Double/Card/'+name))];
  if(!manifest.frames||required.some(key=>!manifest.frames[key])||store.manifest!==manifest||store.disposed===true)return false;
  const created=new Map(),tasks=[];
  try{
   const images=new Map([...(this.images??[])].filter(([file])=>manifest.files[file]&&manifest.files[file].sha256===this.binding?.files[file]?.sha256));
   const prefix=kind==='auto'?'AutoPlay/':kind==='bet'?'Bets/':null,keys=Object.keys(manifest.frames).filter(key=>prefix?key.startsWith(prefix):key.startsWith('Double/')||key.startsWith('Cards/')||key.startsWith('Vertical/Double/')||key.startsWith('Mobile/Double/Card/'));
   const files=[...new Set(keys.map(key=>manifest.frames[key].file))];
   for(const file of files)if(!images.has(file))tasks.push((async()=>{const borrowed=await store.loadImage(file),owned=await this.copyImage(borrowed,this.document);created.set(file,owned);return[file,owned];})());
   const entries=await Promise.all(tasks);
   if(this.fontBinding!==manifest){this.fontBinding=manifest;this.fontReady=this.loadFonts(manifest,store);}await this.fontReady;
   const current=this.getResources();if(this.disposed||this.token!==token||current?.manifest!==manifest||current?.store!==store||store.disposed===true){releaseDialogImages(created);return false;}
   for(const entry of entries)images.set(...entry);const previous=this.images;this.binding=manifest;this.images=images;releaseDialogImages(previous,images);
   if(!this.records.has(kind))this.create(kind);
   if(kind==='auto')this.resetAuto();if(kind==='bet')this.offset=null;if(kind==='gamble')this.reveal.open(this.state);
   this.render(kind);return true;
  }catch{await Promise.allSettled(tasks);releaseDialogImages(created,this.images);return false;}
 }
 async loadFonts(manifest,store){
  if(typeof globalThis.FontFace!=='function')return;
  for(const[name,pattern]of [['SmartSoftDialogCaps',/Intro-Black-Caps/i],['SmartSoftDialogRegular',/Intro-Regular/i]]){
   const entry=manifest.fonts.find(font=>pattern.test(font.name));if(!entry)continue;
   const bytes=await store.loadBytes(entry.file),face=new FontFace(name,bytes);await face.load();
   if(this.disposed||this.getResources()?.manifest!==manifest)return;this.document.fonts.add(face);this.fonts.push(face);
  }
 }
 node(tag,className,parent){const node=this.document.createElement(tag);node.className=className;if(parent)parent.append(node);return node;}
 create(kind){
  const id=kind==='auto'?'autoplayDialog':kind==='bet'?'betDialog':'gambleDialog',dialog=this.document.getElementById(id),stage=this.node('div','smartsoft-native-stage'),canvas=this.node('canvas','smartsoft-native-art',stage);
  canvas.setAttribute('aria-hidden','true');dialog.prepend(stage);dialog.dataset.smartsoftDialog=kind;
  const record={kind,dialog,stage,canvas,hits:new Map(),inputs:[],toggles:[]};this.records.set(kind,record);
  if(kind==='auto'&&this.profile.kind==='legacy'){this.createLegacyAuto(record);return;}
  const use=(name,id)=>{const button=this.document.getElementById(id);button.classList.add('smartsoft-native-hit');stage.append(button);record.hits.set(name,button);return button;};
  const add=(name,label,handler)=>{const button=this.node('button','smartsoft-native-hit',stage);button.type='button';button.setAttribute('aria-label',label);button.textContent=label;button.addEventListener('click',handler);record.hits.set(name,button);return button;};
  if(kind==='auto'){
   const form=this.document.getElementById('autoplayForm');stage.append(form);form.classList.add('smartsoft-native-form');record.form=form;
   use('close','closeAutoplay');const start=use('start','startAutoplay');start.setAttribute('form','autoplayForm');start.textContent='START PLAY';
   for(const count of [25,50,100,500,1000])add('count'+count,count+' spins',()=>{this.document.getElementById('autoplayCount').value=String(count);this.onSound('button');this.render('auto');});
   ['autoplayWin','autoplayLoss','autoplayGain'].forEach((id,index)=>{
    const input=this.document.getElementById(id);stage.append(input);input.classList.add('smartsoft-native-input');input.placeholder='';input.setAttribute('aria-label',LABELS[index]+' in '+this.currency);record.inputs.push(input);
    const checkbox=this.node('input','smartsoft-native-toggle',stage);checkbox.type='checkbox';checkbox.setAttribute('aria-label',LABELS[index]);record.toggles.push(checkbox);
    checkbox.addEventListener('change',()=>{input.disabled=!checkbox.checked;if(!checkbox.checked)input.value='';this.onSound('button');this.render('auto');if(checkbox.checked)input.focus();});
   });
   const error=this.document.getElementById('autoplayError');stage.append(error);error.classList.add('smartsoft-native-error');
  }else if(kind==='bet'){
   for(let i=0;i<5;i++)add('bet'+i,'Choose bet',()=>{
    const stake=this.document.getElementById('stake'),window=this.betWindow(),value=window?.values[i];
    if(!value||stake.disabled||![...stake.options].some(option=>option.value===value&&!option.disabled))return;
    stake.value=value;stake.dispatchEvent(new this.document.defaultView.Event('change',{bubbles:true}));this.onSound('button');dialog.close();
   });
   for(const[name,direction]of [['up',-1],['down',1]])add(name,direction<0?'Previous bet levels':'Next bet levels',()=>{const current=this.betWindow();if(!current)return;this.offset=current.first+direction;this.onSound('button');this.render('bet');});
   const close=add('outsideClose','Close bet settings',()=>dialog.close());close.classList.add('smartsoft-bet-close');close.textContent='×';
  }else{
   dialog.addEventListener('close',()=>this.reveal.close());
   for(const[name,id]of [['red','red'],['black','black'],['collect','gambleCollect'],['close','closeGamble']])use(name,id);
   record.buttonStates={};
   for(const[name,button]of record.hits){
    const paint=state=>{record.buttonStates[name]=button.disabled?'':state;this.render('gamble');};
    button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')paint('hover');});
    button.addEventListener('pointerdown',()=>paint('active'));
    button.addEventListener('pointerup',event=>paint(event.pointerType==='mouse'?'hover':''));
    for(const event of ['pointerleave','pointercancel','blur'])button.addEventListener(event,()=>paint(''));
   }
   const status=this.document.getElementById('gambleStatus');stage.append(status);status.classList.add('smartsoft-native-status');
   const description=this.node('span','smartsoft-native-description',stage);description.setAttribute('aria-live','polite');record.description=description;
  }
 }
 createLegacyAuto(record){
  const{dialog,stage,canvas}=record;record.legacy=true;canvas.remove();dialog.dataset.smartsoftLegacyAuto='true';stage.classList.add('smartsoft-legacy-auto');
  for(const[name,url]of Object.entries(COMMON_AUTO_ASSETS))stage.style.setProperty('--native-'+name,'url("'+url+'")');
  const element=(tag,cls,text,parent=stage)=>{const node=this.node(tag,cls,parent);if(text!==undefined)node.textContent=text;return node;};
  const form=this.document.getElementById('autoplayForm');stage.append(form);form.classList.add('smartsoft-native-form');record.form=form;
  const head=element('div','head','AUTOPLAY'),close=this.document.getElementById('closeAutoplay');head.append(close);close.classList.add('close');close.textContent='';
  const spins=element('div','spins');
  for(const count of [10,25,50,75,'continuous']){
   const button=element('button',count==='continuous'?'infinite':'',count==='continuous'?'':String(count),spins);button.type='button';button.setAttribute('aria-label',count==='continuous'?'Continuous autoplay':count+' spins');record.hits.set('count'+count,button);
   button.addEventListener('click',()=>{this.document.getElementById('autoplayCount').value=String(count);this.onSound('button');this.renderLegacyAuto(record);});
  }
  const info=element('div','info'),left=element('div','left',undefined,info),right=element('div','right',undefined,info);
  element('div','head','SPIN TILL',left);element('div','head','STOP SPIN',right);
  for(const[id,text]of [['autoplayGain','If win  reachs or exceeds'],['autoplayLoss','If lose not exceeds']]){
   const row=element('div','row',undefined,left),caption=element('label','caption',text,row),holder=element('div','input',undefined,row),input=this.document.getElementById(id);caption.htmlFor=id;holder.append(input);input.placeholder='';input.setAttribute('aria-label',text+' in '+this.currency);record.inputs.push(input);element('span','currency',this.currency,holder);
  }
  const row=element('div','row',undefined,right),caption=element('label','caption','If i win BIG WIN',row),holder=element('label','checkbox',undefined,row),toggle=this.document.getElementById('autoplayBigWin');caption.htmlFor=toggle.id;holder.append(toggle);element('span','',undefined,holder);toggle.setAttribute('aria-label','Stop after BIG WIN');
  toggle.addEventListener('change',()=>this.onSound('button'));
  const buttons=element('div','buttons'),start=this.document.getElementById('startAutoplay');buttons.append(start);start.setAttribute('form','autoplayForm');start.textContent=smartSoftAutoStartLabel(this.id);
  const error=this.document.getElementById('autoplayError');stage.append(error);error.classList.add('smartsoft-legacy-error');
 }
 resetAuto(){const record=this.records.get('auto');if(record.legacy){record.inputs.forEach(input=>{input.disabled=false;});return;}record.inputs.forEach((input,i)=>{record.toggles[i].checked=!!input.value;input.disabled=!record.toggles[i].checked;});}
 renderLegacyAuto(record){const value=this.document.getElementById('autoplayCount').value;for(const[name,button]of record.hits){const active=name.slice(5)===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}record.stage.dataset.nativeDialogReady='true';}
 betWindow(){const stake=this.document.getElementById('stake');return nativeBetWindow([...stake.options].filter(option=>!option.disabled).map(option=>option.value),stake.value,this.offset);}
 sync({state,canGamble,canCollect}={}){if(state)this.state=state;this.canGamble=canGamble;this.canCollect=canCollect;this.reveal.update(this.state);this.renderAll();}
 renderAll(){for(const kind of this.records.keys())this.render(kind);}
 render(kind){
  const record=this.records.get(kind),manifest=this.binding;if(!record||!manifest||this.disposed)return;
  if(record.legacy){this.renderLegacyAuto(record);return;}
  let view={};
  if(kind==='auto')view={count:Number(this.document.getElementById('autoplayCount').value),limits:record.toggles.map(toggle=>toggle.checked)};
  else if(kind==='bet'){const stake=this.document.getElementById('stake');view={values:[...stake.options].filter(option=>!option.disabled).map(option=>option.value),selected:stake.value,offset:this.offset};}
  else view={...this.reveal.view(),portrait:this.document.defaultView.innerHeight>this.document.defaultView.innerWidth,buttonStates:record.buttonStates};
  view.currency=this.currency;
  const scene=smartSoftDialogScene(manifest,kind,view);if(!scene)return;
  const win=this.document.defaultView,availableWidth=Math.max(100,Math.min(win.innerWidth-24,kind==='gamble'?1000:600)),availableHeight=Math.max(100,win.innerHeight-100),scale=Math.min(availableWidth/scene.width,availableHeight/scene.height),dpr=Math.min(2,win.devicePixelRatio||1);
  record.dialog.style.width=scene.width*scale+'px';record.stage.style.aspectRatio=scene.width+'/'+scene.height;
  record.canvas.width=Math.ceil(scene.width*dpr);record.canvas.height=Math.ceil(scene.height*dpr);const ctx=record.canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,scene.width,scene.height);
  for(const command of scene.commands){if(command.type==='clip'){ctx.save();ctx.beginPath();command.points.forEach((value,i)=>{if(i%2===0){if(i===0)ctx.moveTo(value,command.points[i+1]);else ctx.lineTo(value,command.points[i+1]);}});ctx.closePath();ctx.clip();}else if(command.type==='unclip')ctx.restore();else if(command.type==='sprite')drawAtlasFrame(ctx,this.images.get(manifest.frames[command.frame].file),manifest.frames[command.frame],command.box,{padding:true});else{ctx.font=`400 ${command.fontSize}px ${command.font==='regular'?'SmartSoftDialogRegular':'SmartSoftDialogCaps'},Arial,sans-serif`;ctx.textAlign=command.align;ctx.textBaseline='middle';ctx.fillStyle=command.color;ctx.fillText(command.text,command.x,command.y);}}
  const position=(element,b)=>{if(!b)return;Object.assign(element.style,{left:100*b.x/scene.width+'%',top:100*b.y/scene.height+'%',width:100*b.width/scene.width+'%',height:100*b.height/scene.height+'%'});};
  for(const[name,button]of record.hits){const b=scene.controls[name];if(b)position(button,b);if(kind==='auto'&&name.startsWith('count'))button.setAttribute('aria-pressed',String(Number(name.slice(5))===view.count));}
  if(kind==='auto'){record.inputs.forEach((input,i)=>{position(input,scene.positions['input'+i]);input.style.fontSize=24*scale+'px';position(record.toggles[i],scene.controls['toggle'+i]);});}
  else if(kind==='bet'){
   const list=scene.positions.list;this.offset=list.first;
   for(let i=0;i<5;i++){const button=record.hits.get('bet'+i),value=list.values[i];button.hidden=!value;button.disabled=this.document.getElementById('stake').disabled;button.setAttribute('aria-label',value+' '+this.currency);button.setAttribute('aria-pressed',String(value===view.selected));}
   record.hits.get('up').disabled=!list.canUp;record.hits.get('down').disabled=!list.canDown;
  }else{
   const valid=!!view.roundId;
   if(typeof this.canGamble==='boolean'||!valid||view.pending)record.hits.get('red').disabled=record.hits.get('black').disabled=!valid||view.pending||!this.canGamble;
   if(typeof this.canCollect==='boolean'||!valid||view.pending)record.hits.get('collect').disabled=!valid||view.pending||!this.canCollect;
   record.description.textContent=valid?view.cardLabel+'. Gamble amount '+view.amount+' '+this.currency+'. Gamble to win '+view.toWin+' '+this.currency+'.':'Waiting for a confirmed round.';
   record.stage.dataset.receipt=view.roundId?view.roundId+':'+view.version:'';record.stage.dataset.card=view.card??'';record.stage.dataset.gambleLayout=scene.usesPortraitGambleArt?'portrait':'landscape';record.stage.dataset.revealPhase=view.revealPhase??'';record.stage.dataset.statusOpacity=String(view.cardStatus?.opacity??0);
  }
  record.scene=scene;record.stage.dataset.nativeDialogReady='true';record.stage.dataset.layoutFallbacks=String(scene.fallbacks.length);
 }
 dispose(){this.disposed=true;this.token++;this.reveal.dispose();this.document?.defaultView?.removeEventListener('resize',this.resize);for(const face of this.fonts)this.document.fonts.delete(face);this.fonts=[];this.css?.remove();releaseDialogImages(this.images);this.images?.clear();}
}
