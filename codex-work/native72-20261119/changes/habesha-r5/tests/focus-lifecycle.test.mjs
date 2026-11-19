import test from 'node:test';
import assert from 'node:assert/strict';
import {HabeshaLifecycle} from '../assets/habesha-lifecycle.mjs';

function fixture(options={}){
 const calls=[],state={auto:25};
 const renderer={pause(){calls.push('pause');},resume(){calls.push('resume');}};
 const lifecycle=new HabeshaLifecycle(renderer,{...options,onPause(){calls.push('stop-auto');state.auto=0;}});
 return {lifecycle,calls,state};
}

test('window blur pauses before AUTO cleanup and focus never restarts AUTO',()=>{
 const f=fixture();f.lifecycle.blur();assert.deepEqual(f.calls,['pause','stop-auto']);assert.equal(f.state.auto,0);
 assert.equal(f.lifecycle.focus(false),true);assert.deepEqual(f.calls,['pause','stop-auto','resume']);assert.equal(f.state.auto,0);
});

test('blur then hidden then focus cannot resume until visibility returns',()=>{
 const f=fixture();f.lifecycle.blur();f.lifecycle.visibility(true);f.lifecycle.focus(true);
 assert.deepEqual(f.calls,['pause','stop-auto']);assert.equal(f.lifecycle.running,false);
 assert.equal(f.lifecycle.visibility(false),true);assert.deepEqual(f.calls,['pause','stop-auto','resume']);
});

test('hidden then blur then visible cannot resume until focus returns',()=>{
 const f=fixture();f.lifecycle.visibility(true);f.lifecycle.blur();assert.equal(f.lifecycle.visibility(false),false);
 assert.deepEqual(f.calls,['pause','stop-auto']);assert.equal(f.lifecycle.focus(false),true);assert.deepEqual(f.calls,['pause','stop-auto','resume']);
});

test('page-cache suspension survives premature focus and visible events',()=>{
 const f=fixture();f.lifecycle.pageHide();f.lifecycle.visibility(true);f.lifecycle.blur();f.lifecycle.visibility(false);f.lifecycle.focus(false);
 assert.equal(f.lifecycle.running,false);assert.deepEqual(f.calls,['pause','stop-auto']);
 assert.equal(f.lifecycle.pageShow({hidden:false,focused:true}),true);assert.deepEqual(f.calls,['pause','stop-auto','resume']);
});

test('restoring an unfocused or hidden page waits for every pause condition to clear',()=>{
 for(const initial of [{hidden:false,focused:false},{hidden:true,focused:true}]){
  const f=fixture();f.lifecycle.pageHide();assert.equal(f.lifecycle.pageShow(initial),false);assert.equal(f.lifecycle.running,false);
  if(initial.hidden)f.lifecycle.visibility(false);else f.lifecycle.focus(false);
  assert.deepEqual(f.calls,['pause','stop-auto','resume']);
 }
});

test('initial hidden/unfocused pages suspend immediately and duplicate events are idempotent',()=>{
 const f=fixture({hidden:true,focused:false});assert.deepEqual(f.calls,['pause','stop-auto']);
 f.lifecycle.blur();f.lifecycle.visibility(true);f.lifecycle.pageHide();assert.deepEqual(f.calls,['pause','stop-auto']);
 f.lifecycle.pageShow({hidden:false,focused:true});f.lifecycle.focus(false);f.lifecycle.visibility(false);assert.deepEqual(f.calls,['pause','stop-auto','resume']);
});

test('disposed lifecycle cannot resume through focus, visibility or pageshow',()=>{
 const f=fixture();f.lifecycle.dispose();f.lifecycle.focus(false);f.lifecycle.visibility(false);f.lifecycle.pageShow({hidden:false,focused:true});
 assert.equal(f.lifecycle.running,false);assert.deepEqual(f.calls,['pause','stop-auto']);
});
