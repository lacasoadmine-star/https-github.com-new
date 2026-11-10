"""Verify recovered identities, actual image bytes and native-route reuse."""
import json
from pathlib import Path
from collect import EXCLUDED, REPO, ROOT, digest, image_type, normalized


def main():
    manifest = json.loads((ROOT / "references.json").read_text())
    snapshot = json.loads((REPO / "game-expansion/catalog/official-smartsoft-snapshot.json").read_text())
    expected = [e for e in snapshot["entries"] if e["url"].rsplit("/", 1)[-1] not in EXCLUDED]
    entries = manifest["entries"]
    assert len(entries) == len(expected) == 69
    assert len({e["slug"] for e in entries}) == 69
    assert manifest["financialActionsExecuted"] is False
    assert manifest["nativeCompletionClaimed"] is False
    ids = set()
    issues = []
    for ordinal, (entry, original) in enumerate(zip(entries, expected), 1):
        assert entry["ordinal"] == ordinal
        assert entry["officialURL"] == original["url"]
        assert normalized(entry["name"]) == normalized(original["name"])
        assert entry["productionLaunchable"] is False
        assert entry["demoWalkthroughVerified"] is False
        cover = entry["cover"]
        assert Path(cover["file"]).parent == Path("covers")
        data = (ROOT / cover["file"]).read_bytes()
        assert len(data) == cover["bytes"]
        assert digest(data) == cover["sha256"]
        assert Path(cover["file"]).suffix == "." + image_type(data)
        assert cover["sourceURL"].startswith("https://cdn.prod.website-files.com/")
        native = entry["native"]
        if native:
            assert native["id"] not in ids
            ids.add(native["id"])
            if "demoRoute" in native:
                assert native["demoRoute"] == "/demo/games/" + native["id"]
                assert native["cashReady"] is False
        if entry["referenceStatus"] != "product-and-cover-verified":
            issues.append(entry["slug"])
    # Anchors transcribed from the supplied screenshots, including final row.
    for ordinal, name in [(1, "PopX"), (18, "Multi Hot 10"), (37, "Burning Ice 40"),
                          (66, "Burning Ice 10"), (67, "Roll X"), (68, "Double X"), (69, "Samurai")]:
        assert entries[ordinal - 1]["name"] == name
    print(json.dumps({"titles": 69, "verifiedCoverFiles": 69,
                      "reusedNativeIDs": len(ids), "productPageIssues": issues,
                      "newNativeGamesClaimed": 0, "financialActions": False}))


if __name__ == "__main__":
    main()
