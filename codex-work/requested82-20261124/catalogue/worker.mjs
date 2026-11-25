import {CATALOGUE_PATH,SECTION_PATH,renderPage,validCatalogue,lobbyCatalogue} from './public.mjs';

/** Add only the requested82 catalogue; delegate every existing game/auth/ledger endpoint. */
export function createRequested82Worker(previous,config,Rewriter=globalThis.HTMLRewriter){
  if(typeof previous?.fetch!=='function' || !/^[a-f0-9]{24}$/.test(config?.assetRevision || '') ||
     !validCatalogue(config.catalogue) || !['clientSource','publicSource','requestedSource','stylesheetSource'].every(k=>typeof config[k]==='string'))throw Error('REQUESTED82_WORKER_CONFIG_INVALID');
  const root='/_zplay/requested82/'+config.assetRevision+'/';
  const lobby=lobbyCatalogue(config.catalogue);
  const assets=new Map([
    [CATALOGUE_PATH,[JSON.stringify(lobby),'application/json; charset=utf-8','no-store']],
    [SECTION_PATH,[renderPage(lobby,root+'styles.css',root+'client.mjs'),'text/html; charset=utf-8','no-store']],
    [root+'client.mjs',[config.clientSource,'text/javascript; charset=utf-8','public, max-age=31536000, immutable']],
    [root+'public.mjs',[config.publicSource,'text/javascript; charset=utf-8','public, max-age=31536000, immutable']],
    [root+'requested.mjs',[config.requestedSource,'text/javascript; charset=utf-8','public, max-age=31536000, immutable']],
    [root+'styles.css',[config.stylesheetSource,'text/css; charset=utf-8','public, max-age=31536000, immutable']]
  ]);
  return {...previous,async fetch(request,env,ctx){
    const url=new URL(request.url),asset=assets.get(url.pathname);
    if(asset){
      if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
      const headers={'Content-Type':asset[1],'Cache-Control':asset[2],'X-Content-Type-Options':'nosniff','X-Zplay-Requested82':config.catalogue.releaseId};
      if(url.pathname===SECTION_PATH)headers['Content-Security-Policy']="default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
      return new Response(request.method==='HEAD'?null:asset[0],{headers});
    }
    const response=await previous.fetch(request,env,ctx);
    if(lobby.games.length===0 || request.method!=='GET' || url.pathname!=='/' || response.status!==200 ||
      !/^text\/html\b/i.test(response.headers.get('content-type') || '') || typeof Rewriter!=='function')return response;
    const headers=new Headers(response.headers);
    for(const name of ['content-length','etag','content-md5','last-modified'])headers.delete(name);
    headers.set('Cache-Control','no-store');headers.set('X-Zplay-Requested82',config.catalogue.releaseId);
    const rewriter=new Rewriter();
    // Replace only marked historical request navigation, retaining its routes and all old game rows.
    for(const selector of ['script#zplay-new71-loader','link[data-zplay-new71-style]','script#zplay-new90-loader',
      'link[data-zplay-new90-style]','#zplay-requested90','script#zplay-requested82-loader',
      'link[data-zplay-requested82-style]','#zplay-requested82'])rewriter.on(selector,{element(el){el.remove();}});
    rewriter.on('head',{element(el){el.append(`<link rel="stylesheet" href="${root}styles.css" data-zplay-requested82-style><script type="module" id="zplay-requested82-loader" src="${root}client.mjs"></script>`,{html:true});}});
    return rewriter.transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
  }};
}
