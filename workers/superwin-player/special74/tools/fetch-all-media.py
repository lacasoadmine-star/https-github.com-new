"""Resume acquisition of observed public presentation media for the complete catalogue.

Only archived resource observations and explicit texture references in downloaded
atlases are inputs. No executable runtime, account data or financial API is copied.
The manifest records acquisition, never gameplay or implementation completion.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import math
import struct
import xml.etree.ElementTree as ET
from urllib.parse import parse_qsl, quote, unquote, urljoin, urlsplit

PACKAGE = Path(__file__).resolve().parents[1]
REPO = PACKAGE.parents[2]
REPORT = REPO / "reports/special74"
EXTENSIONS = (".atlas.txt", ".atlas", ".skel", ".svg", ".css", ".png", ".webp", ".jpg", ".jpeg", ".gif", ".mp3", ".ogg", ".wav", ".mp4", ".webm", ".otf", ".ttf", ".woff", ".woff2", ".json")
HOSTS = {"static.ssg-public.com"}
MAX_BYTES = 64 * 1024 * 1024


def now():
    return datetime.now(timezone.utc).isoformat()


def extension(url):
    path = urlsplit(url).path.lower()
    return next((suffix for suffix in EXTENSIONS if path.endswith(suffix)), None)


def encoded_url(source):
    url = urlsplit(source)
    return url._replace(path=quote(url.path, safe="/%:@!$&'()*+,;=-._~")).geturl()


def validate_source(source):
    url = urlsplit(source)
    decoded = unquote(url.path)
    approved_host = url.hostname in HOSTS or bool(re.fullmatch(r"eu-server(?:-w[0-9]+)?\.ssgportal\.com", url.hostname or ""))
    if (url.scheme != "https" or not approved_host or url.port not in (None, 443)
            or url.username or url.password or url.fragment or not extension(source)
            or "/Content/" not in decoded or any(p in ("..", ".") for p in decoded.split("/"))
            or "\\" in decoded or "%" in decoded or "\x00" in decoded
            or any(re.search(r"token|session|authorization|password|secret", key, re.I)
                   for key, _ in parse_qsl(url.query))):
        raise ValueError("Source is not approved public presentation media")
    return source


def local_path(source, package=PACKAGE):
    validate_source(source)
    url = urlsplit(source)
    relative = Path("assets/observed") / url.hostname / unquote(url.path).lstrip("/")
    if url.query:
        relative = relative.with_name(relative.stem + "-" + hashlib.sha256(url.query.encode()).hexdigest()[:16] + relative.suffix)
    target = (package / relative).resolve()
    if not target.is_relative_to((package / "assets/observed").resolve()):
        raise ValueError("Media path escapes the asset directory")
    return target


def validate_content(source, data):
    if not data or len(data) > MAX_BYTES:
        raise ValueError("Empty or oversized media")
    kind = extension(source)
    signatures = {
        ".png": data.startswith(b"\x89PNG\r\n\x1a\n"),
        ".webp": data[:4] == b"RIFF" and data[8:12] == b"WEBP",
        ".jpg": data.startswith(b"\xff\xd8\xff"),
        ".jpeg": data.startswith(b"\xff\xd8\xff"),
        ".gif": data[:6] in (b"GIF87a", b"GIF89a"),
        ".mp3": data.startswith(b"ID3") or (len(data) > 1 and data[0] == 255 and data[1] & 224 == 224),
        ".ogg": data.startswith(b"OggS"),
        ".wav": data[:4] == b"RIFF" and data[8:12] == b"WAVE",
        ".mp4": data[4:8] == b"ftyp",
        ".webm": data.startswith(b"\x1aE\xdf\xa3"),
        ".otf": data.startswith(b"OTTO"),
        ".ttf": data.startswith((b"\x00\x01\x00\x00", b"true")),
        ".woff": data.startswith(b"wOFF"),
        ".woff2": data.startswith(b"wOF2"),
    }
    if kind == ".json":
        if not isinstance(json.loads(data.decode("utf-8-sig")), (dict, list)):
            raise ValueError("Presentation JSON is not structured data")
        return "application/json"
    elif kind in (".atlas.txt", ".atlas"):
        text = data.decode("utf-8-sig")
        if not re.search(r"(?m)^\S[^\r\n]*\.(?:png|webp|jpe?g)\s*$", text) or not re.search(r"(?m)^\s*(?:size|filter|format):", text):
            raise ValueError("Invalid texture atlas")
        return "text/plain"
    elif kind == ".css":
        text = data.decode("utf-8-sig")
        clean = re.sub(r"/\*[\s\S]*?\*/", "", text).strip()
        if not clean:
            return "text/css"  # Some official per-title stylesheets are BOM-only.
        if ("\x00" in clean or re.search(r"<\s*(?:!doctype|html|script)|javascript\s*:|expression\s*\(|(?:^|[;{])\s*(?:behavior|-moz-binding)\s*:", clean, re.I)
                or not re.match(r"[.#:@a-zA-Z*\[]", clean) or not re.search(r"\{[^{}]*:[^{}]*\}", clean)):
            raise ValueError("Invalid passive presentation stylesheet")
        # Preserved for reference only. Runtime packages must explicitly select
        # styles and remap every dependency to local verified media.
        return "text/css"
    elif kind == ".svg":
        text = data.decode("utf-8-sig")
        if re.search(r"<!\s*(?:DOCTYPE|ENTITY)", text, re.I):
            raise ValueError("SVG document declarations are not passive artwork")
        try:
            root = ET.fromstring(text)
        except ET.ParseError as error:
            raise ValueError("Invalid SVG artwork") from error
        if root.tag not in ("svg", "{http://www.w3.org/2000/svg}svg"):
            raise ValueError("Not an SVG document")
        for node in root.iter():
            tag = node.tag.rsplit("}", 1)[-1].lower()
            if tag in {"script", "foreignobject", "iframe", "object", "embed", "handler", "a"}:
                raise ValueError("SVG contains active content")
            for key, value in node.attrib.items():
                key = key.rsplit("}", 1)[-1].lower()
                if key.startswith("on") or key == "href" and not value.startswith("#"):
                    raise ValueError("SVG contains active or external attributes")
            css = " ".join(node.attrib.values()) + " " + (node.text or "")
            if re.search(r"@import|javascript\s*:|expression\s*\(|\\[0-9a-f]{1,6}", css, re.I):
                raise ValueError("SVG contains active styling")
            for target in re.findall(r"url\s*\(\s*([^)]*)\)", css, re.I):
                if not target.strip(" \t\r\n\"'").startswith("#"):
                    raise ValueError("SVG references external resources")
        return "image/svg+xml"
    elif kind == ".skel":
        # Spine animation data has no universal magic bytes. Validate the
        # documented version/header structure; this is not a full pose decode.
        def string_at(offset):
            length, shift = 0, 0
            for _ in range(5):
                if offset >= len(data):
                    raise ValueError("Truncated Spine header")
                byte = data[offset]
                offset += 1
                length |= (byte & 127) << shift
                if not byte & 128:
                    break
                shift += 7
            else:
                raise ValueError("Invalid Spine string length")
            if length < 1 or length > 512 or offset + length - 1 > len(data):
                raise ValueError("Invalid Spine header string")
            return data[offset:offset + length - 1].decode("utf-8"), offset + length - 1
        valid = False
        # 4.x stores an eight-byte hash; older versions store a string hash.
        for offset, modern in ((8, True), (0, False)):
            try:
                if not modern:
                    _, offset = string_at(offset)
                version, end = string_at(offset)
                if not re.fullmatch(r"(?:3\.[6-9]|4\.[0-3])\.\d{1,3}", version):
                    continue
                values = struct.unpack(">ffff", data[end:end + 16])
                valid = all(math.isfinite(v) for v in values) and values[2] >= 0 and values[3] >= 0 and len(data) > end + 16
                if valid:
                    break
            except (ValueError, UnicodeError, struct.error):
                continue
        if not valid:
            raise ValueError("Invalid Spine binary animation header")
        return "application/octet-stream"
    else:
        # Some original provider .webp URLs contain PNG bytes. Preserve the exact
        # bytes and record their detected MIME instead of discarding valid artwork.
        image_types = {".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif"}
        audio_types = {".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav"}
        font_types = {".otf": "font/otf", ".ttf": "font/ttf", ".woff": "font/woff", ".woff2": "font/woff2"}
        family = next((types for types in (image_types, audio_types, font_types) if kind in types), {})
        if family:
            for suffix, mime in family.items():
                if signatures[suffix]:
                    return mime
        elif signatures.get(kind, False):
            return {".mp4": "video/mp4", ".webm": "video/webm"}[kind]
        raise ValueError("Media signature does not match its presentation type")


def add_source(records, source, game_ids, evidence, parent=None):
    try:
        validate_source(source)
    except (ValueError, TypeError):
        return False
    record = records.setdefault(source, {"source": source, "gameIds": set(), "evidence": set(), "declaredBy": set()})
    record["gameIds"].update(game_ids)
    record["evidence"].add(evidence)
    if parent:
        record["declaredBy"].add(parent)
    return True


def collect_sources(report=REPORT, package=PACKAGE):
    entries = json.loads((report / "selected-games.json").read_text())["entries"]
    ids = {entry["id"] for entry in entries}
    records = {}
    for file in sorted(report.rglob("*.json")):
        if file.name.startswith("all74-media"):
            continue
        try:
            data = json.loads(file.read_text())
        except (ValueError, UnicodeError):
            continue
        evidence = file.relative_to(REPO).as_posix() if file.is_relative_to(REPO) else str(file)
        context = {part for part in file.parts if part in ids}

        def walk(value, game_ids, resource=False):
            if isinstance(value, dict):
                if value.get("id") in ids:
                    game_ids = game_ids | {value["id"]}
                if resource and isinstance(value.get("url"), str) and game_ids:
                    add_source(records, value["url"], game_ids, evidence)
                for key, child in value.items():
                    walk(child, game_ids, key in ("media", "mediaUrls", "resources"))
            elif isinstance(value, list):
                for child in value:
                    walk(child, game_ids, resource)
            elif resource and isinstance(value, str) and game_ids:
                add_source(records, value, game_ids, evidence)

        walk(data, context, file.name == "observed-media-urls.json")
    # Include later original fonts and media already pinned by interactive captures.
    # Assign each to games whose observed resources share its exact game directory.
    for name in ("media-manifest.json", "launcher-media-manifest.json"):
        data = json.loads((package / name).read_text())
        for pinned in data.get("assets", []):
            source = pinned["source"]
            prefix = re.match(r"(.*/Content/(?:Images|Sound)/[^/]+/)", source)
            game_ids = set(records.get(source, {}).get("gameIds", ()))
            game_ids.update(set().union(*(r["gameIds"] for u, r in records.items() if prefix and u.startswith(prefix[1]))))
            # Shared pinned fonts/menu icons have no invented per-title coverage.
            # Associate them only with sessions that actually observed that URL.
            if add_source(records, source, game_ids, str((package / name).relative_to(REPO))):
                records[source]["expectedSha256"] = pinned["sha256"]
                records[source]["expectedBytes"] = pinned["bytes"]
    return entries, records


def texture_references(source, data):
    refs = []
    if extension(source) in (".atlas.txt", ".atlas"):
        refs = re.findall(r"(?m)^(\S[^\r\n]*\.(?:png|webp|jpe?g))\s*$", data.decode("utf-8-sig"))
    elif extension(source) == ".json":
        parsed = json.loads(data.decode("utf-8-sig"))
        if isinstance(parsed, dict):
            meta = parsed.get("meta")
            if isinstance(meta, dict):
                if isinstance(meta.get("image"), str):
                    refs.append(meta["image"])
                if isinstance(meta.get("related_multi_packs"), list):
                    refs.extend(x for x in meta["related_multi_packs"] if isinstance(x, str))
    elif extension(source) == ".css":
        text = re.sub(r"/\*[\s\S]*?\*/", "", data.decode("utf-8-sig"))
        refs = [value.strip(" \t\r\n\"'") for value in re.findall(r"url\s*\(\s*([^)]*)\)", text, re.I)]
        refs.extend(re.findall(r"@import\s+[\"']([^\"']+)[\"']", text, re.I))
    return [encoded_url(urljoin(source, ref)) for ref in refs]


def acquire(record, previous=None, package=PACKAGE, attempts=3):
    source = record["source"]
    target = local_path(source, package)
    expected = record.get("expectedSha256") or (previous or {}).get("sha256")
    expected_bytes = record.get("expectedBytes") or (previous or {}).get("bytes")

    def inspect(path):
        data = path.read_bytes()
        mime = validate_content(source, data)
        digest = hashlib.sha256(data).hexdigest()
        if expected and (digest != expected or len(data) != expected_bytes):
            raise ValueError("Previously pinned original media changed")
        return data, digest, mime

    restored = False
    if target.is_file() and expected:
        try:
            data, digest, mime = inspect(target)
            return {"source": source, "path": target.relative_to(package).as_posix(), "sha256": digest, "bytes": len(data), "mime": mime, "reused": True}, texture_references(source, data)
        except (ValueError, UnicodeError):
            pass
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=target.parent, prefix=".media-", delete=False) as output:
            temporary = Path(output.name)
        command = ["curl", "--fail", "--location", "--silent", "--show-error", "--proto", "=https", "--proto-redir", "=https", "--connect-timeout", "15", "--max-time", "60", "--retry", str(attempts - 1), "--retry-delay", "1", "--max-filesize", str(MAX_BYTES), encoded_url(source), "-o", str(temporary)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            raise ValueError("Download failed: " + result.stderr.strip()[:300])
        data, digest, mime = inspect(temporary)
        temporary.replace(target)
        restored = True
    finally:
        if temporary:
            temporary.unlink(missing_ok=True)
    return {"source": source, "path": target.relative_to(package).as_posix(), "sha256": digest, "bytes": len(data), "mime": mime, "reused": not restored}, texture_references(source, data)


def shared_media(source):
    path = urlsplit(source).path
    return ("/GameLauncher/" in path or "/Fonts/" in path or "/Content/Common/" in path
            or "/Content/Images/Common/" in path
            or bool(re.search(r"/Content/Images/[^/]+$", path)))


def atomic_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    temporary.replace(path)


def load_pins(manifest):
    return {asset["source"]: asset for asset in manifest.get("unverifiedPins", []) + manifest.get("assets", [])}


def persistent_manifest(verified, previous, sources, failures, updated_at):
    # A checkpoint may occur halfway through a resumed run. Retain every older
    # hash pin even if its file has not been reverified yet; the local journal is
    # only an optimization and must not be the sole surviving copy of provenance.
    assets = [dict(asset, **{key: sorted(sources[url][key]) for key in ("gameIds", "evidence", "declaredBy")}) for url, asset in sorted(verified.items())]
    unverified = [dict(asset, verificationState="not-verified-in-this-run") for url, asset in sorted(previous.items()) if url not in verified]
    return {"schemaVersion": 2, "updatedAt": updated_at, "assets": assets,
            "unverifiedPins": unverified,
            "failures": [{"source": u, "error": error, "gameIds": sorted(sources[u]["gameIds"])} for u, error in sorted(failures.items())]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--inventory-only", action="store_true")
    parser.add_argument("--checkpoint-every", type=int, default=250,
                        help="Full manifest checkpoint interval; every successful file is still journaled immediately")
    args = parser.parse_args()
    if not 1 <= args.workers <= 16 or (args.limit is not None and args.limit < 1) or not 25 <= args.checkpoint_every <= 2000:
        parser.error("workers must be 1..16, limit must be positive, checkpoint-every must be 25..2000")
    entries, sources = collect_sources()
    manifest_file = REPORT / "all74-media-manifest.json"
    journal = PACKAGE / "test-results/all74-media-journal.jsonl"
    journal.parent.mkdir(parents=True, exist_ok=True)
    previous = {}
    if manifest_file.exists():
        previous = load_pins(json.loads(manifest_file.read_text()))
    if journal.exists():
        for line in journal.read_text().splitlines():
            try:
                asset = json.loads(line)
                previous[asset["source"]] = {**previous.get(asset["source"], {}), **asset}
            except ValueError:
                continue  # Only a partially written final journal line can be incomplete.
    recovery_file = REPORT / "archive-media-recovery.json"
    if recovery_file.exists():
        recovery = json.loads(recovery_file.read_text())
        for asset in recovery.get("entries", []):
            # Recovery must name the original public URL and exact archive evidence.
            # The normal acquisition path still validates bytes against this hash.
            complete_provenance = all(asset.get(key) for key in ("archiveKey", "archiveSha256", "memberPath", "provenanceEvidence"))
            if complete_provenance:
                game_ids = set(asset.get("gameIds", [])) & {e["id"] for e in entries}
                if game_ids:
                    add_source(sources, asset.get("source"), game_ids, "reports/special74/archive-media-recovery.json")
            if complete_provenance and asset.get("source") in sources:
                existing = previous.get(asset["source"])
                if existing and (existing["sha256"], existing["bytes"]) != (asset["sha256"], asset["bytes"]):
                    raise ValueError("Conflicting current and archived original-media pins: " + asset["source"])
                previous[asset["source"]] = dict(asset, recoveredFrom={key: asset[key] for key in ("archiveKey", "archiveSha256", "memberPath", "provenanceEvidence")})
    for source, asset in previous.items():
        if source not in sources and asset.get("declaredBy"):
            for parent in asset["declaredBy"]:
                if parent in sources:
                    add_source(sources, source, sources[parent]["gameIds"], "declared-texture-reference", parent)
        if source not in sources:
            # A later snapshot may omit a previously visible resource. Keep and
            # reverify its original pin rather than orphaning its downloaded bytes.
            add_source(sources, source, set(asset.get("gameIds", [])), "previously-verified-original-media-pin")
    if args.inventory_only:
        print(json.dumps({"selectedGames": len(entries), "observedMedia": len(sources), "gamesWithObservedGameMedia": sum(any(e["id"] in s["gameIds"] and not shared_media(u) for u, s in sources.items()) for e in entries)}))
        return
    verified, failures, finished = {}, {}, set()
    started_at = now()

    def checkpoint():
        rows = []
        for entry in entries:
            required = {u for u, r in sources.items() if entry["id"] in r["gameIds"]}
            ready = required & verified.keys()
            specific = {u for u in required if not shared_media(u)}
            rows.append({"id": entry["id"], "title": entry["selectedName"], "observedMedia": len(required), "observedGameMedia": len(specific), "verifiedMedia": len(ready), "verifiedGameMedia": len(specific & ready), "failedMedia": len(required & failures.keys()), "pendingMedia": len(required - finished), "verifiedBytes": sum(verified[u]["bytes"] for u in ready), "gameplayVerified": False, "implementationReady": False})
        summary = {"startedAt": started_at, "updatedAt": now(), "selectedGames": len(entries), "observedMedia": len(sources), "verifiedMedia": len(verified), "verifiedBytes": sum(a["bytes"] for a in verified.values()), "failedMedia": len(failures), "pendingMedia": len(set(sources) - finished), "gamesWithVerifiedMedia": sum(r["verifiedGameMedia"] > 0 for r in rows), "gamesWithAllObservedMedia": sum(r["observedGameMedia"] > 0 and r["observedMedia"] == r["verifiedMedia"] for r in rows), "scope": "Public media observed in archived demo sessions and explicitly declared atlas textures. Shared fonts and launcher images are excluded from game-specific coverage. Acquisition does not prove all game features were observed, gameplay parity, or release readiness.", "games": rows}
        atomic_json(manifest_file, persistent_manifest(verified, previous, sources, failures, summary["updatedAt"]))
        atomic_json(REPORT / "all74-media-status.json", summary)
        return {k: v for k, v in summary.items() if k not in ("games", "scope")}

    while True:
        queue = [r for u, r in sorted(sources.items()) if u not in finished]
        if args.limit:
            queue = queue[:max(0, args.limit - len(finished))]
        if not queue:
            break
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            tasks = {pool.submit(acquire, record, previous.get(record["source"])): record for record in queue}
            for future in as_completed(tasks):
                record = tasks[future]
                source = record["source"]
                finished.add(source)
                try:
                    asset, references = future.result()
                    if previous.get(source, {}).get("recoveredFrom"):
                        asset["recoveredFrom"] = previous[source]["recoveredFrom"]
                    verified[source] = asset
                    with journal.open("a") as output:
                        output.write(json.dumps(dict(asset, declaredBy=sorted(record["declaredBy"]))) + "\n")
                    for reference in references:
                        add_source(sources, reference, record["gameIds"], "declared-texture-reference", source)
                except Exception as error:
                    failures[source] = str(error)[:400]
                if len(finished) % args.checkpoint_every == 0:
                    print(json.dumps(checkpoint()), flush=True)
        checkpoint()
    print(json.dumps(checkpoint()), flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
