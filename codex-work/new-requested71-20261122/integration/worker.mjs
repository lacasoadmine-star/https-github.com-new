import {CATALOGUE_PATH, NEW_SECTION_PATH, renderCataloguePage} from './catalogue.mjs';

export function createAdditiveWorker(previous, {catalogue, clientSource, stylesheetSource, assetRevision}, Rewriter=globalThis.HTMLRewriter) {
  if(!previous||typeof previous.fetch!=='function'||!/^[a-f0-9]{24}$/.test(assetRevision||''))throw Error('NEW71_WORKER_CONFIG_INVALID');
  const clientPath=`/_zplay/new71/${assetRevision}/new-section.mjs`;
  const stylesheetPath=`/_zplay/new71/${assetRevision}/new-section.css`;
  const catalogueBody=JSON.stringify(catalogue);
  const pageBody=renderCataloguePage(catalogue,stylesheetPath);
  const own=new Map([
    [CATALOGUE_PATH,[catalogueBody,'application/json; charset=utf-8','no-store']],
    [NEW_SECTION_PATH,[pageBody,'text/html; charset=utf-8','no-store']],
    [clientPath,[clientSource,'text/javascript; charset=utf-8','public, max-age=31536000, immutable']],
    [stylesheetPath,[stylesheetSource,'text/css; charset=utf-8','public, max-age=31536000, immutable']]
  ]);
  return {
    ...previous,
    async fetch(request,env,ctx) {
      const url=new URL(request.url),asset=own.get(url.pathname);
      if(asset){
        if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
        return new Response(request.method==='HEAD'?null:asset[0],{headers:{'Content-Type':asset[1],'Cache-Control':asset[2],'X-Content-Type-Options':'nosniff','X-Zplay-New71':catalogue.releaseId}});
      }
      const response=await previous.fetch(request,env,ctx);
      if(request.method!=='GET'||url.pathname!=='/'||response.status!==200
        ||!/^text\/html\b/i.test(response.headers.get('content-type')||'')||typeof Rewriter!=='function')return response;
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('etag');headers.delete('content-md5');headers.delete('last-modified');
      headers.set('Cache-Control','no-store');headers.set('X-Zplay-New71',catalogue.releaseId);
      const input=new Response(response.body,{status:response.status,statusText:response.statusText,headers});
      return new Rewriter().on('head',{element(element){element.append(`<link rel="stylesheet" href="${stylesheetPath}" data-zplay-new71-style><script type="module" id="zplay-new71-loader" src="${clientPath}"></script>`,{html:true});}}).transform(input);
    }
  };
}
