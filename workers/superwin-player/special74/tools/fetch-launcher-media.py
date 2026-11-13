"""Restore the observed original launcher button, with its pinned source and hash."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://static.ssg-public.com/cache/b16/GameLauncher/Content/Images/Menu/mobile-menu-open-icon.png"
RELATIVE = "assets/Launcher/Menu/mobile-menu-open-icon.png"
SHA256 = "8d5d8ca0d87f236ddd1cdabef164da69f75f43146910f8f4443bbb0973ce0372"
EXPECTED_BYTES = 1660

def verified(path):
    data = path.read_bytes()
    return (len(data) == EXPECTED_BYTES
            and data.startswith(b"\x89PNG\r\n\x1a\n")
            and hashlib.sha256(data).hexdigest() == SHA256)

def main():
    manifest = json.loads((ROOT / "launcher-media-manifest.json").read_text())
    records = manifest.get("assets", [])
    if len(records) != 1:
        raise ValueError("Unexpected launcher media inventory")
    record = records[0]
    if (record.get("source"), record.get("path"), record.get("sha256"), record.get("bytes")) != (SOURCE, RELATIVE, SHA256, EXPECTED_BYTES):
        raise ValueError("Launcher provenance differs from the observed source")
    target = ROOT / RELATIVE
    target.parent.mkdir(parents=True, exist_ok=True)
    restored = False
    if not target.is_file() or not verified(target):
        temporary = target.with_name(target.name + ".download")
        try:
            subprocess.run(["curl", "--proxy", os.environ.get("HTTPS_PROXY", ""),
                            "-fLsS", "--max-time", "60", "--retry", "2",
                            SOURCE, "-o", str(temporary)], check=True)
            if not verified(temporary):
                raise ValueError("Original launcher media failed byte and SHA-256 verification")
            temporary.replace(target)
            restored = True
        finally:
            temporary.unlink(missing_ok=True)
    print(json.dumps({"verified": True, "restored": restored, "path": RELATIVE,
                      "bytes": EXPECTED_BYTES, "sha256": SHA256}))

if __name__ == "__main__":
    main()
