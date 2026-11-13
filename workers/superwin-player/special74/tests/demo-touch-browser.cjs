const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const {touchObservedDOM}=require('../tools/batch-controls.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPECIAL74_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
  const context=await browser.newContext({...devices['Pixel 7'],deviceScaleFactor:1});
  const page=await context.newPage();
  await page.setContent('<style>body{margin:0}iframe{position:absolute;top:26px;left:0;width:412px;height:600px;border:0}</style><iframe></iframe>');
  const frame=page.frames().find(f=>f.parentFrame());
  await frame.setContent('<style>button{position:absolute;top:300px;left:120px;width:90px;height:36px}</style><button>YES</button>');
  await frame.evaluate(()=>{window.touches=0;document.querySelector('button').addEventListener('touchend',()=>window.touches++);});
  const control={selector:'button',index:0,tag:'BUTTON',text:'YES',bounds:{x:120,y:300,w:90,h:36}};
  await touchObservedDOM(control,frame);
  assert.equal(await frame.evaluate(()=>window.touches),1,'iframe offset and touch-only input must be respected');
  await frame.evaluate(()=>document.querySelector('button').textContent='Different action');
  await assert.rejects(touchObservedDOM(control,frame),/changed before touch/);
  assert.equal(await frame.evaluate(()=>window.touches),1,'changed target must not be activated');
  await frame.evaluate(()=>{
   document.querySelector('button').textContent='\n  YES  \n';
   const hidden=document.createElement('button');hidden.textContent='YES';hidden.style.display='none';document.body.prepend(hidden);
  });
  await touchObservedDOM({...control,exactText:true},frame);
  assert.equal(await frame.evaluate(()=>window.touches),2,'a hidden loader button and changed DOM index must not shadow the visible named control');
  console.log(JSON.stringify({passed:true,checks:['nested iframe offset','native touchscreen event','changed target rejected','visible exact text survives loader DOM changes'],productionRequests:0}));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
