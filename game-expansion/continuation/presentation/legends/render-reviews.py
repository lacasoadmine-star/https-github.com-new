#!/usr/bin/env python3
"""Offline display-list review; this does not launch or test a browser."""
import argparse,importlib.util,json,hashlib,io,types
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from fontTools.ttLib import TTFont
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('first11_review_renderer',ROOT.parent/'render-review.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

def render_with_source_font(scene,manifest,cache,width):
    # Keep the shared first11 renderer frozen. Its fallback uses a Latin-only
    # default font, so bind this call's fallback to the exact verified Rubik
    # source font. WOFF is decompressed to an in-memory SFNT for Pillow only.
    source=next(item for item in manifest['fonts'] if 'RubikBold' in item['name'])
    body=(cache/source['file']).read_bytes()
    if hashlib.sha256(body).hexdigest()!=source['sha256']:raise ValueError('Source font hash mismatch')
    font=TTFont(io.BytesIO(body));font.flavor=None;buffer=io.BytesIO();font.save(buffer);font_bytes=buffer.getvalue()
    fallback=lambda size=None:ImageFont.truetype(io.BytesIO(font_bytes),size or 10)
    namespace={**module.render.__globals__,'ImageFont':types.SimpleNamespace(truetype=ImageFont.truetype,load_default=fallback)}
    return types.FunctionType(module.render.__code__,namespace)(scene,manifest,cache,width)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache-dir',type=Path,default=Path('/tmp/zplay-legends-assets'));args=parser.parse_args()
    index=json.loads((ROOT/'index.json').read_text());records=[];contact=Image.new('RGB',(846,950),'#0d1523');draw=ImageDraw.Draw(contact);font=ImageFont.load_default(size=18);draw.text((22,14),'ZPLAY · Legends original artwork review',font=font,fill='#eee2ae');draw.text((22,43),'Static source poses · authored layout · unpublished',font=ImageFont.load_default(size=13),fill='#c5cde0')
    for col,(game,item) in enumerate(index['games'].items()):
        manifest=json.loads((ROOT/item['file']).read_text())
        for variant in ['base','bonus-art']:
            scene=json.loads((ROOT/'evidence'/f'{game}-{variant}-scene.json').read_text());im=render_with_source_font(scene,manifest,args.cache_dir,390)
            png=ROOT/'evidence'/f'{game}-{variant}-390.png';temp=png.with_suffix('.png.part');im.save(temp,format='PNG',optimize=True);temp.replace(png)
            jpg=png.with_suffix('.jpg');temp=jpg.with_suffix('.jpg.part');im.save(temp,format='JPEG',quality=94);temp.replace(jpg)
            records.append({'game':game,'variant':variant,'png':str(png),'sha256':hashlib.sha256(png.read_bytes()).hexdigest(),'jpeg':str(jpg),'width':im.width,'height':im.height,'browserScreenshot':False})
            if variant=='base':contact.paste(im,(22+col*412,75));draw.text((22+col*412,921),manifest['name'],font=font,fill='#eee2ae')
    contact_path=ROOT/'evidence/legends-static-contact-sheet.jpg';contact.save(contact_path,quality=94)
    (ROOT/'evidence/render-review.json').write_text(json.dumps({'method':'Offline authored display-list render, not a browser screenshot','contactSheet':str(contact_path),'images':records},indent=2)+'\n')
    print(json.dumps({'renderedImages':len(records),'contactSheet':str(contact_path)}))
if __name__=='__main__':main()
