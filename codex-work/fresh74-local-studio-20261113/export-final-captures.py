#!/usr/bin/env python3
"""Export finalized screenshot timelines without editing source captures."""
from __future__ import annotations

import importlib.util
import argparse
import json
import os
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(os.environ.get('FRESH74_EVIDENCE_ROOT', '/workspace/shared/zplay-fresh74-20261113')).expanduser().resolve()
OUT = ROOT / 'sampled-exports'
spec = importlib.util.spec_from_file_location('sample_export', Path(__file__).with_name('assemble-sampled-clips.py'))
sample_export = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sample_export)


def metadata(directory):
    for filename in ('capture.json', 'attempt.json', 'observation.json'):
        path = directory / filename
        if path.exists():
            return json.loads(path.read_text()), path
    return {}, None


def eligible(directory):
    data, path = metadata(directory)
    status = str(data.get('status', '')).lower()
    if not status or any(word in status for word in ('in-progress', 'pending', 'renderer-failure', 'renderer-error', 'failed-', 'retryable_', 'paused')):
        return False
    motion = directory / 'motion'
    return (motion / 'timestamps.json').exists() or any(motion.glob('segment-*.json'))


def main():
    global ROOT, OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT,
                        help='Evidence directory; defaults to FRESH74_EVIDENCE_ROOT or the original capture directory.')
    parser.add_argument('game_directories', nargs='*', type=Path,
                        help='Optional exact game directories to export; defaults to every eligible directory under root.')
    args = parser.parse_args()
    ROOT = args.root.expanduser().resolve()
    OUT = ROOT / 'sampled-exports'
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    old_path = ROOT / 'export-results.json'
    old = json.loads(old_path.read_text()) if old_path.exists() else {}
    all_results = {item['directory']: item for item in old.get('results', [])}
    requested = {p.expanduser().resolve() for p in args.game_directories} if args.game_directories else None
    for directory in sorted(ROOT.iterdir()):
        if not directory.is_dir() or directory == OUT or (requested is not None and directory.resolve() not in requested):
            continue
        if not eligible(directory):
            continue
        result = {'directory': str(directory)}
        try:
            inspected = sample_export.assemble(directory, OUT, 2000, inspect_only=True)
            target = Path(inspected['clip'])
            summary_path = target.with_suffix('.summary.json')
            if target.exists() and summary_path.exists():
                existing = json.loads(summary_path.read_text())
                old_frames = [(f['path'], f['at'], f['sha256']) for f in existing['sourceFrames']]
                new_frames = [(f['path'], f['at'], f['sha256']) for f in inspected['sourceFrames']]
                if old_frames != new_frames:
                    raise ValueError('Existing export source timeline differs; original export preserved for manual review')
                exported = existing
                result['status'] = 'existing-verified-timeline'
            else:
                exported = sample_export.assemble(directory, OUT, 2000)
                result['status'] = 'exported'
            result.update({'clip': exported['clip'], 'summary': str(summary_path),
                           'sourceFrames': exported['sourceFrameCount'],
                           'sampledDurationSeconds': exported['sampledFrameSpanMs'] / 1000,
                           'segments': len(exported['segments']), 'audioCaptured': False})
        except Exception as error:
            result.update({'status': 'export-error', 'error': str(error)})
        results.append(result)
        all_results[result['directory']] = result
        print(json.dumps(result), flush=True)
        checkpoint = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'results': sorted(all_results.values(), key=lambda r: r['directory'])}
        pending = ROOT / 'export-results.pending.json'
        pending.write_text(json.dumps(checkpoint, indent=2) + '\n')
        pending.replace(old_path)
    return results


if __name__ == '__main__':
    main()
