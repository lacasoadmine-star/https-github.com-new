import {referenceArt} from './reels-v2300.js';
import {paytableAmount} from './payout-view-v2900.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
const label=s=>String(s).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const cells={cherry:0,orange:1,lemon:2,plum:3,grapes:4,watermelon:5,golden_bell:6,'777':7,clover:8,dollar:9,pot_of_gold:10,big_star:12,wild:12,super_wild:12,scatter:13,winged_bell:14,fox:15};
export function symbolArt(symbol,id){const e=node('span');e.className='pay-symbol';e.setAttribute('role','img');e.setAttribute('aria-label',label(symbol));const reference=referenceArt[id]?.[symbol];if(reference){e.style.backgroundImage=`url("${reference}")`;e.style.backgroundSize='contain';e.style.backgroundPosition='center';return e;}const cell=symbol==='777'&&id==='hot_foxy_20'?11:cells[symbol];if(cell===undefined){e.textContent=label(symbol);return e;}e.style.backgroundPosition=`${cell%4*100/3}% ${Math.floor(cell/4)*100/3}%`;return e;}
let currentModel;
export function updateRulesBet(bet){if(!currentModel)return;const host=document.querySelector('.sw-game-rules');if(!host)return;host.querySelector('.pay-stake').textContent=`BET ${bet} ETB`;
 for(const e of host.querySelectorAll('[data-pay-factor]'))e.textContent=paytableAmount(bet,currentModel.paylines,e.dataset.payFactor);
}
export function installRules(model){currentModel=model;const host=document.getElementById('options-content');host.querySelector('.sw-game-rules')?.remove();const s=node('section');s.className='sw-game-rules';s.append(node('h3','PAYTABLE'));
 const heading=node('p','Symbol wins in ETB · before wheel multiplier');heading.className='pay-heading';s.append(heading);const stake=node('p');stake.className='pay-stake';s.append(stake);
 const grid=node('div');grid.className='paytable-symbols';
 for(const [symbol,pays]of Object.entries(model.paytable||{})){const card=node('article');card.className='pay-card';card.append(symbolArt(symbol,model.id),node('h4',label(symbol)));const table=node('dl');for(const count of Object.keys(pays).sort((a,b)=>b-a)){const term=node('dt',`${count} symbols`),value=node('dd');value.dataset.payFactor=String(pays[count]);table.append(term,value);}card.append(table);grid.append(card);}s.append(grid);
 const wilds=model.rules?.wildSymbols||[];if(wilds.length){const p=node('p',`Wild substitution: ${wilds.map(label).join(', ')} replace regular symbols, excluding Scatter.`);p.className='rule-wild';s.append(p);}
 const mechanics=node('details');mechanics.open=true;mechanics.append(node('summary','RULES & CONTROLS'));
 mechanics.append(node('p',`${model.reels} reels × ${model.rows} rows · ${model.paylines} fixed lines · left to right. Total bet ÷ ${model.paylines} = bet per line. A line award uses its symbol factor and the server multiplier.`));
 mechanics.append(node('p',`Wheel: ${(model.wheel?.values||[]).map(v=>v+'×').join(' · ')}. Maximum payout: ${model.maxWinMultiplier}× total bet. Settlement rounds fractional cents down.`));
 if(model.features?.maxStackMultiplier)mechanics.append(node('p',`Winning wilds can increase the multiplier up to ${model.features.maxStackMultiplier}×.`));
 const fs=model.features?.freeSpins;if(fs?.spins)mechanics.append(node('p',`${fs.trigger} scatters award ${fs.spins} free spins at the triggering bet.${fs.retrigger?' Free spins can retrigger.':''}`));
 const gamble=model.rules?.gamble;mechanics.append(node('p',gamble?`X2 gamble: ${gamble.winProbability*100}% chance; winning returns ${gamble.winMultiplier}×, losing returns zero. Maximum ${gamble.maxRounds} attempts.`:'X2 gamble is unavailable for this game’s current server rules.'));
 const controls=node('dl');controls.className='controls-guide';for(const [name,text]of [['SPIN','Starts one server-settled round. RETRY SPIN confirms the same request after a connection problem.'],['AUTO','Starts ten rounds. STOP AUTO stops future rounds; an active round finishes.'],['BET / − / +','Changes the stake within server-approved levels before a round.'],['COLLECT','Acknowledges a win already credited to your wallet. It does not credit it twice.'],['TURBO','Changes animation speed only.'],['SOUND','Mute, volume and a sound test are available in Settings.'],['SPIN ID','Identifies the actual server round in the receipt and History.']])controls.append(node('dt',name),node('dd',text));mechanics.append(controls);s.append(mechanics);host.append(s);
 updateRulesBet(document.getElementById('bet').textContent);
}
