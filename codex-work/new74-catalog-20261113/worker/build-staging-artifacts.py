#!/usr/bin/env python3
"""Build reviewed connector inputs locally. This program has no network code."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import tempfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def config_snapshot(version):
    keys = ("main_module", "assets", "bindings", "cache_options", "compatibility_date",
            "containers", "exports", "limits", "package_dependencies", "placement", "usage_model")
    result = {key: version[key] for key in keys if key in version}
    result["compatibility_flags"] = sorted(version.get("compatibility_flags") or [])
    if "bindings" in result:
        result["bindings"] = sorted(result["bindings"], key=lambda item: item["name"])
    return result


def save(path, data):
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
        temp = Path(handle.name)
    temp.replace(path)


def main():
    here = Path(__file__).resolve().parent
    release = here.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=release / "build-manifest.json")
    parser.add_argument("--public-dir", type=Path, default=release / "public")
    parser.add_argument("--baseline-index", type=Path, required=True)
    parser.add_argument("--original-router", type=Path, required=True)
    parser.add_argument("--account-id", required=True)
    parser.add_argument("--expected-version", required=True)
    parser.add_argument("--expected-version-number", type=int, required=True)
    parser.add_argument("--expected-module-count", type=int, required=True)
    parser.add_argument("--expected-main-module", default="new74-entry-r1.mjs")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-f0-9]{32}", args.account_id):
        parser.error("--account-id must be a private 32-character hexadecimal identifier")
    if args.expected_module_count < 1 or args.expected_version_number < 1:
        parser.error("Expected version number and module count must be positive")
    manifest_bytes = args.manifest.read_bytes()
    manifest = json.loads(manifest_bytes)
    records = manifest["files"]
    if not isinstance(records, list):
        raise ValueError("Public manifest files must be a list")
    public = args.public_dir.resolve()
    required = {"index.html", "lobby.mjs", "lobby.css", "entry-link.mjs"}
    allowed = set()
    verified_files = []
    for record in records:
        name = record["path"]
        relative = PurePosixPath(name)
        if not isinstance(name, str) or relative.is_absolute() or ".." in relative.parts or str(relative) != name:
            raise ValueError("Invalid public path")
        if name in allowed:
            raise ValueError("Duplicate public path: " + name)
        if name not in required and not re.fullmatch(r"assets/fresh74/[a-f0-9]{64}\.jpg", name):
            raise ValueError("Public path outside release allowlist: " + name)
        source = (public / name).resolve(strict=True)
        if not source.is_relative_to(public):
            raise ValueError("Public source escapes its directory")
        data = source.read_bytes()
        sha = digest(data)
        if sha != record["sha256"] or len(data) != record["bytes"]:
            raise ValueError("Public source hash/length mismatch: " + name)
        if name.startswith("assets/") and source.stem != sha:
            raise ValueError("Poster filename is not its content hash")
        allowed.add(name)
        verified_files.append({"path": name, "bytes": len(data), "sha256": sha})
    if not required.issubset(allowed) or len(allowed) != 63:
        raise ValueError("Expected four lobby files and exactly 59 fresh poster files")
    template = (here / "new74-router.template.mjs").read_text()
    if template.count("__FRESH_PUBLIC_FILES__") != 1:
        raise ValueError("Router placeholder must appear exactly once")
    router = template.replace("__FRESH_PUBLIC_FILES__", json.dumps(sorted(allowed), separators=(",", ":"))).encode()
    save(here / "new74-router-r1.mjs", router)
    baseline_bytes = args.baseline_index.read_bytes()
    baseline = json.loads(baseline_bytes)
    metadata = baseline["metadata"]
    if metadata["id"] != args.expected_version or metadata["number"] != args.expected_version_number or metadata["main_module"] != args.expected_main_module:
        raise ValueError("Unexpected reviewed baseline")
    modules = baseline["modules"]
    if len(modules) != args.expected_module_count or len({item["name"] for item in modules}) != args.expected_module_count:
        raise ValueError("Expected the reviewed number of distinct original modules")
    original = args.original_router.read_bytes()
    old = next(item for item in modules if item["name"] == "new74-router-r1.mjs")
    if len(base64.b64encode(original)) != old["base64_chars"]:
        raise ValueError("Original saved router differs from baseline length")
    cfg = {
        "accountId": args.account_id,
        "scriptName": "superwin-player",
        "expectedVersion": metadata["id"], "expectedVersionNumber": metadata["number"],
        "expectedMainModule": metadata["main_module"], "expectedModuleCount": args.expected_module_count,
        "expectedModules": modules,
        "expectedConfigSha256": digest(canonical(config_snapshot(metadata)).encode()),
        "changedModule": "new74-router-r1.mjs", "originalRouterSha256": digest(original),
        "replacementBase64": base64.b64encode(router).decode(), "replacementSha256": digest(router),
        "stage": False,
    }
    helper = (here / "stage-new74-version.mjs").read_text()
    executable = re.sub(r"^export ", "", helper, flags=re.MULTILINE)
    generated = []
    for name, stage in (("dry-run-request.json", False), ("stage-request.json", True)):
        config = dict(cfg, stage=stage)
        code = ("async () => {\n" + executable + "\nconst cfg=" + canonical(config)
                + ";\ntry { return await stageNew74Version(options => cloudflare.request(options), cfg); }"
                + " catch (error) { return {ok:false,error:error.message,stagedVersionId:error.stagedVersionId||null,"
                + "stageWriteAttempted:error.stageWriteAttempted===true,deployedByHelper:false}; }\n}")
        payload = {"account_id": cfg["accountId"], "code": code, "truncate": False}
        data = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode()
        save(here / name, data)
        generated.append({"path": name, "bytes": len(data), "sha256": digest(data), "stage": stage})
    review = {
        "remoteCallsPerformedByBuilder": 0,
        "target": cfg["scriptName"], "expectedVersion": cfg["expectedVersion"],
        "expectedVersionNumber": args.expected_version_number, "expectedMainModule": cfg["expectedMainModule"],
        "expectedModuleCount": args.expected_module_count, "onlyChangedModule": cfg["changedModule"],
        "originalRouterSha256": cfg["originalRouterSha256"], "replacementRouterSha256": cfg["replacementSha256"],
        "expectedConfigSha256": cfg["expectedConfigSha256"], "baselineIndexSha256": digest(baseline_bytes),
        "freshRevision": "20261113-all74-r1", "legacyRevision": "20261113-pair01-r1",
        "freshFileCount": len(verified_files), "freshPosterCount": len(verified_files) - 4,
        "freshPublicManifestSha256": digest(manifest_bytes),
        "freshFiles": sorted(verified_files, key=lambda item: item["path"]),
        "mutation": {"method": "PATCH", "suffix": "/versions/latest", "query": {"deploy": False}, "bodyFields": ["modules"]},
        "artifacts": generated,
    }
    save(here / "review.json", (json.dumps(review, indent=2) + "\n").encode())
    print(json.dumps({key: value for key, value in review.items() if key not in ("freshFiles", "artifacts")}, indent=2))
    print(json.dumps({"artifacts": generated}, indent=2))


if __name__ == "__main__":
    main()
