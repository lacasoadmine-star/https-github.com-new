import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {accountGames} from './modules/independent74-catalog-r17.mjs';
const NATIVE60_GAME_IDS = accountGames.filter(game => !Object.hasOwn(EXISTING_WALLET_ROUTES, game.id)).map(game => game.id);
import {EXISTING_WALLET_ROUTES} from '../../independent74-20261111/client/existing-wallet-routes.mjs';

test('actual lobby asset opens every new title in account mode and reuses all14 existing dashboard cards',async()=>{
  const root=import.meta.dirname;
  const result=await build({entryPoints:[resolve(import.meta.dirname,'assets/lobby74.mjs')],bundle:true,format:'iife',platform:'browser',write:false,
    plugins:[{name:'retained-r17-public-assets',setup(build){
      build.onResolve({filter:/^\.\/(?:official74-data|existing-wallet-routes)\.mjs\?v=r17$/},args=>({path:resolve(root,'private-retained-assets',args.path.split('?')[0])}));
    }}],logLevel:'silent'});
  const cards=Object.entries(EXISTING_WALLET_ROUTES).map(([id,route])=>'<article class="portal-r9-card" data-r20-game="'+route.split('/').at(-1)+'"><a data-game="'+route.split('/').at(-1)+'" href="'+route+'">'+id+'</a></article>').join('');
  const dom=new JSDOM('<!doctype html><html><body><main class="player-main"><section id="portal-r9-gallery" data-surface="home"><input id="portal-r9-search"><div class="portal-r9-grid">'+cards+'</div></section></main><nav class="bottom-nav"><button class="active">Home</button></nav></body></html>',{url:'https://player.fixture/',pretendToBeVisual:true,runScripts:'outside-only'});
  const {window}=dom,document=window.document;
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  try{
    window.eval(result.outputFiles[0].text);
    await new Promise(resolve=>window.requestAnimationFrame(resolve));
    const all=[...document.querySelectorAll('.portal-r9-grid article')];
    assert.equal(all.length,74);assert.equal(new Set(all.map(card=>card.dataset.i74GameId)).size,74);
    assert.equal(document.querySelectorAll('.i74-card').length,60);
    for(const [id,route] of Object.entries(EXISTING_WALLET_ROUTES)){
      const card=document.querySelector('[data-i74-game-id="'+id+'"]');
      assert(card);assert.equal(card.classList.contains('i74-card'),false);
      assert.equal(card.querySelector('a').getAttribute('href'),route);
    }
    const dialog=document.querySelector('#i74-lobby-dialog');
    for(const id of NATIVE60_GAME_IDS){
      document.querySelector('[data-i74-game-id="'+id+'"] .i74-open').click();
      assert.equal(dialog.open,true);
      const play=dialog.querySelector('.i74-play');
      assert.match(play.textContent,/ETB/);assert(!play.textContent.includes('Template'));
      const href=new URL(play.href);assert.equal(href.searchParams.get('mode'),'account');assert.equal(href.hash,'#'+id);
      play.click();const frame=dialog.querySelector('iframe');
      assert.equal(frame.hidden,false);const target=new URL(frame.src);
      assert.equal(target.searchParams.get('embedded'),'1');assert.equal(target.searchParams.get('mode'),'account');assert.equal(target.hash,'#'+id);
      dialog.close();assert.equal(frame.hidden,true);assert.equal(frame.hasAttribute('src'),false);
    }
    assert.equal(document.querySelectorAll('.portal-r9-grid article').length,74);
  }finally{window.close();}
});
