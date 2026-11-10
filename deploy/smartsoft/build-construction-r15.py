"""Pin public title covers and the six actually observed vertical backgrounds."""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import gzip
import hashlib
from io import BytesIO
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit,parse_qs

from PIL import Image

ROOT=Path(__file__).resolve().parent
digest=lambda data:hashlib.sha256(data).hexdigest()

def download(url,cache):
    p=cache/digest(url.encode())
    if p.exists():return p.read_bytes()
    parsed=urlsplit(url)
    if parsed.scheme!='https' or parsed.username or parsed.password:
        raise ValueError('PUBLIC_HTTPS_IMAGE_REQUIRED')
    result=subprocess.run(['curl','-fsS','--proto','=https','--max-time','20','--max-filesize','4194304',url],capture_output=True)
    if result.returncode or not result.stdout:raise ValueError('PUBLIC_IMAGE_UNAVAILABLE')
    # A redirect document, login page or unexpected media cannot become a cover.
    image=Image.open(BytesIO(result.stdout));image.verify()
    p.write_bytes(result.stdout)
    return result.stdout

def image_record(url,cache):
    body=download(url,cache);image=Image.open(BytesIO(body))
    media={'PNG':'image/png','JPEG':'image/jpeg','WEBP':'image/webp','AVIF':'image/avif'}[image.format]
    return {'url':url,'sha256':digest(body),'bytes':len(body),'type':media}

def resource(body,media):
    if isinstance(body,str):body=body.encode()
    return {'base64':base64.b64encode(gzip.compress(body,mtime=0)).decode(),'gzip':True,'sha256':digest(body),'bytes':len(body),'type':media}

