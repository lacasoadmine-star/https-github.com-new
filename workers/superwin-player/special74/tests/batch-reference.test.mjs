import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {sceneControls,allowedDemo,publicURL,betChangedInDirection}=createRequire(import.meta.url)('../tools/batch-controls.cjs');
const button=(path,label,bounds)=>({path,alpha:1,interactive:true,bounds,texture:{names:[label]},children:[]});
const scene=children=>({canvases:[{canvas:{x:0,y:0,w:200,h:200},width:200,height:200,resolution:2,scene:{path:'0.0',alpha:1,bounds:{x:0,y:0,w:100,h:100},children}}]});
test('observed controls map renderer resolution and iframe offset to real viewport coordinates',()=>{
 const result=sceneControls(scene([
  button('0.0.0','Buttons/SpinVertical',{x:20,y:30,w:20,h:20}),
  {path:'0.0.1',alpha:1,bounds:{x:22,y:32,w:15,h:8},text:'0.05',children:[]},
  button('0.0.2','Buttons/PlusVertical',{x:140,y:30,w:20,h:20})
 ]),{x:10,y:20},{width:220,height:240});
 assert.equal(result.controls.length,1);
 assert.deepEqual([result.controls[0].x,result.controls[0].y],[70,100]);
 assert.equal(result.bet,'0.05');
});
test('masked, transparent, disabled and unnamed shapes cannot become tap targets',()=>{
 const result=sceneControls(scene([
  {...button('0.0.0','Buttons/SpinVertical',{x:20,y:30,w:20,h:20}),mask:{x:0,y:0,w:5,h:5}},
  {...button('0.0.1','Buttons/SpinVertical',{x:20,y:30,w:20,h:20}),alpha:0},
  {...button('0.0.2','Buttons/SpinVertical',{x:20,y:30,w:20,h:20}),interactive:false},
  button('0.0.3','Unknown/Icon',{x:20,y:30,w:20,h:20})
 ]));
 assert.deepEqual(result.controls,[]);
});
test('a named child image uses its bounds when its nearest button container owns input',()=>{
 const sprite={...button('0.0.0.0','Buttons/SpinVertical',{x:20,y:30,w:20,h:20}),interactive:false};
 const result=sceneControls(scene([{path:'0.0.0',alpha:1,interactive:true,bounds:{x:18,y:28,w:24,h:24},children:[sprite]}]));
 assert.equal(result.controls.length,1);
 assert.equal(result.controls[0].interactivePath,'0.0.0');
 assert.deepEqual([result.controls[0].x,result.controls[0].y],[60,80]);
 // A generic interactive stage is not sufficient evidence that every image is
 // a live button. It is much larger than the named sprite and gets rejected.
 const rejected=sceneControls(scene([{path:'0.0.0',alpha:1,interactive:true,bounds:{x:0,y:0,w:100,h:100},children:[sprite]}]));
 assert.deepEqual(rejected.controls,[]);
});
test('observation rejects non-demo launches and strips private network query strings from saved URLs',()=>{
 for(const url of ['https://evil.example/Game?Token=DEMO','https://ssgportal.com.evil.example/Game?Token=DEMO','https://eu-server.ssgportal.com/Game?Token=LIVE'])assert.throws(()=>allowedDemo(url));
 assert.equal(allowedDemo('https://eu-server.ssgportal.com/Game?Token=DEMO'),'https://eu-server.ssgportal.com/Game?Token=DEMO');
 assert.equal(allowedDemo('http://eu-server.ssgportal.com/Game?Token=DEMO'),'https://eu-server.ssgportal.com/Game?Token=DEMO');
 assert.equal(publicURL('https://static.ssg-public.com/image.png?session=private#token'),'https://static.ssg-public.com/image.png');
});
test('bet verification requires a numeric change in the requested direction',()=>{
 assert.equal(betChangedInDirection('bet-plus','0.10','0.20'),true);
 assert.equal(betChangedInDirection('bet-minus','0,20','0,10'),true);
 for(const [kind,before,after] of [['bet-minus','0.30','0.40'],['bet-plus','0.40','0.40'],['bet-plus','0.40','0.30'],['bet-plus',null,'0.40'],['bet-minus','0.30','NaN']])assert.equal(betChangedInDirection(kind,before,after),false);
});
test('observed sound, autoplay and information images remain distinct named targets',()=>{
 for(const [name,kind] of [['Buttons/SoundOn','sound-on'],['Buttons/SoundOff','sound-off'],['Buttons/AutoPlay','autoplay'],['Vertical/Buttons/AutoPlay','autoplay'],['Buttons/Help','rules'],['Buttons/Info','information'],['Buttons/Close','close']]){
  const result=sceneControls(scene([button('0.0.0',name,{x:20,y:30,w:20,h:20})]));
  assert.equal(result.controls.length,1,name);
  assert.equal(result.controls[0].kind,kind,name);
 }
 assert.deepEqual(sceneControls(scene([button('0.0.0','Decorations/AutoPlay',{x:20,y:30,w:20,h:20})])).controls,[]);
});
