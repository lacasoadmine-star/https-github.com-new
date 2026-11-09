import {createCoinBetController} from './coin-bet-controller.mjs';

// Uses the host's existing selects and change handlers. No start/action callback,
// provider popup styling, account access, or network capability is accepted.
export function mountCoinBetHost({game,ui,getSelection,document=globalThis.document,window=globalThis.window,timers}){
 const owner=getSelection(),listeners=[],added=[],buttons=[];
 let disposed=false,pointer=null,applying=false;
 const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
 const current=()=>{
  const value=getSelection();
  return {...value,confirmed:value.confirmed!==false&&!disposed&&ui.betDialog.open&&document.visibilityState!=='hidden'&&value.sessionId===owner.sessionId&&value.modelVersion===owner.modelVersion};
 };
 const controller=createCoinBetController({game,getSelection:current,timers,onSelection:selection=>{
  applying=true;
  try{for(const field of ['stake','mines'])if(String(selection[field])!==ui[field].value){
   ui[field].value=String(selection[field]);ui[field].dispatchEvent(new window.Event('change',{bubbles:true}));
  }}finally{applying=false;}
  sync();
 }});
 const cancel=()=>{pointer=null;controller.cancel();};
 function sync(){
  if(disposed)return;
  try{
   const view=controller.view();if(view.disabled)cancel();
   for(const {button,field,operation}of buttons)button.disabled=view.rows.find(row=>row.field===field)[operation+'Disabled'];
   ui.stake.disabled=ui.mines.disabled=view.disabled;
  }catch{cancel();for(const {button}of buttons)button.disabled=true;ui.stake.disabled=ui.mines.disabled=true;}
 }
 function bind(button,field,operation){
  buttons.push({button,field,operation});
  listen(button,'pointerdown',event=>{
   if(event.button!==0||event.isPrimary===false||pointer!==null)return;
   try{if(!controller.begin(field,operation))return;}catch{return;}
   pointer=event.pointerId;
   try{button.setPointerCapture?.(pointer);}catch{cancel();return;}
   button.focus();event.preventDefault();
  });
  listen(button,'pointerup',event=>{if(event.pointerId!==pointer)return;pointer=null;controller.release();sync();});
  listen(button,'pointercancel',cancel);listen(button,'lostpointercapture',cancel);
  // Pointer selection is applied on release; its following click is not a second
  // operation. Keyboard/AT clicks have detail 0 and preserve native activation.
  listen(button,'click',event=>{event.preventDefault();event.stopImmediatePropagation();if(event.detail!==0)return;cancel();try{controller.choose(field,operation);}catch{cancel();}sync();},true);
  listen(button,'keydown',event=>{if(event.repeat&&(event.key===' '||event.key==='Enter'))event.preventDefault();});
 }
 function make(field,operation,text){
  const button=document.createElement('button');button.type='button';button.className='stake-step';button.textContent=text;
  button.dataset.coinBet=field+'-'+operation;button.setAttribute('aria-label',operation+' '+field);added.push(button);bind(button,field,operation);return button;
 }
 const stake=ui.stake,mines=ui.mines;
 stake.parentElement.insertBefore(make('stake','min','MIN'),ui.minus);
 stake.parentElement.append(make('stake','max','MAX'));bind(ui.minus,'stake','minus');bind(ui.plus,'stake','plus');
 for(const [operation,label]of [['min','MIN'],['minus','−']])mines.parentElement.insertBefore(make('mines',operation,label),mines);
 for(const [operation,label]of [['plus','+'],['max','MAX']])mines.parentElement.append(make('mines',operation,label));
 for(const node of [stake,mines])listen(node,'change',()=>{if(!applying)cancel();sync();});
 listen(window,'pointerup',event=>{if(event.pointerId===pointer)cancel();});
 listen(window,'blur',cancel);listen(window,'offline',cancel);listen(window,'pagehide',cancel);
 listen(document,'visibilitychange',()=>{if(document.visibilityState==='hidden')cancel();});
 listen(ui.betDialog,'cancel',cancel);listen(ui.betDialog,'close',cancel);
 sync();
 return {sync,cancel,dispose(){if(disposed)return;cancel();disposed=true;controller.dispose();for(const remove of listeners)remove();for(const node of added)node.remove();}};
}