def main(args):
    cache=args.evidence/'images';cache.mkdir(parents=True,exist_ok=True)
    queue=json.loads((ROOT/'official-queue-1000.json').read_text())
    if args.covers:
        def cover(game):
            try:
                pinned=image_record(game['officialIcon'],cache)
                return game['queueId'],{k:v for k,v in pinned.items() if k!='url'},None
            except Exception as error:return game['queueId'],None,str(error)
        failures=[]
        with ThreadPoolExecutor(max_workers=4) as pool:
            for number,(game,result) in enumerate(zip(queue['games'],pool.map(cover,queue['games'])),1):
                key,pinned,error=result
                if pinned:game['cover']=pinned
                else:failures.append({'queueId':key,'reason':error})
                if number%100==0:print(json.dumps({'coverReads':number,'unavailable':len(failures)}),flush=True)
        (args.evidence/'cover-failures.json').write_text(json.dumps(failures,indent=2)+'\n')
        (ROOT/'official-queue-1000.json').write_text(json.dumps(queue,ensure_ascii=False,indent=2)+'\n')
    profiles,assets={},{}
    observed=args.evidence.parent/'official-background-r15'
    for capture in sorted(observed.glob('*/observations.json')):
        report=json.loads(capture.read_text())
        if not report.get('ready'):continue
        item=next((item for item in report['steps'][0]['backgrounds'] if item['tag']=='CANVAS'),None)
        if not item:continue
        url=re.fullmatch(r'url\("(.+)"\)',item['image'])[1]
        asset=image_record(url,cache)
        suffix='.png' if asset['type']=='image/png' else '.jpg'
        file=asset['sha256']+suffix;assets[file]=asset
        title_source=args.evidence.parent/'official-mobile-r14'/'source'/(report['id']+'-source.js')
        script=title_source.read_text();color=re.search(r"game\.texts\.ButtonsSpin\.style\.fill\s*=\s*\['(#[a-fA-F0-9]+)'\]",script)
        if not color:raise ValueError('OBSERVED_SPIN_LABEL_COLOR_MISSING:'+report['id'])
        habesha=report['id']=='habeshafortune5_native'
        profiles[report['id']]={'file':file,'maxWidth':620 if habesha else 626,'maxHeight':1300 if habesha else 1314,
            'position':item['position'],'repeat':item['repeat'],'spinLabelColor':color[1],
            'source':url,'observationSha256':digest(capture.read_bytes()),'scriptSha256':digest(title_source.read_bytes())}
    if len(profiles)!=6:raise ValueError('ALL_SIX_INDIVIDUAL_BACKGROUND_OBSERVATIONS_REQUIRED')
    observations=[]
    for game_id in profiles:
        captures=[]
        for folder in ['official-observed-r15','official-background-r15','official-rounds-r15']:
            file=args.evidence.parent/folder/game_id/'observations.json'
            if file.exists():
                record=json.loads(file.read_text())
                if record.get('ready'):captures.append((file,record))
        steps=[step for _,record in captures for step in record['steps']]
        provider_key=parse_qs(urlsplit(captures[0][1]['officialDemo']).query)['GameName'][0].casefold()
        summary={'nativeId':game_id,'providerKey':provider_key,'entryObserved':True,
          'sampledSpinStarts':sum(step['step'].endswith('-spin-start') for step in steps),
          'controlsObserved':sorted({step['step'][8:] for step in steps if step['step'].startswith('control-')}),
          'audioStartsObserved':any(step.get('audio') for step in steps),
          'audioFilesRequested':len({asset['sha256'] for _,record in captures for asset in record['audioFiles']}),
          'completeFeatureCoverage':False,'completePresentationParity':False,
          'captures':[{'path':str(file.relative_to(args.evidence.parent)),'sha256':digest(file.read_bytes()),'bytes':file.stat().st_size} for file,_ in captures]}
        observations.append(summary)
        for game in queue['games']:
            if game['provider']=='smartsoft' and game['providerKey'].casefold()==provider_key:
                game.update(demoObserved=True,status='in_development',observation=summary)
    (ROOT/'official-observations-r15.json').write_text(json.dumps({'games':observations,'realMoneyRoundsPlaced':0},indent=2)+'\n')
    (ROOT/'official-queue-1000.json').write_text(json.dumps(queue,ensure_ascii=False,indent=2)+'\n')
    frame=(ROOT/'reference-frame-r14.mjs').read_text().replace("join(' : ')","join(':')")
    frame="import './mobile-background.mjs';\n"+frame
    resources={
        'queue.json':resource(json.dumps(queue,ensure_ascii=False,separators=(',',':')),'application/json; charset=utf-8'),
        'queue-ui.mjs':resource((ROOT/'construction-ui-r15.mjs').read_bytes(),'application/javascript; charset=utf-8'),
        'queue.css':resource((ROOT/'construction-queue-r15.css').read_bytes(),'text/css; charset=utf-8'),
        'frame.mjs':resource(frame,'application/javascript; charset=utf-8'),
        'mobile-display-data.mjs':resource('export const MOBILE_DISPLAY='+json.dumps(profiles,separators=(',',':'))+';\n','application/javascript; charset=utf-8'),
        'mobile-display.mjs':resource((ROOT/'mobile-display-r15.mjs').read_bytes(),'application/javascript; charset=utf-8'),
        'mobile-background.mjs':resource((ROOT/'mobile-background-r15.mjs').read_bytes(),'application/javascript; charset=utf-8'),
    }
    # Public metadata only. Image/audio binaries remain in the existing service's cache.
    source='// Generated by build-construction-r15.py; no account or financial release data.\nexport default '+json.dumps({'queue':queue,'resources':resources,'backgroundAssets':assets},ensure_ascii=False,separators=(',',':'))+';\n'
    (ROOT/'construction-sources-r15.mjs').write_text(source)
    (ROOT/'mobile-display-evidence-r15.json').write_text(json.dumps(profiles,indent=2)+'\n')
    print(json.dumps({'queued':len(queue['games']),'covers':sum('cover' in g for g in queue['games']),'backgrounds':len(profiles),'sourceBytes':len(source.encode())}),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence',type=Path,required=True)
    parser.add_argument('--covers',action='store_true')
    main(parser.parse_args())
