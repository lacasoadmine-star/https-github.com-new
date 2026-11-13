"""Verify downloaded rasters and audio/video metadata; reuse checks by content hash.

Requires Pillow and ffprobe. This is an offline asset check, not gameplay QA.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess
import time

from PIL import Image, __version__ as pillow_version

PACKAGE = Path(__file__).resolve().parents[1]
REPORT = PACKAGE.parents[2] / "reports/special74"
OUTPUT = REPORT / "all74-media-integrity.json"


def main():
    manifest_bytes = (REPORT / "all74-media-manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    assets = [a for a in manifest["assets"] if a.get("mime", "").startswith(("image/", "audio/", "video/"))]
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}
    svg_file = REPORT / "svg-decoder-checks.json"
    svg_report = json.loads(svg_file.read_text()) if svg_file.exists() else {}
    svg_checks = {(a["source"], a["sha256"]): a for a in svg_report.get("files", []) if a.get("verified") and svg_report.get("networkRequests") == 0}
    reusable_method = previous.get("rasterMethod") == "Pillow Image.verify" and previous.get("audioVideoMethod") == "ffprobe stream/format metadata"
    cache = {(a["source"], a["sha256"]): a for a in previous.get("files", []) if reusable_method and a.get("verified")}
    started = time.monotonic()

    def inspect(asset):
        path = PACKAGE / asset["path"]
        result = {key: asset[key] for key in ("source", "path", "sha256", "mime")}
        try:
            # Cached decoder checks are reusable only while the local bytes still
            # match the manifest. A changed file is never accepted from metadata.
            if path.stat().st_size != asset["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != asset["sha256"]:
                raise ValueError("Local bytes no longer match the pinned manifest")
            cached = cache.get((asset["source"], asset["sha256"]))
            if cached:
                return cached, True
            if asset["mime"] == "image/svg+xml":
                decoded = svg_checks.get((asset["source"], asset["sha256"]))
                if not decoded:
                    raise ValueError("Run verify-svg.cjs for this SVG content hash")
                result.update(width=decoded["width"], height=decoded["height"], format="SVG", visiblePixels=decoded["visiblePixels"])
            elif asset["mime"].startswith("image/"):
                with Image.open(path) as image:
                    result.update(width=image.width, height=image.height, format=image.format)
                    image.verify()
            else:
                process = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                    "format=duration:stream=codec_name,codec_type,sample_rate,width,height", "-of", "json", str(path)],
                    capture_output=True, text=True, timeout=20)
                if process.returncode:
                    raise ValueError(process.stderr[:400])
                metadata = json.loads(process.stdout)
                if not metadata.get("streams"):
                    raise ValueError("No readable media streams")
                result["metadata"] = metadata
            result["verified"] = True
        except Exception as error:
            result.update(verified=False, error=str(error)[:500])
        return result, False

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(inspect, assets))
    records = [record for record, _ in results]
    report = {
        "scope": "Offline raster integrity and audio/video metadata validation; this does not establish gameplay or presentation parity.",
        "manifestSha256": hashlib.sha256(manifest_bytes).hexdigest(),
        "rasterMethod": "Pillow Image.verify", "pillowVersion": pillow_version,
        "audioVideoMethod": "ffprobe stream/format metadata",
        "svgMethod": "Chromium Image.decode and nonempty Canvas raster",
        "checkedFiles": len(records), "verifiedFiles": sum(r["verified"] for r in records),
        "failedFiles": sum(not r["verified"] for r in records),
        "reusedDecoderChecks": sum(reused for _, reused in results),
        "elapsedSeconds": round(time.monotonic() - started, 2), "files": records,
    }
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n")
    temporary.replace(OUTPUT)
    print(json.dumps({key: value for key, value in report.items() if key != "files"}))
    if report["failedFiles"]:
        print(json.dumps([record for record in records if not record["verified"]]))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
