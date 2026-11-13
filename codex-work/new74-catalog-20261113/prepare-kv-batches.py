#!/usr/bin/env python3
"""Prepare immutable public-asset upload batches for the existing new74 Worker.

This command only writes local JSON files. Uploads are performed separately
through the connected Cloudflare API after review.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path

REVISION = "20261113-all74-r1"
PUBLIC_TEXT = {"index.html", "lobby.mjs", "lobby.css", "entry-link.mjs"}


def prepare(root: Path) -> dict:
    public = root / "public"
    output = root / "kv-batches"
    output.mkdir(parents=True, exist_ok=True)
    assets = []
    for path in sorted(public.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(public).as_posix()
        if relative not in PUBLIC_TEXT and not (
            relative.startswith("assets/fresh74/") and path.suffix == ".jpg"
        ):
            raise ValueError(f"Unreviewed public file: {relative}")
        data = path.read_bytes()
        if not data or len(data) > 25 * 1024 * 1024:
            raise ValueError(f"Invalid asset length: {relative}")
        sha = hashlib.sha256(data).hexdigest()
        assets.append({
            "path": relative,
            "bytes": len(data),
            "sha256": sha,
            "upload": {
                "key": f"new74/{REVISION}/{relative}",
                "value": base64.b64encode(data).decode("ascii"),
                "base64": True,
                "metadata": {"sha256": sha, "bytes": len(data), "revision": REVISION},
            },
        })
    if set(a["path"] for a in assets if a["path"] in PUBLIC_TEXT) != PUBLIC_TEXT:
        raise ValueError("Four reviewed public text files are required")
    if len(assets) != 63:
        raise ValueError("Expected four public text files and 59 fresh JPEGs")
    batches, batch, batch_size = [], [], 0
    for asset in assets:
        entry = asset["upload"]
        size = len(json.dumps(entry, separators=(",", ":")))
        if batch and batch_size + size > 800_000:
            batches.append(batch)
            batch, batch_size = [], 0
        batch.append(entry)
        batch_size += size
    if batch:
        batches.append(batch)
    manifests = []
    for number, entries in enumerate(batches, 1):
        name = f"batch-{number:02d}.json"
        payload = json.dumps(entries, separators=(",", ":"), ensure_ascii=True).encode()
        (output / name).write_bytes(payload)
        manifests.append({"file": name, "keys": [e["key"] for e in entries],
                          "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()})
    manifest = {"revision": REVISION, "files": [{k: v for k, v in a.items() if k != "upload"} for a in assets],
                "batches": manifests}
    (root / "kv-upload-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return {"files": len(assets), "publicBytes": sum(a["bytes"] for a in assets), "batches": len(batches)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path, nargs="?", default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    print(json.dumps(prepare(args.root)))
