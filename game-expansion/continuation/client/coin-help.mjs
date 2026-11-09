import {moneyMinor,fromMinor} from './session.mjs';

// Coin's public table is rows of {mines,multi}; it is not a slot-symbol table.
// This read-only view never changes the selected wager/mines or submits a pick.
const ID='coinminer_native';
const fail=code=>{throw new Error(code);};
function hundredths(value){
 const text=typeof value==='number'&&Number.isFinite(value)?String(value):value;
 if(typeof text!=='string'||!/^(0|[1-9]\d{0,4})(\.\d{1,2})?$/.test(text))fail('INVALID_COIN_HELP_COEFFICIENT');
 const [whole,fraction='']=text.split('.'),result=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(result<=0n)fail('INVALID_COIN_HELP_COEFFICIENT');return result;
}
export function buildCoinHelpModel(game,{stake,mines}={}){
 if(game?.id!==ID||game.paytable?.providerVariant!=='coin_miner_94'||game.paytable.verifiedPublicTable!==true||!Array.isArray(game.paytable.rows))fail('COIN_HELP_UNAVAILABLE');
 const amount=moneyMinor(stake);if(amount===null||amount<=0n)fail('INVALID_COIN_HELP_STAKE');
 const table=game.paytable.rows,choices=game.controls?.mines?.values??game.controls?.mines?.choices;
 if(!Array.isArray(choices)||!choices.length||choices.some(value=>!Number.isInteger(value)||value<1||value>24)||new Set(choices).size!==choices.length||table.length!==choices.length||table.some(row=>!row||!choices.includes(row.mines)||!Array.isArray(row.multi)||row.multi.length!==25-row.mines)||new Set(table.map(row=>row.mines)).size!==table.length)fail('INVALID_COIN_HELP_TABLE');
 const selected=mines===undefined?(game.controls.mines.default??choices[0]):mines;
 if(!choices.includes(selected))fail('INVALID_COIN_HELP_MINES');
 const entry=table.find(row=>row.mines===selected);
 return {gameId:ID,variant:'coin_miner_94',stake,stakeMinor:String(amount),mines:selected,choices:[...choices],
  rows:entry.multi.map((value,index)=>{const coefficient=hundredths(value),payout=amount*coefficient/100n;
   return {safePicks:index+1,coefficientHundredths:String(coefficient),multiplier:`${coefficient/100n}.${String(coefficient%100n).padStart(2,'0')}×`,payoutMinor:String(payout),totalReturn:fromMinor(String(payout))};}),
 };
}

export function appendCoinPaytable(container,{game,stake,mines,document:providedDocument}={}){
 const document=providedDocument??container?.ownerDocument;if(!document||!container?.append)fail('COIN_HELP_CONTAINER_REQUIRED');
 const initial=buildCoinHelpModel(game,{stake,mines}),element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);return node;};
 const section=element('section');section.id='coinHelpPaytable';section.setAttribute('aria-label','Coin Miner multiplier ladder');
 section.append(element('h3','Multiplier ladder'),element('p',`At ${fromMinor(initial.stakeMinor)} ETB total stake. Changing mines below only changes this preview.`));
 const label=element('label','Mines '),select=element('select');select.id='coinHelpMines';select.setAttribute('aria-label','Preview mine count');
 for(const value of initial.choices){const option=element('option',String(value));option.value=String(value);select.append(option);}select.value=String(initial.mines);label.append(select);section.append(label);
 const table=element('table');table.id='coinHelpLadder';const caption=element('caption'),head=element('thead'),header=element('tr'),body=element('tbody');
 for(const title of ['Safe picks','Multiplier','Total return (ETB)']){const cell=element('th',title);cell.setAttribute('scope','col');header.append(cell);}head.append(header);table.append(caption,head,body);section.append(table);
 const update=value=>{const model=buildCoinHelpModel(game,{stake,mines:value}),safe=25-model.mines;caption.textContent=`${model.mines} mines · ${safe} safe ${safe===1?'tile':'tiles'}`;
  body.replaceChildren(...model.rows.map(row=>{const tr=element('tr');tr.dataset.safePicks=String(row.safePicks);tr.append(element('td',row.safePicks),element('td',row.multiplier),element('td',row.totalReturn));return tr;}));
 };select.addEventListener('change',()=>update(Number(select.value)));update(initial.mines);
 section.append(element('p','Amounts are total returns, including any returned stake. A safe pick can return less than your stake. Revealing a mine returns zero. Money is floored once to santim; the table multiplier stays unchanged.'));
 container.append(section);return section;
}

// Dedicated Coin help avoids rendering generic slot metadata as game rules.
// Its only interactive element changes this table's preview mine count.
export function mountCoinHelp(container,{game,stake,mines,document:providedDocument}={}){
 const document=providedDocument??container?.ownerDocument;
 if(!document||!container?.replaceChildren)fail('COIN_HELP_CONTAINER_REQUIRED');
 const preview=buildCoinHelpModel(game,{stake,mines}),minimum=moneyMinor(game.minStake),maximum=moneyMinor(game.maxStake);
 if(minimum===null||maximum===null||minimum<=0n||maximum<minimum)fail('INVALID_COIN_HELP_STAKE_RANGE');
 const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);return node;};
 const stakeLine=element('p',`Selected stake: ${fromMinor(preview.stakeMinor)} ETB. Range: ${fromMinor(String(minimum))}–${fromMinor(String(maximum))} ETB.`);stakeLine.id='coinHelpStake';
 const instructions=element('ol');instructions.id='coinHelpInstructions';
 for(const text of ['Choose a stake and mine count, then press PLAY.','Reveal safe tiles to update your return. Collect before another pick to keep the shown amount.','A mine pays zero. The final safe tile pays automatically, once.'])instructions.append(element('li',text));
 container.replaceChildren(stakeLine,instructions);
 const section=appendCoinPaytable(container,{game,stake,mines:preview.mines,document});
 container.append(element('p','These rules apply to this independent ZPLAY game.'));
 return section;
}
