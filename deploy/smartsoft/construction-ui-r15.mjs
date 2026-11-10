// Upcoming references stay in the existing lobby. They are never fake LIVE cards.
const PREFIX='/native-library/remaining20/20261110-construction-r15/';
const IDS=new Set(['multihot100_native','habeshafortune5_native','multihotwildways_native','multihot5wild_native','multihot5superwilds_native','multihotdeluxe_native','burningice_native','burningice10_native','burningice40_native','coinminer_native']);
const KEY=Symbol.for('superwin.construction.r15');
window[KEY]?.dispose();
const node=(tag,parent,text)=>{const value=document.createElement(tag);if(text!==undefined)value.textContent=text;if(parent)parent.append(value);return value;};
const section=node('section');section.id='upcoming-games';section.className='construction-queue';section.setAttribute('aria-labelledby','upcoming-games-heading');
const details=node('details',section),summary=node('summary',details),heading=node('span',summary,'Upcoming games');heading.id='upcoming-games-heading';
const total=node('span',summary,'Loading…');total.className='construction-count';
const form=node('form',details);form.className='construction-search';
const label=node('label',form,'Search games'),input=node('input',label);input.type='search';input.maxLength=120;input.placeholder='Game name';
const studioLabel=node('label',form,'Studio'),studio=node('select',studioLabel);node('option',studio,'All studios').value='';
const search=node('button',form,'Search');search.type='submit';
const status=node('p',details);status.className='construction-status';status.setAttribute('aria-live','polite');
const cards=node('div',details);cards.className='construction-cards';
const footer=node('div',details);footer.className='construction-pages';
const previous=node('button',footer,'Previous'),pageNumber=node('span',footer),next=node('button',footer,'Next');previous.type=next.type='button';
let offset=0,nextOffset=null,epoch=0,controller=null,disposed=false,loaded=false;

async function load(nextPage=0){
 const sequence=++epoch;controller?.abort();controller=new AbortController();
 previous.disabled=next.disabled=true;status.textContent='Loading games…';cards.setAttribute('aria-busy','true');
 const query=new URLSearchParams({offset:String(nextPage),limit:'24',q:input.value.trim(),studio:studio.value});
 try{
  const response=await fetch('/api/game-construction-queue?'+query,{credentials:'omit',redirect:'error',signal:controller.signal});
  if(!response.ok)throw Error('QUEUE_UNAVAILABLE');
  const data=await response.json();
  if(disposed||sequence!==epoch)return;
  if(data.schemaVersion!==1||!Array.isArray(data.items)||data.items.length>24||data.offset!==nextPage||!Number.isSafeInteger(data.total)||!Number.isSafeInteger(data.referenceCount)||!Array.isArray(data.providers))throw Error('INVALID_QUEUE');
  if(!loaded){for(const name of data.providers){const option=node('option',studio,name);option.value=name;}loaded=true;}
  total.textContent=data.referenceCount.toLocaleString('en')+' preparing';
  cards.replaceChildren();
  for(const game of data.items){
   const card=node('article',cards);card.dataset.queueId=game.queueId;
   if(game.cover){const image=node('img',card);image.loading='lazy';image.decoding='async';image.alt=game.name;image.width=300;image.height=225;image.src=PREFIX+'covers/'+encodeURIComponent(game.queueId).replace('%3A',':');image.addEventListener('error',()=>image.remove(),{once:true});}
   node('h3',card,game.name);node('p',card,game.studio);const badge=node('span',card,'Preparing');badge.className='construction-preparing';
  }
  offset=data.offset;nextOffset=data.nextOffset;previous.disabled=offset===0;next.disabled=nextOffset===null;
  pageNumber.textContent=data.total?Math.floor(offset/24)+1+' / '+Math.ceil(data.total/24):'0 / 0';
  status.textContent=data.total.toLocaleString('en')+' games being prepared';
 }catch(error){if(error.name!=='AbortError'&&!disposed&&sequence===epoch){status.textContent='The game list could not load. Use Search to try again.';}}
 finally{if(sequence===epoch)cards.setAttribute('aria-busy','false');}
}

function openAccountGame(event){
 const button=event.target.closest?.('.r20-native-open'),card=button?.closest('[data-r20-game]');
 const id=card?.getAttribute('data-r20-game');
 if(!IDS.has(id)||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();event.stopImmediatePropagation();location.assign('/games/'+id);
}
function mount(){if(!section.isConnected)document.body.append(section);}
form.addEventListener('submit',event=>{event.preventDefault();void load(0);});
previous.addEventListener('click',()=>void load(Math.max(0,offset-24)));
next.addEventListener('click',()=>{if(nextOffset!==null)void load(nextOffset);});
details.addEventListener('toggle',()=>{if(details.open&&!loaded)void load(0);});
document.addEventListener('click',openAccountGame,true);
mount();
// Load the count from one small page. Remaining cards load only when requested.
void load(0);
window[KEY]={dispose(){disposed=true;controller?.abort();section.remove();document.removeEventListener('click',openAccountGame,true);}};
