#!/usr/bin/env python3
"""Export truthful, silent VFR playback from already captured JPEG samples.

No network, capture, audio synthesis, interpolation, or original-file deletion.
Explicit segment boundaries are preserved as MP4 chapters and JSON discontinuities.
Long gaps in the alternate timestamp-list format are inferred as boundaries.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import statistics
import subprocess
import tempfile


def require(condition, message):
    if not condition:
        raise ValueError(message)


def timestamp_ms(value):
    require(isinstance(value, str), "Every frame needs its actual ISO capture timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    require(parsed.tzinfo is not None, "Capture timestamps must include a timezone")
    return round(parsed.timestamp() * 1000)


def iso(value):
    return datetime.fromtimestamp(value / 1000, timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def sha256(filename):
    digest = hashlib.sha256()
    with open(filename, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def command(args):
    completed = subprocess.run(args, check=True, capture_output=True, text=True, timeout=120)
    return completed.stdout


def read_frames(manifest, raw_frames, game_dir):
    require(isinstance(raw_frames, list) and raw_frames, f"No recorded frames in {manifest}")
    frames = []
    for entry in raw_frames:
        require(isinstance(entry, dict), "Malformed frame record")
        raw_path = entry.get("path", entry.get("file"))
        require(isinstance(raw_path, str), "Frame path is missing")
        candidate = Path(raw_path)
        filename = (candidate if candidate.is_absolute() else manifest.parent / candidate).resolve(strict=True)
        require(filename.is_relative_to(game_dir), "Frame escaped its own game directory")
        require(filename.is_file() and filename.suffix.lower() in (".jpg", ".jpeg"), "Only existing JPEG captures are accepted")
        require(not any(char in str(filename) for char in "\r\n\x00"), "Unsupported filename")
        at = timestamp_ms(entry.get("at"))
        require(not frames or at > frames[-1]["timestampMs"], "Frame timestamps must be strictly increasing in recorded order")
        frames.append({"path": str(filename), "timestampMs": at, "at": iso(at), "sha256": sha256(filename), "elapsedMs": entry.get("elapsedMs")})
    require(len(frames) >= 2, "At least two timestamped frames are required for a sampled clip")
    return frames


def normalize(game_dir, gap_threshold_ms):
    motion = game_dir / "motion"
    manifests = sorted(motion.glob("segment-*.json"), key=lambda p: int(re.search(r"segment-(\d+)", p.name).group(1)))
    explicit_segments = bool(manifests)
    if not manifests:
        manifests = [motion / "timestamps.json"]
    segments = []
    for manifest in manifests:
        raw = json.loads(manifest.read_text())
        raw_frames = raw if isinstance(raw, list) else raw.get("frames")
        frames = read_frames(manifest, raw_frames, game_dir)
        metadata = raw if isinstance(raw, dict) else {}
        source = {"path": str(manifest), "sha256": sha256(manifest), "format": "explicit-segment" if explicit_segments else "timestamp-list",
                  "declaredRecordedMs": metadata.get("recordedMs"), "declaredAudioCaptured": metadata.get("audioCaptured")}
        chunks = [frames]
        inferred_threshold = None
        if not explicit_segments:
            deltas = [b["timestampMs"] - a["timestampMs"] for a, b in zip(frames, frames[1:])]
            inferred_threshold = max(gap_threshold_ms, round(statistics.median(deltas) * 4))
            chunks = [[]]
            for frame in frames:
                if chunks[-1] and frame["timestampMs"] - chunks[-1][-1]["timestampMs"] > inferred_threshold:
                    chunks.append([])
                chunks[-1].append(frame)
        for chunk in chunks:
            first, last = chunk[0]["timestampMs"], chunk[-1]["timestampMs"]
            started = timestamp_ms(metadata["startedAt"]) if explicit_segments and metadata.get("startedAt") else first
            ended = timestamp_ms(metadata["endedAt"]) if explicit_segments and metadata.get("endedAt") else last
            require(started <= first <= last <= ended + 2, "Capture window contradicts actual sample timestamps")
            mismatches = []
            if explicit_segments:
                for frame in chunk:
                    value = frame.get("elapsedMs")
                    if value is not None and (not isinstance(value, (int, float)) or abs(frame["timestampMs"] - started - value) > 2):
                        mismatches.append(frame["at"])
            segments.append({"sourceManifest": source, "frames": chunk, "recordingWindowStartedAt": iso(started), "recordingWindowEndedAt": iso(ended),
                             "recordingWindowMs": ended - started, "leadingUncapturedMs": first - started,
                             "trailingUncapturedMs": max(0, ended - last), "timestampDisagreements": mismatches,
                             "boundaryType": "explicit" if explicit_segments else "inferred-from-sampling-gap",
                             "inferredGapThresholdMs": inferred_threshold})
    segments.sort(key=lambda segment: segment["frames"][0]["timestampMs"])
    for before, after in zip(segments, segments[1:]):
        require(after["frames"][0]["timestampMs"] > before["frames"][-1]["timestampMs"], "Overlapping source segments need manual reconciliation")
    return segments


def quoted_concat_path(filename):
    return "'" + filename.replace("'", "'\\''") + "'"


def metadata_text(text):
    return text.replace("\\", "\\\\").replace("=", "\\=").replace(";", "\\;").replace("#", "\\#").replace("\n", " ")


def source_limitations(game_dir):
    filename = game_dir / "attempt.json"
    if not filename.exists():
        filename = game_dir / "capture.json"
    if not filename.exists():
        return []
    source = json.loads(filename.read_text())
    return [value for value in source.get("limitations", []) if isinstance(value, str)]


def assemble(game_dir, output_dir, gap_threshold_ms, inspect_only=False):
    game_dir = game_dir.resolve(strict=True)
    segments = normalize(game_dir, gap_threshold_ms)
    require(segments, "No captured segments")
    label = re.sub(r"[^A-Za-z0-9_-]", "-", game_dir.name).strip("-")
    date_label = segments[0]["frames"][0]["at"][:10].replace("-", "")
    stem = f"{label}-sampled-silent-{date_label}"
    clip = output_dir / (stem + ".mp4")
    summary_path = output_dir / (stem + ".summary.json")
    source_frames = [frame for segment in segments for frame in segment["frames"]]
    summary = {"schemaVersion": 1, "gameDirectory": str(game_dir), "clip": str(clip), "exportType": "timestamped-screenshot-sample-playback",
               "audioCaptured": False, "containsAudioTrack": False, "nativeContinuousVideo": False, "sampledRateIsNotNativeFrameRate": True,
               "completeReferenceCapture": False, "verifiedPlayedSeconds": None, "sourceFramesRetained": True, "sourceFrameCount": len(source_frames),
               "originalFirstSampleAt": source_frames[0]["at"], "originalLastSampleAt": source_frames[-1]["at"],
               "sampledFrameSpanMs": 0, "declaredRecorderWindowMs": sum(segment["recordingWindowMs"] for segment in segments),
               "terminalPacketPaddingMs": len(segments), "segments": [], "discontinuities": [],
               "uncertainties": ["Silent sampled screenshots, not a native continuous video or an audio recording.",
                                 "Pixels between samples are unknown; playback holds the preceding recorded sample until the next sample.",
                                 "Inter-segment gaps are omitted from playback and listed as discontinuities; no 60-second target is imposed.",
                                 "Elapsed sample span is not independently verified active gameplay time.",
                                 "Missing, blank, or incomplete source visuals remain uncorrected; no synthetic frames or interpolation were added.",
                                 "A one-millisecond terminal packet per segment makes its final observed frame displayable; this is not additional observed time."] + source_limitations(game_dir)}
    concat_lines = ["ffconcat version 1.0"]
    metadata_lines = [";FFMETADATA1", "title=" + metadata_text(f"{game_dir.name}: sampled screenshots, silent, discontinuous"),
                      "comment=" + metadata_text("Original capture timestamp spacing within each segment. Segment gaps omitted. NO AUDIO. See " + summary_path.name)]
    expected_pts = []
    offset = 0
    for index, segment in enumerate(segments, 1):
        frames = segment["frames"]
        first, last = frames[0]["timestampMs"], frames[-1]["timestampMs"]
        span = last - first
        gaps = [b["timestampMs"] - a["timestampMs"] for a, b in zip(frames, frames[1:])]
        timing = {"index": index, "sourceManifest": segment["sourceManifest"], "boundaryType": segment["boundaryType"],
                  "inferredGapThresholdMs": segment["inferredGapThresholdMs"], "sourceFirstFrameAt": iso(first), "sourceLastFrameAt": iso(last),
                  "recordingWindowStartedAt": segment["recordingWindowStartedAt"], "recordingWindowEndedAt": segment["recordingWindowEndedAt"],
                  "leadingUncapturedMs": segment["leadingUncapturedMs"], "trailingUncapturedMs": segment["trailingUncapturedMs"],
                  "elapsedTimestampDisagreements": segment["timestampDisagreements"], "frameCount": len(frames), "frameSpanMs": span,
                  "sampleRateHz": round((len(frames) - 1) * 1000 / span, 6) if span else None,
                  "medianSampleIntervalMs": statistics.median(gaps) if gaps else None, "maxSampleIntervalMs": max(gaps) if gaps else None,
                  "outputStartMs": offset, "outputLastSampleMs": offset + span, "outputEndMs": offset + span + 1,
                  "samplingGapsOverThreshold": [{"afterFrameAt": a["at"], "beforeFrameAt": b["at"], "gapMs": b["timestampMs"] - a["timestampMs"]}
                                                for a, b in zip(frames, frames[1:]) if b["timestampMs"] - a["timestampMs"] > gap_threshold_ms]}
        summary["segments"].append(timing)
        summary["sampledFrameSpanMs"] += span
        if index > 1:
            prior = segments[index - 2]
            summary["discontinuities"].append({"afterSegment": index - 1, "beforeSegment": index, "atOutputMs": offset,
                                                "previousLastSampleAt": prior["frames"][-1]["at"], "nextFirstSampleAt": frames[0]["at"],
                                                "omittedSourceGapMs": first - prior["frames"][-1]["timestampMs"],
                                                "displayPolicy": "cut-to-next-sampled-segment; gap not simulated"})
        for n, frame in enumerate(frames):
            duration_ms = frames[n + 1]["timestampMs"] - frame["timestampMs"] if n + 1 < len(frames) else 1
            concat_lines.extend(["file " + quoted_concat_path(frame["path"]), "option framerate 1000", f"duration {duration_ms / 1000:.3f}"])
            expected_pts.append(offset + frame["timestampMs"] - first)
        metadata_lines.extend(["[CHAPTER]", "TIMEBASE=1/1000", f"START={offset}", f"END={offset + span + 1}",
                               "title=" + metadata_text(f"Sampled segment {index}: {iso(first)} to {iso(last)} (silent)")])
        offset += span + 1
    summary["expectedOutputDurationMs"] = offset
    summary["omittedInterSegmentGapMs"] = sum(gap["omittedSourceGapMs"] for gap in summary["discontinuities"])
    summary["sampledRateHzAcrossRecordedSegments"] = round(sum(len(segment["frames"]) - 1 for segment in segments) * 1000 / summary["sampledFrameSpanMs"], 6) if summary["sampledFrameSpanMs"] else None
    summary["sourceFrames"] = [{"path": frame["path"], "at": frame["at"], "sha256": frame["sha256"]} for frame in source_frames]
    if inspect_only:
        return summary
    output_dir.mkdir(parents=True, exist_ok=True)
    require(not clip.exists() and not summary_path.exists(), "Export already exists; choose a new output directory instead of overwriting")
    with tempfile.TemporaryDirectory(prefix=".sampled-export-", dir=output_dir) as temporary:
        temporary = Path(temporary)
        concat_file, metadata_file, pending_clip = temporary / "frames.ffconcat", temporary / "chapters.ffmeta", temporary / "clip.mp4"
        concat_file.write_text("\n".join(concat_lines) + "\n")
        metadata_file.write_text("\n".join(metadata_lines) + "\n")
        command(["ffmpeg", "-nostdin", "-v", "error", "-n", "-f", "concat", "-safe", "0", "-i", str(concat_file),
                 "-f", "ffmetadata", "-i", str(metadata_file), "-map", "0:v:0", "-map_metadata", "1", "-map_chapters", "1",
                 "-an", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2", "-fps_mode", "vfr", "-enc_time_base", "1:1000",
                 "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-bf", "0", "-pix_fmt", "yuv420p", "-video_track_timescale", "1000",
                 "-movflags", "+faststart", str(pending_clip)])
        probe = json.loads(command(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-show_chapters", "-of", "json", str(pending_clip)]))
        streams = probe.get("streams", [])
        require(not any(stream["codec_type"] == "audio" for stream in streams), "Unexpected audio stream in silent export")
        video = next(stream for stream in streams if stream["codec_type"] == "video")
        packets = json.loads(command(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time", "-of", "json", str(pending_clip)]))["packets"]
        actual_pts = sorted(round(float(packet["pts_time"]) * 1000) for packet in packets)
        require(len(actual_pts) == len(expected_pts), "Encoder added or omitted source frames")
        max_error = max(abs(a - b) for a, b in zip(actual_pts, expected_pts))
        require(max_error <= 1, f"Encoder changed sample timing by {max_error} ms")
        duration_ms = round(float(video.get("duration", probe["format"]["duration"])) * 1000)
        require(abs(duration_ms - offset) <= 2, f"Encoded duration {duration_ms} ms differs from recorded sample timeline {offset} ms (last PTS {actual_pts[-1]} ms)")
        summary["verification"] = {"videoPackets": len(actual_pts), "maxTimestampErrorMs": max_error, "encodedDurationMs": duration_ms,
                                   "width": video["width"], "height": video["height"], "timeBase": video["time_base"],
                                   "chapterCount": len(probe.get("chapters", [])), "audioStreamCount": 0,
                                   "nominalContainerRateIsNotCaptureRate": video.get("r_frame_rate"),
                                   "averageContainerRate": video.get("avg_frame_rate")}
        require(summary["verification"]["chapterCount"] == len(segments), "Segment chapter markers are missing")
        summary["clipSha256"] = sha256(pending_clip)
        summary["clipBytes"] = pending_clip.stat().st_size
        pending_summary = temporary / "summary.json"
        pending_summary.write_text(json.dumps(summary, indent=2) + "\n")
        pending_clip.rename(clip)
        pending_summary.rename(summary_path)
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("game_directories", nargs="+", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--gap-threshold-ms", type=int, default=2000, help="Minimum gap threshold for inferring timestamp-list segment boundaries; explicit segments retain their timing")
    parser.add_argument("--inspect", action="store_true", help="Validate and summarize inputs without encoding or writing exports")
    args = parser.parse_args()
    require(args.gap_threshold_ms >= 1000, "Gap threshold must be at least one second")
    for game in args.game_directories:
        summary = assemble(game, args.output_dir.resolve(), args.gap_threshold_ms, args.inspect)
        print(json.dumps({"game": game.name, "inspectOnly": args.inspect, "frames": summary["sourceFrameCount"], "segments": len(summary["segments"]),
                          "actualSampleSpanSeconds": summary["sampledFrameSpanMs"] / 1000, "sampledRateHz": summary["sampledRateHzAcrossRecordedSegments"],
                          "audioCaptured": False, "completeReferenceCapture": False, "clip": None if args.inspect else summary["clip"],
                          "summary": None if args.inspect else str(args.output_dir.resolve() / (Path(summary["clip"]).stem + ".summary.json")),
                          "verification": summary.get("verification")}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError, KeyError, json.JSONDecodeError) as error:
        raise SystemExit(f"Sampled export stopped: {error}") from error
