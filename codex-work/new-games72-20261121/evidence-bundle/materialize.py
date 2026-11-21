#!/usr/bin/env python3
"""Restore published reference images after verifying the complete archive.

This utility never downloads anything and never overwrites a differing file.
The archive contains reference/QA images only, never runtime game assets.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import re
import stat
import zipfile

PREFIX = PurePosixPath("codex-work/new-games72-20261121")
SHA256 = re.compile(r"[a-f0-9]{64}\Z")
WITHHELD_IMAGE_NAME = re.compile(r"(?:^|[-_])(?:history|account|profile|my[-_]bets)(?:[-_.]|$)", re.IGNORECASE)
MAX_ARCHIVE_BYTES = 16_000_000
MAX_PART_BYTES = 524_288


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def reference_path(value: object) -> str:
    if not isinstance(value, str) or not value or "\\" in value or any(ord(char) < 32 for char in value):
        raise ValueError("Invalid reference path")
    path = PurePosixPath(value)
    if path.is_absolute() or path.as_posix() != value or any(part in (".", "..") for part in path.parts):
        raise ValueError("Reference path must be normalized and relative")
    if not path.is_relative_to(PREFIX) or path.suffix not in (".png", ".jpg"):
        raise ValueError("Path is outside the published reference-image scope")
    if WITHHELD_IMAGE_NAME.search(path.name):
        raise ValueError("History or account images are withheld from the public bundle")
    parts = path.relative_to(PREFIX).parts
    evidence = len(parts) >= 5 and parts[0] == "games" and parts[2] == "evidence"
    survey = len(parts) >= 4 and parts[:2] == ("references", "access-survey")
    qa = parts == ("games", "roll-x", "qa", "static-renderer.png")
    if not (evidence or survey or qa):
        raise ValueError("Archive member is not a reference or recorded static-QA image")
    return value


def archive_bytes(directory: Path, archive: dict) -> bytes:
    filename = archive["file"]
    parts = archive.get("parts")
    if parts is None:
        archive_path = directory / filename
        if archive_path.is_symlink() or archive_path.stat().st_size != archive["bytes"]:
            raise ValueError("Archive size or file type differs from the index")
        return archive_path.read_bytes()
    expected_count = (archive["bytes"] + MAX_PART_BYTES - 1) // MAX_PART_BYTES
    if not isinstance(parts, list) or len(parts) != expected_count:
        raise ValueError("Archive part count differs from the declared size")
    verified: list[bytes] = []
    for position, part in enumerate(parts, 1):
        expected_file = filename + ".part-" + str(position).zfill(3)
        expected_bytes = min(MAX_PART_BYTES, archive["bytes"] - (position - 1) * MAX_PART_BYTES)
        if not isinstance(part, dict) or part.get("index") != position or part.get("file") != expected_file:
            raise ValueError("Archive parts must have exact ordered local filenames")
        if part.get("bytes") != expected_bytes or not SHA256.fullmatch(part.get("sha256", "")):
            raise ValueError("Invalid archive part size or digest")
        path = directory / expected_file
        if path.is_symlink() or path.stat().st_size != expected_bytes:
            raise ValueError("Archive part size or file type differs from the index")
        raw = path.read_bytes()
        if len(raw) != expected_bytes or digest(raw) != part["sha256"]:
            raise ValueError("Archive part SHA-256 mismatch")
        verified.append(raw)
    return b"".join(verified)


def load_verified(index_path: Path) -> tuple[dict, dict[str, bytes]]:
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if not isinstance(index, dict) or index.get("schemaVersion") != 1:
        raise ValueError("Unsupported evidence bundle schema")
    archive = index.get("archive", {})
    if not isinstance(archive, dict):
        raise ValueError("Archive metadata is missing")
    filename = archive.get("file")
    if not isinstance(filename, str) or Path(filename).name != filename or "\\" in filename or not filename.endswith(".zip"):
        raise ValueError("Archive filename must be a local ZIP basename")
    if not isinstance(archive.get("bytes"), int) or not 0 < archive["bytes"] <= MAX_ARCHIVE_BYTES:
        raise ValueError("Invalid archive size")
    if not SHA256.fullmatch(archive.get("sha256", "")):
        raise ValueError("Invalid archive digest")
    raw = archive_bytes(index_path.parent, archive)
    if len(raw) != archive["bytes"] or digest(raw) != archive["sha256"]:
        raise ValueError("Archive SHA-256 mismatch")
    entries = index.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("Evidence entry list is missing")
    expected: dict[str, dict] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Evidence entry metadata is invalid")
        name = reference_path(entry.get("path"))
        if name in expected:
            raise ValueError("Duplicate evidence index path")
        if not isinstance(entry.get("bytes"), int) or not 0 < entry["bytes"] <= MAX_ARCHIVE_BYTES:
            raise ValueError("Invalid reference size")
        if not SHA256.fullmatch(entry.get("sha256", "")):
            raise ValueError("Invalid reference digest")
        expected[name] = entry
    if sum(entry["bytes"] for entry in expected.values()) > MAX_ARCHIVE_BYTES:
        raise ValueError("Evidence contents exceed the bounded archive size")
    omissions = index.get("publicOmissions", [])
    if not isinstance(omissions, list) or any(
        not isinstance(item, dict) or item.get("path") in expected for item in omissions
    ):
        raise ValueError("Withheld evidence must not be an archive member")
    verified: dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as bundle:
        infos = bundle.infolist()
        if len(infos) != len(expected) or {info.filename for info in infos} != set(expected):
            raise ValueError("Archive members differ from the exact evidence index")
        for info in infos:
            name = reference_path(info.filename)
            mode = info.external_attr >> 16
            if info.is_dir() or stat.S_ISLNK(mode) or (stat.S_IFMT(mode) not in (0, stat.S_IFREG)):
                raise ValueError("Only regular image files are permitted in the archive")
            if info.compress_type != zipfile.ZIP_STORED or info.flag_bits & 1:
                raise ValueError("Evidence bundle must use unencrypted ZIP_STORED members")
            entry = expected[name]
            if info.file_size != entry["bytes"] or info.compress_size != entry["bytes"]:
                raise ValueError("Archived image size mismatch")
            data = bundle.read(info)
            if len(data) != entry["bytes"] or digest(data) != entry["sha256"]:
                raise ValueError("Archived image SHA-256 mismatch")
            verified[name] = data
    return index, verified


def safe_destination(root: Path, name: str) -> Path:
    path = root
    parts = PurePosixPath(name).parts
    for position, part in enumerate(parts):
        path = path / part
        if path.is_symlink():
            raise ValueError("Destination contains a symbolic link")
        if path.exists() and position < len(parts) - 1 and not path.is_dir():
            raise ValueError("Destination parent is not a directory")
    if not path.resolve().is_relative_to(root):
        raise ValueError("Destination escapes the selected repository root")
    return path


def materialize(index_path: Path, root: Path, *, verify_only: bool = False) -> dict:
    # Validate the archive, every image, and every existing destination before
    # creating any directory or file. A differing existing image blocks all writes.
    index, images = load_verified(index_path)
    root = root.resolve()
    if root.exists() and not root.is_dir():
        raise ValueError("Destination root is not a directory")
    pending: list[tuple[str, bytes]] = []
    unchanged = 0
    for name, data in images.items():
        destination = safe_destination(root, name)
        if destination.exists():
            if not destination.is_file() or destination.read_bytes() != data:
                raise ValueError("Refusing to overwrite changed existing evidence: " + name)
            unchanged += 1
        else:
            pending.append((name, data))
    written = 0
    if not verify_only:
        for name, data in pending:
            destination = safe_destination(root, name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination = safe_destination(root, name)
            # Exclusive creation also refuses a file introduced after preflight.
            with destination.open("xb") as output:
                output.write(data)
            if destination.read_bytes() != data:
                raise ValueError("Materialized evidence failed exact readback: " + name)
            written += 1
    return {"archiveSha256": index["archive"]["sha256"],
            "archiveParts": len(index["archive"].get("parts", [])), "verifiedFiles": len(images),
            "publicOmissions": len(index.get("publicOmissions", [])),
            "verifiedBytes": sum(map(len, images.values())), "writtenFiles": written,
            "unchangedFiles": unchanged, "missingFiles": len(pending) if verify_only else 0,
            "verifyOnly": verify_only, "runtimeAssetsIncluded": False}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", type=Path, default=Path(__file__).with_name("index.json"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[3])
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(materialize(args.index, args.root, verify_only=args.verify_only), sort_keys=True))
    except (ValueError, OSError, KeyError, TypeError, zipfile.BadZipFile) as error:
        parser.exit(1, "Evidence materialization failed: " + str(error) + "\n")


if __name__ == "__main__":
    main()
