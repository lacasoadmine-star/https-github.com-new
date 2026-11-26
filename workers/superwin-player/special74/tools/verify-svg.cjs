// Decode verified passive SVG artwork with Chromium; no provider runtime/network.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const packageRoot=path.resolve(__dirname,'..'),repo=path.resolve(packageRoot,'../../..');
const report=path.join(repo,'reports/special74');
const assets=JSON.parse(fs.readFileSync(path.join(report,'all74-media-manifest.json'))).assets.filter(a=>a.mime==='image/svg+xml');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SPECIAL74_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();let networkRequests=0;
 await page.route('**/*',route=>{networkRequests++;return route.abort();});
 const files=[];
 try{for(const asset of assets){
  const bytes=fs.readFileSync(path.join(packageRoot,asset.path));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('SVG hash changed');
  const result=await page.evaluate(async data=>{
   const image=new Image();image.src='data:image/svg+xml;base64,'+data;await image.decode();
   if(!image.naturalWidth||!image.naturalHeight)throw Error('SVG has no decoded dimensions');
   const canvas=document.createElement('canvas');canvas.width=Math.min(256,image.naturalWidth);canvas.height=Math.min(256,image.naturalHeight);
   const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
   const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let visiblePixels=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])visiblePixels++;
   return{width:image.naturalWidth,height:image.naturalHeight,visiblePixels};
  },bytes.toString('base64'));
  files.push({source:asset.source,sha256:asset.sha256,...result,verified:result.visiblePixels>0});
 }}finally{await browser.close();}
 const output={method:'Chromium Image.decode and nonempty Canvas raster',checked:files.length,passed:files.filter(f=>f.verified).length,networkRequests,productionRequests:0,files};
 fs.writeFileSync(path.join(report,'svg-decoder-checks.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({checked:output.checked,passed:output.passed,networkRequests}));
 if(output.passed!==output.checked||networkRequests)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
