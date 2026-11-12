import {games} from './games.mjs';
import {Art} from './art.mjs';
const sprites=await fetch('/new74/sprites.json').then(r=>r.json());
for(const game of games){
 const link=document.createElement('a'),canvas=document.createElement('canvas'),footer=document.createElement('footer'),name=document.createElement('h2'),play=document.createElement('span');
 link.className='card';link.href='/new74/'+game.id;link.setAttribute('aria-label',game.name+' · Play');canvas.width=640;canvas.height=460;name.textContent=game.name;play.textContent='PLAY NOW →';footer.append(name,play);link.append(canvas,footer);document.getElementById('cards').append(link);
 const art=new Art(sprites[game.art]);await art.load();const c=canvas.getContext('2d');art.draw(c,'Title',45,38,550,130,{tight:true});
 const symbols=game.columns===3?['dollar','777','golden_bell']:['bell','seven','cherry'];symbols.forEach((s,i)=>art.draw(c,'Box/'+game.symbols[s],40+i*190,205,180,190,{tight:true}));
}
