"""Finish an already running official-demo pass and verify its local media cache.

Deterministic local work only: no AI service, production wallet or deployment.
Every stage is resumable. Unavailable provider files remain explicit failures.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import time

PACKAGE = Path(__file__).resolve().parents[1]
REPO = PACKAGE.parents[2]
REPORT = REPO / "reports/special74"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-zA-Z0-9-]+", args.run):
        parser.error("Invalid observation run")
    index = REPORT / "batch-observations" / args.run / "index.json"
    previous = None
    while True:
        batch = json.loads(index.read_text())
        progress = batch["totals"]["finished"]
        if progress != previous:
            print(json.dumps({"stage": "observing", "finished": progress, "requested": batch["requested"]}), flush=True)
            previous = progress
        if progress == batch["requested"]:
            break
        time.sleep(20)

    scripts = PACKAGE / "tools"
    stages = [
        ("acquire", ["python", str(scripts / "fetch-all-media.py"), "--workers", "12", "--checkpoint-every", "500"]),
        ("svg", ["node", str(scripts / "verify-svg.cjs")]),
        ("decode", ["python", str(scripts / "verify-media-integrity.py")]),
        ("profiles", ["python", str(scripts / "build-presentation-profiles.py")]),
        ("status", ["node", str(scripts / "summarize-evidence.mjs")]),
    ]
    results = []
    for name, command in stages:
        print(json.dumps({"stage": name, "state": "starting"}), flush=True)
        code = subprocess.run(command, cwd=REPO, env=os.environ).returncode
        results.append({"stage": name, "exitCode": code})
        if name == "acquire":
            media = json.loads((REPORT / "all74-media-manifest.json").read_text())
            status = json.loads((REPORT / "all74-media-status.json").read_text())
            if code not in (0, 1) or media.get("unverifiedPins") or status["pendingMedia"]:
                raise RuntimeError("Media acquisition did not finish")
            if any("404" not in failure["error"] for failure in media["failures"]):
                raise RuntimeError("Media acquisition needs repair beyond provider 404 responses")
        elif code:
            raise RuntimeError(f"Reference stage failed: {name}")
    summary = json.loads((REPORT / "current-status.json").read_text())
    complete = {"updatedAt": datetime.now(timezone.utc).isoformat(), "run": args.run,
                "scope": "Completed acquisition and validation of observed available public media; not complete feature acceptance",
                "stages": results, "catalogue": summary["totals"], "media": summary["mediaAcquisition"],
                "allFeaturesVerified": False, "productionChanged": False, "deploymentPerformed": False}
    output = REPORT / "reference-pass-completion.json"
    temporary = output.with_suffix(".tmp")
    temporary.write_text(json.dumps(complete, indent=2) + "\n")
    temporary.replace(output)
    print(json.dumps({"stage": "complete", "report": str(output.relative_to(REPO))}), flush=True)


if __name__ == "__main__":
    main()
