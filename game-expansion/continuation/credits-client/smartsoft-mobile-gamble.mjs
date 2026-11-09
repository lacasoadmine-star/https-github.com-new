import {smartSoftDialogProfile} from './smartsoft-dialog-profiles.mjs';

// These are title-specific text overrides from the public demo, not a generic
// phone reskin. Numeric geometry remains in the captured per-title profiles.
// The two inherited scales are specified by Components/double.js, whose hash
// and the exact mobile atlas provenance are recorded alongside the manifests.
const TEXT=Object.freeze({
 multihot100_native:Object.freeze({amount:15,cash:15,cashGap:5,previous:15,previousFont:'caps',instruction:18,red:24,black:24,take:17,ink:'#fff23c',cashInk:'#fff'}),
 multihot5superwilds_native:Object.freeze({amount:15,cash:15,cashGap:5,previous:15,previousFont:'caps',instruction:18,red:24,black:24,take:17,ink:'#fff23c',cashInk:'#fff'}),
 multihotwildways_native:Object.freeze({amount:16,cash:16,cashGap:0,previous:18,previousFont:'regular',instruction:16,red:21,black:21,take:24,ink:'#f3e678',cashInk:'#fbffe2'}),
 multihot5wild_native:Object.freeze({amount:16,cash:16,cashGap:0,previous:18,previousFont:'regular',instruction:16,red:21,black:21,take:24,ink:'#f3e678',cashInk:'#fbffe2'}),
 multihotdeluxe_native:Object.freeze({amount:16,cash:16,cashGap:0,previous:18,previousFont:'regular',instruction:16,red:21,black:21,take:24,ink:'#f1890b',cashInk:'#fbffe2'}),
 habeshafortune5_native:Object.freeze({amount:16,cash:16,cashGap:0,previous:18,previousFont:'regular',instruction:16,red:21,black:21,take:24,ink:'#fdd54b',cashInk:'#fbffe2'}),
});
const NAMES=Object.freeze(['Background','Black','BlackActive','BlackEffect','BlackHover','Red','RedActive','RedEffect','RedHover','Take','TakeActive','TakeHover','Close','CloseActive','CloseHover','Card/Hidden','Card/Ace_Clubs','Card/Ace_Diamonds','Card/Ace_Hearts','Card/Ace_Spades']);
export const PORTRAIT_GAMBLE_FRAMES=Object.freeze([...NAMES.map(name=>'Vertical/Double/'+name),...['Hidden','Ace_Clubs','Ace_Diamonds','Ace_Hearts','Ace_Spades'].map(name=>'Mobile/Double/Card/'+name)]);
export function hasSmartSoftPortraitGamble(manifest){
 return !!TEXT[manifest?.id]&&PORTRAIT_GAMBLE_FRAMES.every(name=>{
  const frame=manifest.frames?.[name],file=frame&&manifest.files?.[frame.file];
  return frame?.name===name&&file?.sha256===frame.textureSha256;
 });
}

export function smartSoftPortraitGambleScene(manifest,view={}){
 if(!hasSmartSoftPortraitGamble(manifest))return null;
 const profile=smartSoftDialogProfile(manifest.id),v=profile.values,prefix='Double.redBlack.',text=TEXT[manifest.id],commands=[],controls={},positions={},currency=view.currency==='CREDITS'?'CREDITS':'ETB';
 const raw=(name,property,fallback)=>v[prefix+name+'.mobile.vertical.'+property]??fallback;
 const origin={x:raw('background','x',0),y:raw('background','y',0)};
 const point=name=>({x:raw(name,'x',NaN)-origin.x,y:raw(name,'y',NaN)-origin.y});
 const original=key=>manifest.frames[key].original;
 const sprite=(key,x,y,scale=1)=>{const size=original(key),box={x,y,width:size.width*scale,height:size.height*scale};commands.push({type:'sprite',frame:key,box});return box;};
 const label=(value,x,y,fontSize,{font='caps',color='#fff'}={})=>commands.push({type:'text',text:String(value),x,y:y+fontSize/2,fontSize,font,color,align:'center'});
 const background=original('Vertical/Double/Background'),width=background.width,height=background.height;
 sprite('Vertical/Double/Background',0,0);
 const cardKey=String(view.card??'Double/Card/Hidden'),cardFrame=manifest.frames['Mobile/'+cardKey]?'Mobile/'+cardKey:'Mobile/Double/Card/Hidden',cardPoint=point('card'),cardScale=raw('card','scale',.75);
 sprite(cardFrame,cardPoint.x,cardPoint.y,cardScale);
 for(const[name,hit]of [['red','red'],['black','black'],['take','collect'],['close','close']]){
  const scale=raw(name,'scale',name==='close'?.75:1),p=point(name),base='Vertical/Double/'+name[0].toUpperCase()+name.slice(1),state=view.buttonStates?.[hit],key=state==='active'?base+'Active':state==='hover'?base+'Hover':base;
  const size=original(base);controls[hit]={...p,width:size.width*scale,height:size.height*scale};sprite(key,p.x,p.y,scale);
  if(name==='close')continue;
  const tx=raw(name+'Text','x',NaN),ty=raw(name+'Text','y',NaN);
  label(name==='take'?'TAKE WIN':name.toUpperCase(),p.x+tx*scale,p.y+ty*scale,text[name]*scale);
 }
 for(const[name,caption,amount]of [['amount','GAMBLE AMOUNT',view.amount],['toWin','GAMBLE TO WIN',view.toWin]]){
  const p=point(name);label(caption,p.x,p.y,text.amount,{color:text.ink});label((amount??'—')+' '+currency,p.x,p.y+text.amount+text.cashGap,text.cash,{color:text.cashInk});
 }
 const previous=point('previous');label('Previous Cards',previous.x,previous.y,text.previous,{font:text.previousFont});
 const historyPoint=point('history'),historyScale=raw('history','scale',.75),itemScale=v[prefix+'historyItem.scale']??.43,margin=v[prefix+'historyItem.margin']??0,history=(view.history??[]).slice(0,4);
 const entries=history.map(entry=>({...entry,frame:'Mobile/'+entry.frame})).filter(entry=>manifest.frames[entry.frame]);
 // The original history container scales both the cards and the spacing.
 const total=entries.reduce((sum,entry)=>sum+(original(entry.frame).width*itemScale+2*margin)*historyScale,0);let left=historyPoint.x-total/2;
 for(const entry of entries){const size=original(entry.frame);sprite(entry.frame,left,historyPoint.y,itemScale*historyScale);left+=(size.width*itemScale+2*margin)*historyScale;}
 const instruction=point('text');label('Choose Red or Black gamble, or take the win!',instruction.x,instruction.y,text.instruction,{font:'regular'});
 const allFinite=commands.every(command=>command.type==='sprite'?Object.values(command.box).every(Number.isFinite):Number.isFinite(command.x)&&Number.isFinite(command.y));
 if(!allFinite)return null;
 return{kind:'gamble',width,height,commands,controls,positions,fallbacks:[],usesPortraitGambleArt:true,statusEffect:view.cardStatus?{...view.cardStatus,frame:null,transparentFallback:true}:null};
}
