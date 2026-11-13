#!/usr/bin/env python3
"""Package immutable fresh evidence, with per-file hashes and no inferred timing."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

README = '''# Fresh original evidence — 13 November 2026

These files are the original screenshots and capture/timing notes from this session.
INDEX.json records their paths and SHA-256 hashes. Screenshot bytes are unchanged.
The official catalogue supplied the 74 launch links; failed launches remain recorded.

Sample sequences are sparse screenshot captures, not continuous screen recordings.
Wall-clock interaction windows do not establish one minute of active gameplay.
No original audio or mobile touch recording was captured. None of these references
is marked a complete audiovisual capture. Demo balances visible in original images
are reference pixels only; provider money, accounts and server logic were not imported.

The separate local-app bundle contains the usable reference viewer, derived silent
sample clips and three-title visual reel prototype. This archive preserves the
original source images and notes for later verification or rebuilding.
'''

def package(root, first, last, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    manifest = json.loads((root/'manifest-74.json').read_text())
    selected = [e for e in manifest['entries'] if first <= e['index'] <= last]
    if len(selected) != last-first+1 or any(not e.get('finishedAttempt') for e in selected):
        raise ValueError('Every requested title must have a finalized capture attempt')
    output.parent.mkdir(parents=True, exist_ok=True)
    index = {'schemaVersion':1,'captureSession':'2026-11-13','firstIndex':first,'lastIndex':last,
             'originalBytesUnmodified':True,'audioCaptured':False,'nativeContinuousVideo':False,
             'completeReferenceCapture':False,'entries':[]}
    count = 0
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=3,allowZip64=True) as archive:
        archive.writestr('RAW-EVIDENCE-README.md',README)
        for entry in selected:
            directory = Path(entry['directory']).resolve()
            if not directory.is_relative_to(root) or not directory.is_dir(): raise ValueError('Evidence root mismatch')
            record = {k:entry.get(k) for k in ('index','name','status','officialDemoUrl')}
            record['files'] = []
            for path in sorted(directory.rglob('*')):
                if not path.is_file() or path.suffix.lower() not in {'.jpg','.jpeg','.png','.json'}: continue
                relative = path.relative_to(root).as_posix()
                data = path.read_bytes()
                name = 'sources/'+relative
                digest = hashlib.sha256(data).hexdigest()
                archive.writestr(name,data)
                record['files'].append({'path':name,'bytes':len(data),'sha256':digest})
                count += 1
            index['entries'].append(record)
        archive.writestr('INDEX.json',json.dumps(index,ensure_ascii=False,indent=2)+'\n')
    with zipfile.ZipFile(output) as archive:
        corrupt = archive.testzip()
        if corrupt: raise ValueError('Archive CRC verification failed: '+corrupt)
    summary = {'file':str(output),'games':len(selected),'sourceFiles':count,'bytes':output.stat().st_size,
               'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'crcVerified':True}
    output.with_suffix('.summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    return summary

if __name__ == '__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--root',required=True)
    p.add_argument('--first',type=int,required=True)
    p.add_argument('--last',type=int,required=True)
    p.add_argument('--output',required=True)
    args=p.parse_args()
    print(json.dumps(package(args.root,args.first,args.last,args.output)))
