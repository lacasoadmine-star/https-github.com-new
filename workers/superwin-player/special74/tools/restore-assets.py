"""Restore only committed, hash-pinned original presentation assets for local tests."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlsplit
import hashlib, json, os, re, subprocess

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
ASSETS=(ROOT/"assets").resolve()

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def restore(record):
    source=record["source"]
    url=urlsplit(source)
    allowed=(url.scheme=="https" and (
        (url.hostname=="static.ssg-public.com" and (
            url.path.startswith("/cache/b1/SlotsDemo/Content/Images/BlazingHot/") or
            url.path.startswith("/cache/b1/SlotsDemo/Content/Sound/BlazingHot/") or
            url.path.startswith("/cache/b1/SlotsDemo/Content/Images/MultiHot5/") or
            url.path.startswith("/cache/b1/SlotsDemo/Content/Images/MultiHot10/") or
            url.path.startswith("/cache/b1/SlotsDemo/Content/Sound/MultiHot10/") or
            url.path.startswith("/cache/b1/SlotsDemo/Content/Sound/MultiHot5/") or
            url.path.startswith("/cache/b1/SlotsDemo/Content/Fonts/") or
            url.path=="/cache/b16/GameLauncher/Content/Images/Menu/mobile-menu-open-icon.png")) or
        url.hostname=="cdn.prod.website-files.com"))
    if not allowed or url.username or url.password:
        raise ValueError("Unrecognized original asset source")
    relative=record["path"]
    target=((REPO/relative) if relative.startswith("workers/") else (ROOT/relative)).resolve()
    if not target.is_relative_to(ASSETS) or target==ASSETS:
        raise ValueError("Asset path escapes the new package")
    expected=record["sha256"]
    if not re.fullmatch("[a-f0-9]{64}",expected) or not isinstance(record["bytes"],int) or record["bytes"]<=0:
        raise ValueError("Invalid asset provenance")
    if target.is_file() and target.stat().st_size==record["bytes"] and digest(target)==expected:
        return {"path":relative,"restored":False,"verified":True}
    target.parent.mkdir(parents=True,exist_ok=True)
    temporary=target.with_name(target.name+".download")
    try:
        subprocess.run(["curl","--proxy",os.environ.get("HTTPS_PROXY",""),
            "--fail","--location","--silent","--show-error","--max-time","60",
            "--retry","2","--max-filesize","33554432",source,"-o",str(temporary)],check=True)
        if temporary.stat().st_size!=record["bytes"] or digest(temporary)!=expected:
            raise ValueError("Original asset changed: "+relative)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return {"path":relative,"restored":True,"verified":True}

def main():
    records={}
    for name in ("media-manifest.json","cover-manifest.json","launcher-media-manifest.json","mh10-media-manifest.json"):
        manifest=json.loads((ROOT/name).read_text())
        if manifest.get("failures"):
            raise ValueError("Unresolved original-media download failures in "+name)
        for record in manifest["assets"]:
            key=record["path"]
            previous=records.get(key)
            if previous and (previous["sha256"],previous["source"])!=(record["sha256"],record["source"]):
                raise ValueError("Conflicting asset identity: "+key)
            records[key]=record
    with ThreadPoolExecutor(max_workers=4) as pool:
        restored=list(pool.map(restore,records.values()))
    result={"verified":len(restored),"restored":sum(r["restored"] for r in restored),
            "source":"Committed original-media manifests","productionRequests":0}
    output=ROOT/"test-results";output.mkdir(exist_ok=True)
    (output/"asset-restore.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps(result))

if __name__=="__main__":
    main()
