#!/usr/bin/env python3
"""Export shared display lists for offline inspection, not browser screenshots."""
import argparse, importlib.util, json
from pathlib import Path
from PIL import ImageFont
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('shared_renderer', ROOT.parent/'render-review.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
# The shared fallback font lacks some multiplier glyphs. This is an explicitly
# local inspection font, not a claimed provider font or a modified source asset.
fallback = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
if fallback.exists():
    ImageFont.load_default = lambda size=10: ImageFont.truetype(str(fallback), size)
parser = argparse.ArgumentParser()
parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/zplay-arcade-assets'))
parser.add_argument('--width', type=int, default=390)
args = parser.parse_args()
if not 240 <= args.width <= 1280:
    raise ValueError('Unsupported review width')
index = json.loads((ROOT/'evidence/scenes.json').read_text())
rows = []
for entry in index['scenes']:
    manifest = json.loads((ROOT/'manifests'/f"{entry['gameId']}.json").read_text())
    scene = json.loads((ROOT/'evidence'/entry['file']).read_text())
    output = ROOT/'evidence'/f"{entry['gameId']}-{entry['fixture']}-{args.width}.png"
    result = shared.render(scene, manifest, args.cache_dir, args.width)
    temporary = output.with_suffix('.png.part')
    result.save(temporary, format='PNG', optimize=True)
    temporary.replace(output)
    rows.append({'gameId':entry['gameId'],'fixture':entry['fixture'],'file':output.name,'width':result.width,'height':result.height})
(ROOT/'evidence/rendered-scenes.json').write_text(json.dumps({'method':'Offline authored display-list render, not a browser screenshot','syntheticReceipts':True,'productionLaunchEnabled':False,'renders':rows},indent=2)+'\n')
print(json.dumps({'exported':len(rows),'width':args.width}))
