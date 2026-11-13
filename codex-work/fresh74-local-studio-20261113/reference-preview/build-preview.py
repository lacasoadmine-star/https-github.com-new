#!/usr/bin/env python3
"""Package only this run's original evidence into a portable offline viewer.

Python standard library only. The generated catalogue is a read-only snapshot,
not a statement that the 74 requested audiovisual captures are complete.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import tempfile

SOURCE = Path(__file__).resolve().parent
ASSETS = ("index.html", "style.css", "viewer-core.js", "app.js")
MEDIA_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".mp4"}


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def atomic_write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="." + path.name, dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(value.encode("utf-8") if isinstance(value, str) else value)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def image_dimensions(path):
    """Read original PNG/JPEG size without changing image bytes."""
    with path.open("rb") as stream:
        head = stream.read(24)
        if head[:8] == b"\x89PNG\r\n\x1a\n" and len(head) >= 24:
            return struct.unpack(">II", head[16:24])
        if head[:2] != b"\xff\xd8":
            return None
        stream.seek(2)
        while True:
            marker = stream.read(1)
            if not marker:
                return None
            if marker != b"\xff":
                continue
            while marker == b"\xff":
                marker = stream.read(1)
            if not marker or marker[0] in (0xD9, 0xDA):
                return None
            if marker[0] in (0x00, 0x01, *range(0xD0, 0xD8)):
                continue
            length_bytes = stream.read(2)
            if len(length_bytes) != 2:
                return None
            length = int.from_bytes(length_bytes, "big")
            if length < 2:
                return None
            if marker[0] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                size = stream.read(5)
                return (int.from_bytes(size[3:5], "big"), int.from_bytes(size[1:3], "big")) if len(size) == 5 else None
            stream.seek(length - 2, 1)


def source_file(root, raw, original_root=None):
    if not isinstance(raw, str) or not raw or "://" in raw:
        return None
    path = Path(raw)
    # Archives retain the original path as provenance. Rebase only that exact
    # manifest-declared run prefix when the user moves the complete evidence run.
    if path.is_absolute() and original_root and not path.is_relative_to(root):
        origin = Path(original_root)
        if origin.is_absolute() and path.is_relative_to(origin):
            path = root / path.relative_to(origin)
    path = (path if path.is_absolute() else root / path).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Evidence path escapes the selected fresh run: " + str(path))
    return path


def display_status(entry):
    kind = (entry.get("posterVerification") or {}).get("visualType", "")
    status = str(entry.get("status", "not-attempted")).lower()
    if not entry.get("attempted"):
        return "missing", "Awaiting capture"
    if "provider-runtime" in kind or "provider-runtime" in status:
        return "retry", "Provider error"
    if "page-not-found" in kind or "official-link" in status:
        return "retry", "Official link failed"
    if "loader" in kind or "renderer-error" in status or "renderer-failure" in status:
        return "retry", "Loader / renderer issue"
    if "interrupted" in status:
        return "partial", "Interrupted reference"
    if kind == "partial-gameplay-render":
        return "partial", "Scene incomplete"
    if kind == "gameplay-scene":
        return "scene", "Scene observed"
    return "partial", "Partial reference"


def build(manifest_path, evidence_root, output, link_media=False, study_link=None):
    evidence_root = Path(evidence_root).resolve()
    manifest_path = Path(manifest_path).resolve()
    output = Path(output).resolve()
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    manifest_sha256 = hashlib.sha256(manifest_bytes).hexdigest()
    original_root = manifest.get("evidenceRoot")
    entries = manifest.get("entries", [])
    if len(entries) != 74 or sorted(e.get("index") for e in entries) != list(range(1, 75)):
        raise ValueError("The fresh catalogue must contain exactly indices 1–74 once each")
    if not manifest.get("catalogueCapturedAt"):
        raise ValueError("Fresh catalogue timestamp is required")
    output.mkdir(parents=True, exist_ok=True)
    media_dir = output / "media"
    media_dir.mkdir(exist_ok=True)
    media = {}
    missing = []

    def add_media(raw, expected=None):
        path = source_file(evidence_root, raw, original_root)
        if path is None:
            return None
        relative = str(path.relative_to(evidence_root))
        if not path.is_file():
            missing.append({"source": relative, "reason": "source-file-missing"})
            return None
        suffix = path.suffix.lower()
        if suffix not in MEDIA_SUFFIXES:
            raise ValueError("Unsupported evidence media type: " + suffix)
        sha = digest(path)
        if expected and sha != expected:
            raise ValueError("Source hash mismatch: " + relative)
        name = sha + suffix
        target = media_dir / name
        if not target.exists():
            temporary = target.with_suffix(target.suffix + ".pending")
            try:
                if link_media:
                    try:
                        os.link(path, temporary)
                    except OSError:
                        shutil.copy2(path, temporary)
                else:
                    shutil.copy2(path, temporary)
                if digest(temporary) != sha:
                    raise ValueError("Copied media hash mismatch: " + relative)
                os.replace(temporary, target)
            finally:
                if temporary.exists():
                    temporary.unlink()
        elif digest(target) != sha:
            raise ValueError("Packaged media hash mismatch: " + str(target))
        result = {"url": "media/" + name, "sha256": sha, "source": relative, "bytes": target.stat().st_size}
        dimensions = image_dimensions(target) if suffix in (".jpg", ".jpeg", ".png") else None
        if dimensions:
            result.update(width=dimensions[0], height=dimensions[1])
        media[result["url"]] = result
        return result

    records = []
    for entry in sorted(entries, key=lambda e: e["index"]):
        group, label = display_status(entry)
        record = {key: entry.get(key) for key in (
            "index", "name", "status", "attempted", "finishedAttempt", "sampledDurationSeconds",
            "sampledFrameCount", "verifiedPlayedSeconds", "fullMinuteGameplayVerified",
            "completeReferenceCapture", "observations", "errors", "rendererIssues", "actionNotes",
            "failureClassification", "meaningfulGameplayScreenshotCountVerified", "curatorialCorrections"
        )}
        record.update(group=group, statusLabel=label, audioCaptured=False,
                      nativeContinuousVideoCaptured=False, mobileTouchCaptured=False,
                      screenshots=[], actions=entry.get("actions") or [],
                      poster=None, clip=None, missingMedia=[], supplementalAttempts=[])
        before_missing = len(missing)
        for shot in entry.get("screenshots") or []:
            item = add_media(shot.get("path"), shot.get("sha256"))
            if item:
                record["screenshots"].append({**item, **{key: shot.get(key) for key in (
                    "at", "label", "origin", "timestampStatus", "note", "verifiedGameplayView"
                )}})
        poster = entry.get("poster") or entry.get("previewImage")
        review = entry.get("posterVerification") or {}
        record["poster"] = add_media(poster, review.get("sha256") if review.get("path") == poster else None)
        record["posterVerification"] = {key: review.get(key) for key in (
            "visualType", "notes", "verifiedAt", "method", "scope", "originalPixelsUnmodified"
        )}
        record["sceneObserved"] = review.get("visualType") == "gameplay-scene"
        # A clip is accepted only with the exporter's silent/timestamp verification.
        summary_path = source_file(evidence_root, entry.get("clipSummary"), original_root)
        if entry.get("clip") and summary_path and summary_path.is_file():
            summary = json.loads(summary_path.read_text())
            verification = summary.get("verification") or {}
            if (summary.get("exportType") != "timestamped-screenshot-sample-playback"
                    or summary.get("containsAudioTrack") is not False
                    or verification.get("audioStreamCount") != 0
                    or not summary.get("clipSha256")):
                raise ValueError("Silent sampled export has not been verified: " + str(summary_path))
            record["clip"] = add_media(entry["clip"], summary["clipSha256"])
            record["clipVerification"] = {
                "sampledFrameSpanMs": summary.get("sampledFrameSpanMs"),
                "encodedDurationMs": verification.get("encodedDurationMs"),
                "terminalPacketPaddingMs": summary.get("terminalPacketPaddingMs"),
                "sourceFrameCount": summary.get("sourceFrameCount"),
                "maxTimestampErrorMs": verification.get("maxTimestampErrorMs"),
                "audioStreamCount": 0,
                "sampleRateHz": summary.get("sampledRateHzAcrossRecordedSegments"),
                "width": verification.get("width"), "height": verification.get("height")
            }
        motion = entry.get("sampledMotion") or {}
        record["sampledMotion"] = {key: motion.get(key) for key in (
            "type", "sampledFrameSpanMs", "sampleRateHzAcrossRecordedSegments", "discontinuities",
            "omittedInterSegmentGapMs", "unindexedFrameCount", "includesLoadingOrIdle", "uncertainties"
        )}
        record["sampledMotion"]["segments"] = [
            {key: segment.get(key) for key in (
                "index", "sourceFirstFrameAt", "sourceLastFrameAt", "frameCount", "frameSpanMs",
                "sampleRateHz", "outputStartMs", "outputEndMs", "maxSampleIntervalMs"
            )} for segment in motion.get("segments", [])
        ]
        for attempt in entry.get("supplementalAttempts") or []:
            # Preserve supplemental observations; only explicit image evidence is packaged.
            supplement = {key: attempt.get(key) for key in ("status", "environment", "notes", "observations", "failureClassification")}
            supplement["screenshots"] = []
            for shot in attempt.get("screenshots") or []:
                raw = shot.get("path") if isinstance(shot, dict) else shot
                item = add_media(raw, shot.get("sha256") if isinstance(shot, dict) else None)
                if item:
                    supplement["screenshots"].append(item)
            record["supplementalAttempts"].append(supplement)
        record["missingMedia"] = missing[before_missing:]
        records.append(record)

    counts = {
        "titles": len(records), "attempted": sum(bool(e["attempted"]) for e in records),
        "finishedAttempts": sum(bool(e["finishedAttempt"]) for e in records),
        "sceneObserved": sum(e["sceneObserved"] for e in records),
        "silentClips": sum(bool(e["clip"]) for e in records),
        "needsRetry": sum(e["group"] in ("retry", "missing") for e in records),
        "retryableIncompleteTitles": sum(e["completeReferenceCapture"] is not True for e in records),
        "completeReferenceCaptures": sum(e["completeReferenceCapture"] is True for e in records),
        "audioCaptures": 0,
        "fullMinuteGameplayVerified": sum(e["fullMinuteGameplayVerified"] is True for e in records),
        "sampledSeconds": round(sum((e.get("sampledDurationSeconds") or 0) for e in records if e["clip"]), 3),
        "indexedSceneSampleSeconds": round(sum(e.get("sampledDurationSeconds") or 0 for e in records), 3)
    }
    data = {"schemaVersion": 1, "buildId": manifest_sha256,
            "builtAt": datetime.now(timezone.utc).isoformat(), "sourceUpdatedAt": manifest.get("updatedAt"),
            "catalogueSource": manifest.get("catalogueSource"),
            "catalogueCapturedAt": manifest["catalogueCapturedAt"],
            "recordingDescription": "Original fresh screenshots and silent timestamped sample playback; all captures remain partial.",
            "studyLink": study_link, "counts": counts, "entries": records, "missingMedia": missing}
    for name in ASSETS:
        atomic_write(output / name, (SOURCE / name).read_bytes())
    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    atomic_write(output / "catalogue.json", encoded + "\n")
    atomic_write(output / "catalogue-data.js", "window.FRESH74_DATA = " + encoded.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026") + ";\n")
    inventory = {"buildId": data["buildId"], "files": sorted(media.values(), key=lambda m: m["url"]),
                 "mediaBytes": sum(m["bytes"] for m in media.values()), "originalBytesUnmodified": True,
                 "missingMedia": missing}
    atomic_write(output / "media-integrity.json", json.dumps(inventory, indent=2) + "\n")
    return {"output": str(output), "counts": counts, "mediaFiles": len(media), "mediaBytes": inventory["mediaBytes"], "missingMedia": len(missing)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--evidence-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--hardlink-media", action="store_true", help="Local workspace optimization; exported copies remain byte-identical")
    parser.add_argument("--study-link", help="Optional relative path to the separate local visual prototype")
    arguments = parser.parse_args()
    print(json.dumps(build(arguments.manifest, arguments.evidence_root, arguments.output,
                           arguments.hardlink_media, arguments.study_link), indent=2))
