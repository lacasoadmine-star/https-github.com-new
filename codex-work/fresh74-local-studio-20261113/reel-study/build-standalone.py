#!/usr/bin/env python3
"""Embed the built three-title study into one offline HTML distribution."""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import re

def sha(value):
    return "'sha256-" + base64.b64encode(hashlib.sha256(value.encode()).digest()).decode() + "'"

def build(root, output):
    root, output = Path(root), Path(output)
    manifest = json.loads((root/'sources.json').read_text())
    original_manifest = json.dumps(manifest,ensure_ascii=False,indent=2).encode()
    for asset in manifest['assets']:
        data = (root/asset['path']).read_bytes()
        if hashlib.sha256(data).hexdigest() != asset['sha256']:
            raise ValueError('Source image changed: '+asset['id'])
        asset['path'] = 'data:image/jpeg;base64,'+base64.b64encode(data).decode()
    css = (root/'style.css').read_text()
    scripts = [('sources.js','window.FRESH_REEL_SOURCES = '+json.dumps(manifest,ensure_ascii=False).replace('</','<\\/')+';'),
               ('engine.js',(root/'engine.js').read_text()),('app.js',(root/'app.js').read_text())]
    html = (root/'index.html').read_text()
    html = html.replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>')
    for name,script in scripts:
        html = html.replace('<script src="'+name+'"></script>','<script>'+script+'</script>')
    policy = "default-src 'none'; img-src data:; style-src "+sha(css)+"; script-src "+' '.join(sha(script) for _,script in scripts)+"; connect-src 'none'; object-src 'none'; base-uri 'none'"
    html = re.sub(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">', '<meta http-equiv="Content-Security-Policy" content="'+policy+'">',html)
    html = html.replace('class="brand" href="../reference-preview/index.html"','class="brand" href="#multihot10"')
    html = html.replace('<a class="back" href="../reference-preview/index.html">← Caddeynta 74-ka</a>','<span class="back">3 muuqaal · Hal fayl offline ah</span>')
    href = 'data:application/json;base64,'+base64.b64encode(original_manifest).decode()
    html = html.replace('<a href="sources.json">','<a download="fresh-reel-sources.json" href="'+href+'">')
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(html)
    return {'file':str(output),'bytes':output.stat().st_size,'embeddedFreshImages':len(manifest['assets']),'networkRequired':False,'browserVisuallyVerified':False}

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--output',required=True)
    a=p.parse_args();print(json.dumps(build(a.root,a.output)))
