#!/usr/bin/env python3
"""Render the authored display list with Pillow for offline artwork inspection.

This is a deterministic display-list export, not a browser screenshot. The
original cached artwork is only read; no source image is edited or replaced.
"""
import argparse, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parent

def color(value):
    if value.startswith('#') and len(value) in (7, 9):
        parts = [int(value[i:i+2], 16) for i in range(1, len(value), 2)]
        return tuple(parts + ([255] if len(parts) == 3 else []))
    return value

def render(scene, manifest, cache, width):
    scale = 2
    canvas = Image.new('RGBA', (scene['width'] * scale, scene['height'] * scale))
    images = {}
    fonts = {}
    font_path = next((cache / item['file'] for item in manifest['fonts'] if 'Poppins-Bold' in item['name']), None)
    def image(file):
        if file not in images:
            images[file] = Image.open(cache / file).convert('RGBA')
        return images[file]
    def target(b):
        return tuple(round(b[k] * scale) for k in ['x', 'y', 'width', 'height'])
    for cmd in scene['commands']:
        layer = Image.new('RGBA', canvas.size)
        draw = ImageDraw.Draw(layer)
        kind = cmd['type']
        if kind == 'sprite':
            f = manifest['frames'][cmd['frame']]
            sprite = image(f['file']).crop((f['x'], f['y'], f['x'] + f['packedWidth'], f['y'] + f['packedHeight']))
            if f['rotated']:
                sprite = sprite.transpose(Image.Transpose.ROTATE_270 if f.get('unrotateDegrees') == 90 else Image.Transpose.ROTATE_90)
            if cmd.get('padding'):
                original = Image.new('RGBA', (f['original']['width'], f['original']['height']))
                original.alpha_composite(sprite, (f['trim']['x'], f['trim']['y']))
                sprite = original
            x, y, w, h = target(cmd['box'])
            ratio = (max if cmd.get('fit') == 'cover' else min)(w / sprite.width, h / sprite.height)
            dw, dh = (w, h) if cmd.get('fit') == 'stretch' else (round(sprite.width * ratio), round(sprite.height * ratio))
            resized = sprite.resize((max(1, dw), max(1, dh)), Image.Resampling.LANCZOS)
            if 'opacity' in cmd:
                resized.putalpha(resized.getchannel('A').point(lambda a: round(a * cmd['opacity'])))
            layer.alpha_composite(resized, (x + (w-dw)//2, y + (h-dh)//2))
        elif kind == 'image':
            source = image(cmd['file']); x,y,w,h=target(cmd['box'])
            ratio=(max if cmd.get('fit')=='cover' else min)(w/source.width,h/source.height)
            resized=source.resize((max(1,round(source.width*ratio)),max(1,round(source.height*ratio))),Image.Resampling.LANCZOS)
            layer.alpha_composite(resized,(x+(w-resized.width)//2,y+(h-resized.height)//2))
            mask=Image.new('L',canvas.size);ImageDraw.Draw(mask).rectangle((x,y,x+w,y+h),fill=255)
            layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask))
        elif kind in ('rect','outline'):
            x,y,w,h=target(cmd['box'])
            if kind=='rect':draw.rectangle((x,y,x+w,y+h),fill=color(cmd['color']))
            else:draw.rectangle((x,y,x+w,y+h),outline=color(cmd['color']),width=max(1,round(cmd['lineWidth']*scale)))
        elif kind == 'text':
            size=round(cmd['size']*scale)
            if size not in fonts:
                fonts[size]=ImageFont.truetype(str(font_path),size) if font_path else ImageFont.load_default(size=size)
            draw.text((round(cmd['x']*scale),round(cmd['y']*scale)),cmd['text'],font=fonts[size],anchor='mm',fill=color(cmd['color']))
        if cmd.get('rotation'):
            center=(cmd['rotateAt']['x']*scale,cmd['rotateAt']['y']*scale)
            layer=layer.rotate(-math.degrees(cmd['rotation']),resample=Image.Resampling.BICUBIC,center=center)
        if cmd.get('clip') or cmd.get('clipPolygon'):
            mask=Image.new('L',canvas.size);md=ImageDraw.Draw(mask)
            if cmd.get('clip'):
                x,y,w,h=target(cmd['clip']);md.rectangle((x,y,x+w,y+h),fill=255)
            else:md.polygon([(round(p['x']*scale),round(p['y']*scale)) for p in cmd['clipPolygon']],fill=255)
            layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask))
        canvas.alpha_composite(layer)
    height=round(width*scene['height']/scene['width'])
    return canvas.resize((width,height),Image.Resampling.LANCZOS).convert('RGB')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache-dir',type=Path,required=True);parser.add_argument('--games',default='multihot40_native,multihot100_native');parser.add_argument('--width',type=int,default=390)
    args=parser.parse_args()
    if not 240<=args.width<=1920:raise ValueError('Unsupported output width')
    results=[]
    for game in args.games.split(','):
        manifest=json.loads((ROOT/'manifests'/f'{game}.json').read_text());scene=json.loads((ROOT/'evidence'/f'{game}-scene.json').read_text())
        result=render(scene,manifest,args.cache_dir,args.width);output=ROOT/'evidence'/f'{game}-{args.width}.png';temporary = output.with_suffix('.png.part'); result.save(temporary, format='PNG', optimize=True); temporary.replace(output)
        jpeg=output.with_suffix('.jpg');temporary=jpeg.with_suffix('.jpg.part');result.save(temporary,format='JPEG',quality=94);temporary.replace(jpeg)
        results.append({'game':game,'output':str(output),'previewJpeg':str(jpeg),'width':result.width,'height':result.height,'method':'offline authored display-list renderer, not browser screenshot'})
    print(json.dumps(results,indent=2))

if __name__=='__main__':main()
