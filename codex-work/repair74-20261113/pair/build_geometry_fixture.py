"""Sanitized CSS geometry only: no artwork, fonts, modules or account code."""
from pathlib import Path
import json,re

HERE=Path(__file__).resolve().parent
PROPS=set('position display visibility width height min-width max-width min-height max-height left right top bottom inset aspect-ratio margin margin-left margin-top margin-right margin-bottom padding padding-left padding-right padding-top padding-bottom box-sizing overflow overflow-x overflow-y grid-template-columns gap justify-content align-items flex-direction transform transform-origin container-type'.split())
def clean(source):
    result=[]
    source=re.sub(r'/\*.*?\*/','',source,flags=re.S);at=0
    while at<len(source):
        opening=source.find('{',at)
        if opening<0:break
        prelude=source[at:opening].strip();depth=1;end=opening+1
        while depth and end<len(source):
            depth+=(source[end]=='{')-(source[end]=='}');end+=1
        body=source[opening+1:end-1];at=end
        if prelude.startswith('@media'):result.append(prelude+'{'+clean(body)+'}')
        elif not prelude.startswith('@'):
            declarations=[d for d in body.split(';') if ':' in d and (d.split(':',1)[0].strip() in PROPS or d.split(':',1)[0].strip()=='--chrome-height')]
            if declarations:result.append(prelude+'{'+(';'.join(declarations))+'}')
    return '\n'.join(result)
css=clean((HERE/'style.css').read_text())
markup='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sanitized layout geometry</title></head><body><header class="brand"></header><main id="game" class="game" data-art="ART_ID"><canvas id="scene"></canvas><button id="menu-top" class="control menu-top"></button><div id="meters" class="meters"><div></div><div></div><button id="bet-meter"></button></div><p id="message" class="message"></p><a id="login" class="login" hidden></a><div class="actions"><button id="auto" class="control"><canvas></canvas></button><button id="double" class="control"><canvas></canvas></button><button id="take" class="control"><canvas></canvas></button></div><div id="spinbar" class="spinbar"><canvas></canvas><button id="less" class="control"><canvas></canvas></button><span class="near-bet"></span><button id="spin" class="control spin"><canvas></canvas></button><span class="near-bet next"></span><button id="more" class="control"><canvas></canvas></button></div><button id="bet" class="control bet"><canvas></canvas></button><button id="turbo" class="control turbo"><canvas></canvas></button><footer><button class="icon"></button><button class="icon"></button></footer><button class="recover" hidden></button></main></body></html>'''
script="""
const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
const ids=['game','auto','double','take','spin','less','more','bet','turbo','meters','message','login','menu-top'];
requestAnimationFrame(()=>{const proof={viewport:{width:innerWidth,height:innerHeight},stage:rect(document.getElementById('game')),overflow:document.documentElement.scrollWidth>innerWidth,controls:Object.fromEntries(ids.map(id=>{const e=document.getElementById(id);return [id,{...rect(e),display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility}]}))};const p=document.createElement('script');p.id='geometry-proof';p.type='application/json';p.textContent=JSON.stringify(proof);document.body.append(p);});
"""
fixtures={}
for art in ['multihot5','multihot10']:
    fixtures[art]=markup.replace('ART_ID',art).replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+script+'</script></body>')
(HERE/'geometry-fixtures.json').write_text(json.dumps(fixtures))
print({k:len(v) for k,v in fixtures.items()})
