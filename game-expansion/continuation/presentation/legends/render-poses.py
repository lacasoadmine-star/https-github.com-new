#!/usr/bin/env python3
"""Rasterize original Spine setup-pose triangles, without a game runtime.

The source atlases remain unmodified. Generated symbols are identified as
derived static-pose assets with exact source hashes, not new provider assets.
"""
import argparse,hashlib,json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageChops
import PIL

ROOT=Path(__file__).resolve().parent

def original_region(frame,cache,images,regions):
    key=frame['file']+':'+frame['name']
    if key in regions:return regions[key]
    if frame['file'] not in images:images[frame['file']]=Image.open(cache/frame['file']).convert('RGBA')
    source=images[frame['file']].crop((frame['x'],frame['y'],frame['x']+frame['packedWidth'],frame['y']+frame['packedHeight']))
    if frame['rotated']:source=source.transpose(Image.Transpose.ROTATE_270 if frame.get('unrotateDegrees')==90 else Image.Transpose.ROTATE_90)
    whole=Image.new('RGBA',(frame['original']['width'],frame['original']['height']));whole.alpha_composite(source,(frame['trim']['x'],frame['trim']['y']));regions[key]=whole;return whole

def blend(base,layer,mode):
    if mode=='normal':return Image.alpha_composite(base,layer)
    a=np.asarray(base,dtype=np.float64)/255.;b=np.asarray(layer,dtype=np.float64)/255.;da=a[...,3:4];sa=b[...,3:4]
    if mode in ('additive','add'):
        alpha=np.minimum(1.,da+sa);premul=np.minimum(1.,a[...,:3]*da+b[...,:3]*sa)
    else:
        if mode=='screen':mixed=1.-(1.-a[...,:3])*(1.-b[...,:3])
        elif mode=='multiply':mixed=a[...,:3]*b[...,:3]
        else:raise ValueError('Unsupported blend mode '+str(mode))
        alpha=sa+da-sa*da;premul=b[...,:3]*sa*(1.-da)+a[...,:3]*da*(1.-sa)+mixed*sa*da
    rgb=np.divide(premul,alpha,out=np.zeros_like(premul),where=alpha>0)
    return Image.fromarray(np.uint8(np.clip(np.concatenate([rgb,alpha],axis=2)*255.+.5,0,255)),'RGBA')

def render_pose(symbol,frames,cache,images,regions,size=256):
    pose=symbol['pose']
    if not pose['complete'] or symbol['missingRegions']:raise ValueError('Incomplete source setup pose')
    layers=pose['layers'];points=np.array([p for layer in layers for p in zip(layer['worldVertices'][::2],layer['worldVertices'][1::2])],dtype=np.float64)
    if not len(points) or not np.isfinite(points).all():raise ValueError('No finite setup geometry')
    low=points.min(axis=0);high=points.max(axis=0);extent=high-low
    if np.any(extent<=0):raise ValueError('Empty setup-pose bounds')
    resolution=size*2;margin=resolution*.035;scale=min((resolution-2*margin)/extent);center=(low+high)/2
    canvas=Image.new('RGBA',(resolution,resolution))
    for layer in layers:
        frame=frames[layer['regionName']];source=original_region(frame,cache,images,regions)
        vertices=np.array(layer['worldVertices'],dtype=np.float64).reshape(-1,2);dest=(vertices-center)*[scale,-scale]+resolution/2
        uv=np.array(layer['uvs'],dtype=np.float64).reshape(-1,2)*[source.width,source.height]
        target=Image.new('RGBA',canvas.size)
        tris=layer['triangles']
        for start in range(0,len(tris),3):
            indices=tris[start:start+3];d=dest[indices];s=uv[indices];matrix=np.column_stack([d,np.ones(3)])
            if abs(np.linalg.det(matrix))<1e-8:continue
            coefficients=np.linalg.solve(matrix,s)
            left=max(0,math.floor(d[:,0].min()));top=max(0,math.floor(d[:,1].min()));right=min(resolution,math.ceil(d[:,0].max()));bottom=min(resolution,math.ceil(d[:,1].max()))
            if right<=left or bottom<=top:continue
            offset=np.array([left,top,1.])@coefficients
            affine=(coefficients[0,0],coefficients[1,0],offset[0],coefficients[0,1],coefficients[1,1],offset[1])
            patch=source.transform((right-left,bottom-top),Image.Transform.AFFINE,affine,resample=Image.Resampling.BILINEAR)
            mask=Image.new('L',patch.size);ImageDraw.Draw(mask).polygon([tuple(p-[left,top]) for p in d],fill=255)
            # Paste under the triangle mask, avoiding double alpha on shared edges.
            target.paste(patch,(left,top),mask)
        tint=layer.get('tint',[1,1,1]);opacity=layer.get('opacity',1)
        if tint!=[1,1,1] or opacity!=1:
            values=np.asarray(target,dtype=np.float64).copy();values[...,:3]*=tint;values[...,3]*=opacity;target=Image.fromarray(np.uint8(np.clip(values+.5,0,255)),'RGBA')
        canvas=blend(canvas,target,layer.get('blend','normal'))
    return canvas.resize((size,size),Image.Resampling.LANCZOS)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--cache-dir',type=Path,default=Path('/tmp/zplay-legends-assets'));args=parser.parse_args();cache=args.cache_dir
    index=json.loads((ROOT/'poses/index.json').read_text());lock=json.loads((ROOT/'assets.lock.json').read_text());source_images={};source_regions={};result={'schemaVersion':1,'method':'Derived static source setup-pose triangle render, not a provider animation or browser screenshot','pythonRenderer':'render-poses.py','pillowVersion':PIL.__version__,'numpyVersion':np.__version__,'games':{},'dimensions':{},'issues':[]}
    for asset in lock['assets']:
        if asset['mimeType'].startswith('image/'):
            with Image.open(cache/asset['file']) as im:result['dimensions'][asset['file']]={'width':im.width,'height':im.height}
    for game,entry in index['games'].items():
        data=json.loads((ROOT/entry['file']).read_text());derived={}
        for key,symbol in data['symbols'].items():
            try:
                im=render_pose(symbol,data['regions'],cache,source_images,source_regions)
                temporary=cache/(game+'-'+key+'.pose.png');im.save(temporary,format='PNG',optimize=True);body=temporary.read_bytes();digest=hashlib.sha256(body).hexdigest();file=digest+'.png';temporary.replace(cache/file)
                used=sorted({data['regions'][layer['regionName']]['textureSha256']for layer in symbol['pose']['layers']})
                alpha=im.getchannel('A').getbbox()
                if not alpha:raise ValueError('Setup pose contains no visible pixels')
                derived[key]={'file':file,'bytes':len(body),'sha256':digest,'width':im.width,'height':im.height,'alphaBounds':{'x':alpha[0],'y':alpha[1],'width':alpha[2]-alpha[0],'height':alpha[3]-alpha[1]},'providerId':symbol['providerId'],'label':symbol['label'],'kind':'derived-static-spine-setup-pose','skeletonSource':symbol['source'],'atlasSourceHashes':used,'layerCount':len(symbol['pose']['layers'])}
            except Exception as error:result['issues'].append({'game':game,'symbol':key,'error':str(error)})
        result['games'][game]=derived
    (ROOT/'derived-symbols.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'games':{game:len(symbols)for game,symbols in result['games'].items()},'issues':result['issues']}))

if __name__=='__main__':main()
