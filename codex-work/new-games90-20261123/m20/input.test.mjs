import test from 'node:test';
import assert from 'node:assert/strict';
import { activateFromKeyboard } from './input.mjs';
const fixture = () => { const calls=[], held=new Set(), scene={}, root={contains:node=>node.belongs===true}, button={belongs:true,disabled:false,dataset:{action:'spin'}};
  return {calls,held,scene,root,button,send({target=root,key=' ',repeat=false}={}){let cancelled=false;const consumed=activateFromKeyboard({target,key,repeat,preventDefault(){cancelled=true;}},{root,scene,held,action:(...args)=>calls.push(args)});return{consumed,cancelled};}}; };
test('focused SPIN cannot repeat wagers when held Enter spans a complete round',()=>{const s=fixture(), target={closest:()=>s.button};s.send({target,key:'Enter'});for(let i=0;i<40;i++)assert.equal(s.send({target,key:'Enter',repeat:true}).cancelled,true);assert.equal(s.calls.length,1);s.held.delete('Enter');s.send({target,key:'Enter'});assert.equal(s.calls.length,2);});
test('repeated Space at root is consumed with no second activation even without repeat flag',()=>{const s=fixture();s.send();for(let i=0;i<20;i++)s.send();assert.equal(s.calls.length,1);});
test('typing in a form input does not trigger the game or cancel normal typing',()=>{const s=fixture();assert.deepEqual(s.send({target:{closest:()=>null}}),{consumed:false,cancelled:false});assert.equal(s.calls.length,0);});
test('disabled button and another root cannot route an action',()=>{const s=fixture();s.button.disabled=true;assert.equal(s.send({target:{closest:()=>s.button}}).consumed,false);s.button.disabled=false;s.button.belongs=false;assert.equal(s.send({target:{closest:()=>s.button}}).consumed,false);assert.equal(s.calls.length,0);});
