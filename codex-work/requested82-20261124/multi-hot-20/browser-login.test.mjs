import test from 'node:test';
import assert from 'node:assert/strict';
import {bootM20Release} from './browser.mjs';
function fixture(){
 const root={dataset:{manifestUrl:'/assets.json'},children:[],replaceChildren(...nodes){this.children=nodes;}};
 const status={hidden:true,textContent:''};
 const document={baseURI:'https://zplay.test/',getElementById:id=>id==='m20-game'?root:id==='m20-connection'?status:null,createElement:tag=>({tagName:tag.toUpperCase(),children:[],append(...nodes){this.children.push(...nodes)}})};
 return {root,status,document};
}
test('unauthenticated PLAY presents an explicit safe sign-in link to the existing lobby',async()=>{
 const {root,status,document}=fixture();const error=Object.assign(Error('unauthorized'),{status:401});let launches=0;
 await assert.rejects(bootM20Release({document,launch:async()=>{launches++;throw error}}),e=>e===error);
 assert.equal(launches,1);assert.equal(status.hidden,false);assert.match(status.textContent,/Sign in/);
 const links=root.children.filter(x=>x.tagName==='A');assert.equal(links.length,1);assert.equal(links[0].href,'/');assert.equal(links[0].textContent,'Sign in');
});
test('a forbidden session does not gain a sign-in bypass or launch retry',async()=>{
 const {root,status,document}=fixture();const error=Object.assign(Error('forbidden'),{status:403});let launches=0;
 await assert.rejects(bootM20Release({document,launch:async()=>{launches++;throw error}}),e=>e===error);
 assert.equal(launches,1);assert.equal(status.hidden,false);assert.equal(root.children.length,0);
});
