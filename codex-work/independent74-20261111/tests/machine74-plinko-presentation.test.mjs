import test from 'node:test';
import assert from 'node:assert/strict';
import * as math from '../math/official72.mjs';
import {publicLibrary74Definition} from '../server/existing-library74-adapter.mjs';
import {animateRound,machineMarkup,plinkoGeometry} from '../client/machine74-renderer.mjs';

class Stage {
 constructor(){
  this.classes=new Set();this.listeners=new Map();this.style={setProperty(){}};
  this.classList={add:(...names)=>names.forEach(name=>this.classes.add(name)),remove:(...names)=>names.forEach(name=>this.classes.delete(name)),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};
  this.ball={attributes:{},setAttribute(name,value){this.attributes[name]=value;}};
 }
 set innerHTML(markup){this.markup=markup;const circle=markup.match(/<circle class="m74-plinko-ball[^>]+>/)[0];for(const name of ['cx','cy'])this.ball.setAttribute(name,circle.match(new RegExp(name+'="([^"]+)"'))[1]);}
 get innerHTML(){return this.markup;}
 replaceChildren(){}
 querySelector(selector){return selector==='.m74-plinko-ball'?this.ball:null;}
 querySelectorAll(){return [];}
 addEventListener(name,handler){this.listeners.set(name,handler);}
 removeEventListener(name,handler){if(this.listeners.get(name)===handler)this.listeners.delete(name);}
}

test('Plinko starts at release before the first browser frame, then STOP reveals the same confirmed result once',async()=>{
 const full=math.getGameDefinition('ind74_official_plinkoxclassic'),view=publicLibrary74Definition(full);
 const stored=math.startRound({gameId:full.id,betMinor:'100',rng:()=>0,now:1700000000000});
 const round=math.publicRound(stored,1700000000000),before=JSON.stringify(round),stage=new Stage(),actions=[],cues=[];
 const animation=animateRound(stage,view,round,round,{onAction:action=>actions.push(action),audio:{cue:cue=>cues.push(cue)}});
 // No microtask or animation callback has run: a slow first frame still
 // cannot flash the ball in its destination before the visible drop.
 assert.deepEqual(stage.ball.attributes,{cx:'300',cy:'18'});
 assert.equal(stage.classes.has('m74-animating'),true);
 animation.stop();animation.stop();await animation.promise;
 const landing=plinkoGeometry(view,round.outcome.path).points.at(-1);
 assert.deepEqual(stage.ball.attributes,{cx:String(landing.x),cy:String(landing.y)});
 assert.equal(stage.innerHTML,machineMarkup(view,round,{disabled:true}));
 assert.equal(stage.classes.has('m74-animating'),false);
 assert.equal(JSON.stringify(round),before);
 assert.deepEqual(actions,[]);
 assert.equal(cues.filter(cue=>cue.endsWith('Win')||cue==='lose').length,1);
});
