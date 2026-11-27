import test from 'node:test';
import assert from 'node:assert/strict';
import {bootM20Release,createM20Page} from './browser.mjs';
function fixture(){
 const root={dataset:{manifestUrl:'/assets.json'},children:[],replaceChildren(...nodes){this.children=nodes;}};
 const status={hidden:true,textContent:''};
 const events=new EventTarget();
 const document={defaultView:events,baseURI:'https://zplay.test/',getElementById:id=>id==='m20-game'?root:id==='m20-connection'?status:null,createElement:tag=>Object.assign(new EventTarget(),{tagName:tag.toUpperCase(),children:[],append(...nodes){this.children.push(...nodes)}})};
 return {root,status,document};
}
test('unauthenticated PLAY presents an explicit safe sign-in link to the existing lobby',async()=>{
 const {root,status,document}=fixture();const error=Object.assign(Error('unauthorized'),{status:401});let launches=0;
 await assert.rejects(bootM20Release({document,launch:async()=>{launches++;throw error}}),e=>e===error);
 assert.equal(launches,1);assert.equal(status.hidden,false);assert.match(status.textContent,/Sign in/);
 const links=root.children.filter(x=>x.tagName==='A');assert.equal(links.length,1);assert.equal(links[0].href,'/');assert.equal(links[0].textContent,'Sign in');
});
test('a failed initial GET can reconnect from the page without submitting an action',async()=>{
 const {root,status,document}=fixture();let launches=0,disposals=0;
 const page=createM20Page({document,launch:async()=>{launches++;if(launches===1)throw Object.assign(Error('TEMPORARY_NETWORK_FAILURE'),{status:503});return {dispose(){disposals++;}};}});
 await page.start();assert.equal(root.dataset.connectionRetry,'true');assert.equal(root.children[0].textContent,'Try again');
 document.defaultView.dispatchEvent(new Event('online'));await page.reconnect();
 assert.equal(launches,2);assert.equal(status.hidden,true);assert.equal(root.dataset.connectionRetry,undefined);
 page.dispose();document.defaultView.dispatchEvent(new Event('online'));assert.equal(launches,2);assert.equal(disposals,1);
});
test('an expired sign-in is retried only after the normal session-ready signal',async()=>{
 const {root,document}=fixture();let launches=0;
 const page=createM20Page({document,launch:async()=>{launches++;if(launches===1)throw Object.assign(Error('UNAUTHORIZED'),{status:401});return{dispose(){}};}});
 await page.start();assert.equal(root.children[0].href,'/');document.defaultView.dispatchEvent(new Event('online'));assert.equal(launches,1);
 document.defaultView.dispatchEvent(new Event('zplay:session-ready'));await page.reconnect();assert.equal(launches,2);page.dispose();
});
test('a forbidden session does not gain a sign-in bypass or launch retry',async()=>{
 const {root,status,document}=fixture();const error=Object.assign(Error('forbidden'),{status:403});let launches=0;
 await assert.rejects(bootM20Release({document,launch:async()=>{launches++;throw error}}),e=>e===error);
 assert.equal(launches,1);assert.equal(status.hidden,false);assert.equal(root.children.length,0);
});
