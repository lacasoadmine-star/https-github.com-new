"""Build evidence-backed presentation indexes from already acquired local media.

No network requests, provider executable code, inferred reel counts or ready flags.
Run --self-test for path/hash/frame validation checks. Regenerate after acquisition.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import math
from pathlib import Path
import re
import tempfile
import unittest
from urllib.parse import quote, unquote, urljoin, urlsplit

PACKAGE = Path(__file__).resolve().parents[1]
REPO = PACKAGE.parents[2]
REPORT = REPO / "reports/special74"
ROLE_NAMES = ("backgrounds", "symbols", "controls", "sounds", "fonts", "animations", "videos")
EVIDENCE_ROOTS = ("fresh-observations", "ci-observations", "reference-sessions", "batch-observations", "missing-media-recovery")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def asset_id(sha256):
    return "sha256:" + sha256


def encoded_url(source):
    parsed = urlsplit(source)
    return parsed._replace(path=quote(parsed.path, safe="/%:@!$&'()*+,;=-._~")).geturl()


def validate_local_asset(record, package=PACKAGE):
    relative = record["path"]
    if not isinstance(relative, str) or not relative.startswith("assets/"):
        raise ValueError("Presentation asset must be inside assets/")
    path = (package / relative).resolve()
    if not path.is_relative_to((package / "assets").resolve()) or path == (package / "assets").resolve():
        raise ValueError("Asset path escapes the package")
    if not re.fullmatch(r"[a-f0-9]{64}", record.get("sha256", "")):
        raise ValueError("Invalid SHA-256 pin")
    if not isinstance(record.get("bytes"), int) or record["bytes"] <= 0:
        raise ValueError("Invalid byte-size pin")
    if path.stat().st_size != record["bytes"]:
        raise ValueError("Asset byte size does not match its pin")
    sha = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            sha.update(chunk)
    if sha.hexdigest() != record["sha256"]:
        raise ValueError("Asset SHA-256 does not match its pin")
    return path


def number(value, positive=False):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value) and (value > 0 if positive else value >= 0)


def validate_frame(frame, image_size, transparent_padding=False):
    if transparent_padding and not empty_padding_candidate(frame):
        raise ValueError("Unsupported transparent padding geometry")
    rect = frame.get("frame")
    if not isinstance(rect, dict) or not all(number(rect.get(k), k in ("w", "h")) for k in ("x", "y", "w", "h")):
        raise ValueError("Invalid atlas frame rectangle")
    if frame.get("rotated") is not None and not isinstance(frame["rotated"], bool):
        raise ValueError("Unsupported atlas rotation metadata")
    # Provider TexturePacker records logical w/h even for packed rotations.
    # The occupied pixels have swapped dimensions; retain both exact forms.
    packed = {"x": rect["x"], "y": rect["y"], "w": rect["h"] if frame.get("rotated") else rect["w"], "h": rect["w"] if frame.get("rotated") else rect["h"]}
    if packed["x"] + packed["w"] > image_size[0] or packed["y"] + packed["h"] > image_size[1]:
        raise ValueError("Atlas frame extends outside the verified image")
    source_size, trim = frame.get("sourceSize"), frame.get("spriteSourceSize")
    if source_size is not None and (not isinstance(source_size, dict) or not all(number(source_size.get(k), True) for k in ("w", "h"))):
        raise ValueError("Invalid source-size metadata")
    if trim is not None:
        if not isinstance(trim, dict) or not all(number(trim.get(k), k in ("w", "h")) for k in ("x", "y", "w", "h")):
            raise ValueError("Invalid sprite trim metadata")
        if source_size and (trim["x"] + trim["w"] > source_size["w"] or trim["y"] + trim["h"] > source_size["h"]) and not transparent_padding:
            raise ValueError("Sprite trim extends outside the declared source size")
    return {**{key: frame[key] for key in ("frame", "rotated", "trimmed", "spriteSourceSize", "sourceSize", "pivot") if key in frame}, "packedFrame": packed,
            **({"transparentProviderPaddingVerified": True} if transparent_padding else {})}


def empty_padding_candidate(frame):
    return (frame.get("sourceSize") == {"w": 1, "h": 1}
            and frame.get("spriteSourceSize") == {"x": 0, "y": 0, "w": 3, "h": 3}
            and frame.get("frame", {}).get("w") == 3 and frame.get("frame", {}).get("h") == 3)


def verified_empty_padding(frame, alpha):
    if not empty_padding_candidate(frame):
        return False
    r = frame["frame"]
    return (r["x"] >= 0 and r["y"] >= 0 and r["x"] + 3 <= alpha.width and r["y"] + 3 <= alpha.height
            and alpha.crop((r["x"], r["y"], r["x"] + 3, r["y"] + 3)).getbbox() is None)


def classify_role(name, mime):
    """Role hints describe original paths/names; they do not prove game semantics."""
    if mime.startswith("audio/"):
        return {"sounds"}
    if mime.startswith("font/"):
        return {"fonts"}
    if mime.startswith("video/"):
        return {"videos"}
    if not mime.startswith("image/"):
        return set()
    path = unquote(name).replace("\\", "/")
    roles = set()
    if re.search(r"background|(?:^|[/_-])bg(?:$|[._/-])", path, re.I):
        roles.add("backgrounds")
    if re.search(r"(?:^|/)(?:Box|Symbols?|Reels?)/(?:Blur/)?(?:[0-9]+|[A-Za-z][A-Za-z0-9 _-]*)$", Path(path).with_suffix("").as_posix(), re.I):
        if not re.search(r"/(?:Background\w*|Info\w*|Line\w*|Mask|Border|Frame|Light|Blur)$", Path(path).with_suffix("").as_posix(), re.I):
            roles.add("symbols")
    if re.search(r"(?:^|/)(?:Buttons?|Controls|Bets|BetContainer|AutoPlay|QuickPlay|Menu|BuyBonus|BuyFeature|Settings|History|Double)(?:/|$)|button|(?:^|[/_-])(?:spin|play|bet|minus|plus|close|exit|menu|sound)(?:$|[/_.-])", path, re.I):
        roles.add("controls")
    return roles


def read_image_size(path, record, integrity):
    cached = integrity.get(record["sha256"])
    if cached and cached.get("verified") and number(cached.get("width"), True) and number(cached.get("height"), True):
        return [cached["width"], cached["height"]]
    if record.get("mime", "").startswith("image/") and record.get("mime") != "image/svg+xml":
        try:
            from PIL import Image
            with Image.open(path) as image:
                return [image.width, image.height]
        except (ImportError, OSError, ValueError):
            return None
    return None


def walk(value, pointer=""):
    if isinstance(value, dict):
        yield value, pointer
        for key, child in value.items():
            if isinstance(child, (dict, list)):
                yield from walk(child, pointer + "/" + str(key).replace("~", "~0").replace("/", "~1"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, pointer + "/" + str(index))


def evidence_index(game_ids, source_index):
    result = {game_id: {"screenshots": [], "sceneFiles": [], "viewportCandidates": [], "canvasCandidates": [], "explicitGridEvidence": [], "controlBounds": [], "texturePlacementSamples": [], "texturePlacementSampleLimit": 128} for game_id in game_ids}
    seen = {game_id: defaultdict(set) for game_id in game_ids}
    for name in EVIDENCE_ROOTS:
        directory = REPORT / name
        if not directory.exists():
            continue
        for file in sorted(directory.rglob("*")):
            selected = [part for part in file.parts if part in game_ids]
            if not selected or not file.is_file():
                continue
            game_id, relative = selected[-1], file.relative_to(REPO).as_posix()
            target = result[game_id]
            if file.suffix.lower() == ".png":
                target["screenshots"].append(relative)
                continue
            if file.suffix.lower() != ".json" or file.name == "observed-media-urls.json":
                continue
            try:
                data = json.loads(file.read_text())
            except (ValueError, UnicodeError):
                continue
            snapshot = isinstance(data, dict) and isinstance(data.get("frames"), list) and any(isinstance(frame, dict) and isinstance(frame.get("scene"), dict) for frame in data["frames"])
            if "scene" in file.stem or snapshot:
                target["sceneFiles"].append(relative)
            for obj, pointer in walk(data):
                viewport = obj.get("viewport")
                if isinstance(viewport, dict) and all(number(viewport.get(k), True) for k in ("width", "height")):
                    value = {k: viewport[k] for k in ("width", "height", "dpr", "deviceScaleFactor") if k in viewport}
                    key = canonical(value)
                    if key not in seen[game_id]["viewportCandidates"]:
                        target["viewportCandidates"].append({"value": value, "evidence": relative, "pointer": pointer + "/viewport"})
                        seen[game_id]["viewportCandidates"].add(key)
                if isinstance(obj.get("canvases"), list):
                    for index, canvas in enumerate(obj["canvases"]):
                        if not isinstance(canvas, dict) or not all(number(canvas.get(k), True) for k in ("width", "height")):
                            continue
                        value = {k: canvas[k] for k in ("width", "height", "resolution", "displayWidth") if k in canvas}
                        if isinstance(canvas.get("canvas"), dict):
                            value["displayBounds"] = canvas["canvas"]
                        key = canonical(value)
                        if key not in seen[game_id]["canvasCandidates"]:
                            target["canvasCandidates"].append({"value": value, "evidence": relative, "pointer": pointer + "/canvases/" + str(index), "note": "Captured canvas dimensions; a canvas allocation does not prove loaded gameplay."})
                            seen[game_id]["canvasCandidates"].add(key)
                for grid_name in ("visibleGrid", "observedGrid", "reelGrid"):
                    grid = obj.get(grid_name)
                    if isinstance(grid, dict) and all(isinstance(grid.get(k), int) and not isinstance(grid[k], bool) and grid[k] > 0 for k in ("columns", "rows")):
                        key = canonical(grid)
                        if key not in seen[game_id]["explicitGridEvidence"]:
                            target["explicitGridEvidence"].append({"value": grid, "evidence": relative, "pointer": pointer + "/" + grid_name, "basis": "Explicitly recorded grid; no count inferred from hidden scene nodes or artwork."})
                            seen[game_id]["explicitGridEvidence"].add(key)
                control = obj.get("target")
                if isinstance(control, dict) and isinstance(control.get("bounds"), dict) and obj.get("attempted") is True:
                    value = {k: control[k] for k in ("kind", "source", "labels", "text", "path", "bounds") if k in control}
                    value["action"] = obj.get("name")
                    key = canonical(value)
                    if key not in seen[game_id]["controlBounds"]:
                        target["controlBounds"].append({**value, "evidence": relative, "pointer": pointer + "/target", "effectVerified": obj.get("effectVerified") is True, "note": "Captured target bounds; behavior is verified only when effectVerified is true."})
                        seen[game_id]["controlBounds"].add(key)
                texture = obj.get("texture")
                if isinstance(texture, dict) and isinstance(texture.get("names"), list) and isinstance(obj.get("bounds"), dict):
                    asset = source_index.get(texture.get("source"))
                    labels = [label for label in texture["names"] if isinstance(label, str) and classify_role(label, "image/atlas-frame")]
                    key = canonical([asset["assetId"] if asset else None, labels, texture.get("frame")])
                    if asset and labels and key not in seen[game_id]["texturePlacementSamples"] and len(target["texturePlacementSamples"]) < 128:
                        target["texturePlacementSamples"].append({"assetId": asset["assetId"], "textureNames": labels, "frame": texture.get("frame"),
                            "bounds": obj["bounds"], "worldTransform": obj.get("world"), "scale": obj.get("scale"), "alpha": obj.get("alpha"),
                            "evidence": relative, "pointer": pointer, "note": "Recorded scene-node sample only; ancestor visibility, state and repeated reel placements are not inferred. Full scene file is retained."})
                        seen[game_id]["texturePlacementSamples"].add(key)
    return result


def build_profiles():
    manifest_bytes = (REPORT / "all74-media-manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    status = json.loads((REPORT / "all74-media-status.json").read_text())
    if (manifest.get("unverifiedPins") or status.get("pendingMedia") != 0 or status.get("updatedAt") != manifest.get("updatedAt")
            or status.get("verifiedMedia") != len(manifest["assets"])):
        raise ValueError("Media acquisition is not frozen; regenerate after pendingMedia=0 and unverifiedPins=0.")
    entries = json.loads((REPORT / "selected-games.json").read_text())["entries"]
    game_ids = {entry["id"] for entry in entries}
    integrity_file = REPORT / "all74-media-integrity.json"
    integrity = {a["sha256"]: a for a in json.loads(integrity_file.read_text()).get("files", [])} if integrity_file.exists() else {}
    valid, issues, assets, source_index = [], [], {}, {}

    def verify(record):
        try:
            return record, validate_local_asset(record), None
        except (KeyError, ValueError, OSError) as error:
            return record, None, str(error)

    with ThreadPoolExecutor(max_workers=4) as pool:
        for record, path, error in pool.map(verify, manifest["assets"]):
            if error:
                issues.append({"source": record.get("source"), "path": record.get("path"), "gameIds": record.get("gameIds", []), "error": error})
                continue
            aid = asset_id(record["sha256"])
            size = read_image_size(path, record, integrity)
            if aid not in assets:
                assets[aid] = {"id": aid, "sha256": record["sha256"], "bytes": record["bytes"], "mime": record.get("mime", "application/octet-stream"), "path": record["path"], "sourceAliases": [], "dimensions": size}
            assets[aid]["sourceAliases"].append(record["source"])
            source_index[record["source"]] = {**record, "assetId": aid, "resolvedPath": path, "dimensions": size}
            valid.append(source_index[record["source"]])

    roles = {gid: {role: {} for role in ROLE_NAMES} for gid in game_ids}
    atlas_ids = defaultdict(set)
    asset_ids = defaultdict(set)
    atlases, animation_descriptors, descriptors = {}, {}, {}
    frame_issues = []

    def add_role(gids, role, reference):
        for gid in set(gids) & game_ids:
            roles[gid][role][canonical(reference)] = reference

    for record in valid:
        gids, aid, source, mime = record.get("gameIds", []), record["assetId"], record["source"], record.get("mime", "")
        for gid in set(gids) & game_ids:
            asset_ids[gid].add(aid)
        for role in classify_role(urlsplit(source).path, mime):
            add_role(gids, role, {"type": "file", "assetId": aid, "label": unquote(Path(urlsplit(source).path).name), "basis": "original-source-path-and-media-type"})
        if mime == "text/plain" and source.lower().endswith((".atlas.txt", ".atlas")):
            add_role(gids, "animations", {"type": "spine-atlas", "assetId": aid, "basis": "observed-texture-atlas-file"})
        if source.lower().endswith(".skel"):
            animation_descriptors[aid] = {"assetId": aid, "kind": "spine-binary", "basis": "original-binary-header-and-hash-validated",
                                        "poseDecodingVerified": False, "playbackTiming": "Not inferred; runtime time scales need captured behavior."}
            add_role(gids, "animations", {"type": "spine-binary-skeleton", "assetId": aid, "basis": "original-binary-header-and-hash-validated"})
        if mime == "text/css":
            css = re.sub(r"/\*.*?\*/", "", record["resolvedPath"].read_text(), flags=re.S)
            for declaration in re.finditer(r"(?i)(?:^|[;{])\s*(background(?:-image)?)\s*:\s*([^;}]+)", css):
                for match in re.finditer(r"(?i)url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)", declaration[2]):
                    texture = source_index.get(encoded_url(urljoin(source, match[1].strip())))
                    if texture and texture.get("mime", "").startswith("image/"):
                        add_role(gids, "backgrounds", {"type": "file", "assetId": texture["assetId"], "stylesheetAssetId": aid,
                            "basis": "explicit-observed-CSS-background-url", "declaration": declaration[1],
                            "note": "Background of the declared CSS element; not assumed to be the main game backdrop."})
        if mime != "application/json":
            continue
        if aid not in descriptors:
            data = json.loads(record["resolvedPath"].read_text(encoding="utf-8-sig"))
            if isinstance(data, dict) and isinstance(data.get("frames"), dict):
                descriptors[aid] = {"kind": "sprite-atlas", "meta": data.get("meta", {}), "frames": data["frames"]}
            elif isinstance(data, dict) and isinstance(data.get("bones"), list) and isinstance(data.get("animations"), dict):
                descriptors[aid] = {"kind": "spine", "spineVersion": data.get("skeleton", {}).get("spine"), "animationNames": sorted(data["animations"]), "boneCount": len(data["bones"])}
            else:
                descriptors[aid] = {"kind": "unclassified-json"}
        descriptor = descriptors[aid]
        if descriptor["kind"] == "spine":
            animation_descriptors[aid] = {"assetId": aid, **descriptor, "playbackTiming": "Not inferred; runtime time scales need captured behavior."}
            add_role(gids, "animations", {"type": "spine-skeleton", "assetId": aid, "basis": "parsed-bones-and-animation-timelines"})
            if re.search(r"/Spine/(?:Box|Symbols?)/", source, re.I):
                add_role(gids, "symbols", {"type": "animated-symbol-descriptor", "assetId": aid, "basis": "original-Spine/Box-or-Symbol-source-path"})
            continue
        if descriptor["kind"] != "sprite-atlas":
            continue
        meta = descriptor["meta"]
        image_name = meta.get("image") if isinstance(meta, dict) else None
        image_source = encoded_url(urljoin(source, image_name)) if isinstance(image_name, str) else None
        image = source_index.get(image_source)
        identity = {"descriptor": aid, "image": image["assetId"] if image else image_source}
        atlas_id = "atlas:" + digest(canonical(identity).encode())
        if atlas_id not in atlases:
            atlas = {"id": atlas_id, "descriptorAssetId": aid, "imageAssetId": image["assetId"] if image else None,
                     "imageSource": image_source, "sourceAliases": [], "frames": {}, "usable": False, "issues": []}
            size = image.get("dimensions") if image else None
            if not image:
                atlas["issues"].append("Declared image is absent from verified local media; no alternate URL guessed.")
            elif not size:
                atlas["issues"].append("No directly measured image dimensions available.")
            else:
                declared = meta.get("size")
                if isinstance(declared, dict) and [declared.get("w"), declared.get("h")] != size:
                    atlas["issues"].append("Declared atlas dimensions differ from verified image dimensions.")
                atlas["imageSize"] = size
                alpha = None
                for name, frame in descriptor["frames"].items():
                    try:
                        if not isinstance(frame, dict):
                            raise ValueError("Atlas frame is not an object")
                        atlas["frames"][name] = validate_frame(frame, size)
                    except ValueError as error:
                        # TexturePacker pads an intentionally empty 1x1 sprite
                        # to transparent 3x3 pixels. Preserve that original frame
                        # only after checking the actual verified image pixels.
                        if str(error) == "Sprite trim extends outside the declared source size" and empty_padding_candidate(frame):
                            if alpha is None:
                                from PIL import Image
                                with Image.open(image["resolvedPath"]) as original:
                                    alpha = original.convert("RGBA").getchannel("A")
                            if verified_empty_padding(frame, alpha):
                                atlas["frames"][name] = validate_frame(frame, size, transparent_padding=True)
                                continue
                        frame_issues.append({"atlasId": atlas_id, "frame": name, "error": str(error)})
                atlas["usable"] = not atlas["issues"] and len(atlas["frames"]) == len(descriptor["frames"])
            atlases[atlas_id] = atlas
        atlas = atlases[atlas_id]
        atlas["sourceAliases"].append(source)
        for gid in set(gids) & game_ids:
            atlas_ids[gid].add(atlas_id)
        if not atlas["usable"]:
            continue
        for name in atlas["frames"]:
            for role in classify_role(name, "image/atlas-frame"):
                add_role(gids, role, {"type": "atlas-frame", "atlasId": atlas_id, "frameName": name, "basis": "exact-original-frame-name; validated-image-and-frame-bounds"})
        if re.search(r"/Sprite/", source) and len(atlas["frames"]) > 1:
            add_role(gids, "animations", {"type": "sprite-sheet", "atlasId": atlas_id, "basis": "observed-Sprite-path-with-multiple-declared-frames", "playbackTiming": "Not inferred"})

    evidence = evidence_index(game_ids, source_index)
    profiles = []
    for entry in sorted(entries, key=lambda item: item["selectedName"].casefold()):
        gid = entry["id"]
        role_map = {role: sorted(values.values(), key=canonical) for role, values in roles[gid].items()}
        missing = [{"role": role, "reason": "No verified local file/frame classified from observed names or metadata. This does not prove the game needs or lacks this media type."} for role, refs in role_map.items() if not refs]
        if not evidence[gid]["explicitGridEvidence"]:
            missing.append({"role": "reelGeometry", "reason": "No explicitly recorded visible grid; no rows/columns inferred from artwork, category, or hidden scene nodes."})
        profiles.append({"id": gid, "title": entry["selectedName"], "category": entry["selectedCategory"], "officialPage": entry["officialIdentity"]["url"],
                         "assetIds": sorted(asset_ids[gid]), "atlasIds": sorted(atlas_ids[gid]), "roles": role_map, "missingRoles": missing,
                         "referenceArtifacts": {"screenshots": evidence[gid].pop("screenshots"), "scenes": evidence[gid].pop("sceneFiles")},
                         "capturedGeometry": evidence[gid],
                         "unavailableObservedSources": [f for f in manifest.get("failures", []) if gid in f.get("gameIds", [])],
                         "invalidLocalAssets": [issue for issue in issues if gid in issue.get("gameIds", [])],
                         "assessment": "Presentation evidence index only; playable implementation, feature coverage and visual parity are not assessed."})
    for asset in assets.values():
        asset["sourceAliases"] = sorted(set(asset["sourceAliases"]))
    for atlas in atlases.values():
        atlas["sourceAliases"] = sorted(set(atlas["sourceAliases"]))
    result = {"schemaVersion": 1, "sourceManifestSha256": digest(manifest_bytes), "sourceManifestUpdatedAt": manifest.get("updatedAt"),
              "scope": "Typed local presentation data and explicitly captured geometry for all selected titles. Path-based roles are hints, not proof of feature semantics. No provider runtime exported and no readiness claimed.",
              "runtimeContract": {"assetReference": "sha256:<full content digest>", "atlasReference": "atlas:<digest of descriptor and resolved image identity>",
                                  "localPathRoot": "workers/superwin-player/special74/", "frameLookup": "atlases[atlasId].frames[frameName]",
                                  "remoteRuntimeRequired": False, "note": "Source URLs are provenance only. Load local asset paths after packaging; no live URL is asserted by this report."},
              "summary": {"games": len(profiles), "sourceRecordsVerified": len(valid), "uniqueContentAssets": len(assets), "usableAtlases": sum(a["usable"] for a in atlases.values()),
                          "atlasFrames": sum(len(a["frames"]) for a in atlases.values() if a["usable"]), "spineDescriptors": len(animation_descriptors),
                          "invalidLocalAssets": len(issues), "invalidFrames": len(frame_issues), "gamesWithExplicitGrid": sum(bool(p["capturedGeometry"]["explicitGridEvidence"]) for p in profiles),
                          "roleCoverage": {role: sum(bool(p["roles"][role]) for p in profiles) for role in ROLE_NAMES}},
              "assets": dict(sorted(assets.items())), "atlases": dict(sorted(atlases.items())), "animationDescriptors": dict(sorted(animation_descriptors.items())),
              "invalidFrames": frame_issues, "profiles": profiles}
    output = REPORT / "presentation-profiles.json"
    temporary = output.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")
    temporary.replace(output)
    print(json.dumps({**result["summary"], "output": str(output.relative_to(REPO)), "outputBytes": output.stat().st_size, "sourceManifestSha256": result["sourceManifestSha256"]}))
    return result


class ValidationTests(unittest.TestCase):
    def test_path_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory)
            with self.assertRaises(ValueError):
                validate_local_asset({"path": "assets/../../outside", "sha256": "a" * 64, "bytes": 1}, package)

    def test_changed_asset_cannot_keep_a_valid_pin(self):
        with tempfile.TemporaryDirectory() as directory:
            package = Path(directory)
            (package / "assets").mkdir()
            target = package / "assets/data.json"
            target.write_bytes(b"{}")
            record = {"path": "assets/data.json", "sha256": digest(b"{}"), "bytes": 2}
            self.assertEqual(validate_local_asset(record, package), target)
            target.write_bytes(b"[]")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                validate_local_asset(record, package)

    def test_frame_bounds_and_trim_are_validated(self):
        valid = {"frame": {"x": 2, "y": 3, "w": 4, "h": 5}, "rotated": False,
                 "sourceSize": {"w": 8, "h": 9}, "spriteSourceSize": {"x": 1, "y": 2, "w": 4, "h": 5}}
        self.assertEqual(validate_frame(valid, [10, 10])["frame"], valid["frame"])
        with self.assertRaisesRegex(ValueError, "outside"):
            validate_frame(valid, [5, 5])
        invalid = {**valid, "spriteSourceSize": {"x": 7, "y": 8, "w": 4, "h": 5}}
        with self.assertRaisesRegex(ValueError, "trim"):
            validate_frame(invalid, [10, 10])

    def test_provider_rotated_frame_uses_swapped_packed_bounds(self):
        rotated = {"frame": {"x": 588, "y": 163, "w": 79, "h": 56}, "rotated": True,
                   "sourceSize": {"w": 100, "h": 100}, "spriteSourceSize": {"x": 11, "y": 44, "w": 79, "h": 56}}
        self.assertEqual(validate_frame(rotated, [651, 255])["packedFrame"], {"x": 588, "y": 163, "w": 56, "h": 79})
        with self.assertRaisesRegex(ValueError, "outside"):
            validate_frame({**rotated, "rotated": False}, [651, 255])

    def test_empty_provider_padding_requires_transparent_original_pixels(self):
        from PIL import Image
        frame = {"frame": {"x": 1, "y": 2, "w": 3, "h": 3}, "sourceSize": {"w": 1, "h": 1},
                 "spriteSourceSize": {"x": 0, "y": 0, "w": 3, "h": 3}}
        alpha = Image.new("L", (8, 8), 0)
        self.assertTrue(verified_empty_padding(frame, alpha))
        self.assertTrue(validate_frame(frame, [8, 8], transparent_padding=True)["transparentProviderPaddingVerified"])
        alpha.putpixel((2, 3), 255)
        self.assertFalse(verified_empty_padding(frame, alpha))
        with self.assertRaisesRegex(ValueError, "trim"):
            validate_frame(frame, [8, 8])

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    options = parser.parse_args()
    if options.self_test:
        outcome = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ValidationTests))
        raise SystemExit(0 if outcome.wasSuccessful() else 1)
    build_profiles()
