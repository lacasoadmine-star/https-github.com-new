#!/usr/bin/env python3
"""Offline display-list export. This script does not launch or simulate a browser."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('shared_art_review', ROOT.parent / 'render-review.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)

parser = argparse.ArgumentParser()
parser.add_argument('--cache-dir', type=Path, required=True)
parser.add_argument('--width', type=int, default=390)
parser.add_argument('--derivatives', required=True)
args = parser.parse_args()
derivatives = json.loads(args.derivatives)
index = json.loads((ROOT / 'index.json').read_text())
outputs = []
for game, entry in index['games'].items():
    manifest = json.loads((ROOT / entry['file']).read_text())
    scene = json.loads((ROOT / 'evidence' / f'{game}-scene.json').read_text())
    # Ephemeral image-file remapping only. Original manifests and source cache
    # retain their exact SVG bytes, hashes and native source-frame coordinates.
    for frame in manifest['frames'].values():
        if frame['file'] in derivatives:
            derivative = derivatives[frame['file']]
            frame['file'] = derivative['file']
            # Rasterizer density is 216dpi: each SVG coordinate becomes 3px.
            for key in ['x', 'y', 'width', 'height', 'packedWidth', 'packedHeight']:
                frame[key] = round(frame[key] * 3)
            frame['trim'] = {key: round(value * 3) for key, value in frame['trim'].items()}
            frame['original'] = {key: round(value * 3) for key, value in frame['original'].items()}
    image = shared.render(scene, manifest, args.cache_dir, args.width)
    output = ROOT / 'evidence' / f'{game}-{args.width}.png'
    image.save(output, format='PNG', optimize=True)
    data = output.read_bytes()
    outputs.append({'game': game, 'file': output.name, 'width': image.width, 'height': image.height,
                    'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
                    'method': 'offline display-list export; not a browser screenshot'})
print(json.dumps(outputs))
