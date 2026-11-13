"""Stage catalogue covers from the freshly retrieved official provider catalogue."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit
import datetime,hashlib,json,os,subprocess

ROOT=Path(__file__).resolve().parents[4]
PACKAGE=ROOT/'workers/superwin-player/special74'
OUT=PACKAGE/'assets/covers'

def fetch(entry):
    game=CATALOGUE[entry['selectedName']];url=game['cover']
    if urlsplit(url).scheme!='https' or urlsplit(url).hostname!='cdn.prod.website-files.com':
        raise ValueError('Unexpected provider cover source')
    target=OUT/(entry['id']+Path(urlsplit(url).path).suffix)
    response=subprocess.run(['curl','--fail','--location','--silent','--show-error',
        '--max-time','40','--max-filesize','10485760','--proxy',os.environ['HTTPS_PROXY'],url],capture_output=True)
    if response.returncode:raise RuntimeError(entry['selectedName']+': '+response.stderr.decode()[:200])
    target.write_bytes(response.stdout)
    return {'id':entry['id'],'selectedName':entry['selectedName'],'officialPage':game['officialPage'],
        'source':url,'path':str(target.relative_to(ROOT)),
        'runtimePath':'/special-games/assets/covers/'+target.name,
        'bytes':len(response.stdout),'sha256':hashlib.sha256(response.stdout).hexdigest()}

if __name__=='__main__':
    CATALOGUE={g['name']:g for g in json.loads((ROOT/'reports/special74/fresh-official-games.json').read_text())['games']}
    entries=json.loads((ROOT/'reports/special74/selected-games.json').read_text())['entries']
    OUT.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:assets=list(pool.map(fetch,entries))
    manifest={'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'source':'Fresh official SmartSoft catalogue; covers are not playable game implementations',
        'assets':assets}
    (PACKAGE/'cover-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'covers':len(assets),'bytes':sum(a['bytes'] for a in assets)}))
