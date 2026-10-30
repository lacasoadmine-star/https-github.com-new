from pathlib import Path
import json,base64
p=Path(__file__).parent
if not (p/'symbols.webp').exists():
 encoded=json.loads((p/'image.mjs').read_text().removeprefix('export default ').strip().removesuffix(';'))
 (p/'symbols.webp').write_bytes(base64.b64decode(encoded))
assets={}
for name in ['index.html','app.js','app.css','art.js','games.js']:
 assets['/' if name=='index.html' else '/'+name]=[(p/name).read_text(),'text/html' if name.endswith('.html') else 'text/css' if name.endswith('.css') else 'application/javascript']
f=p/'worker.mjs';s=f.read_text();a=s.index('const assets=')+len('const assets=');b=s.index(';\nconst headers',a);s=s[:a]+json.dumps(assets)+s[b:]
if "import image" not in s:
 s="import image from './image.mjs';\n"+s
 s=s.replace("const a=assets[u.pathname];", "if(u.pathname==='/symbols.webp')return new Response(request.method==='HEAD'?null:Uint8Array.from(atob(image),c=>c.charCodeAt(0)),{headers:{...headers,'content-type':'image/webp','cache-control':'public,max-age=3600'}});const a=assets[u.pathname];")
f.write_text(s)
(p/'image.mjs').write_text('export default '+json.dumps(base64.b64encode((p/'symbols.webp').read_bytes()).decode())+';\n')
