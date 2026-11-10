"""Recover the screenshot's 69 official references without launching wagers.

Only public product pages and title-specific images are downloaded. Provider
executables, authenticated sessions and private outcome laws are not collected.
"""
import argparse
import concurrent.futures
import hashlib
import json
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
EXCLUDED = {"jetx", "multi-hot-5", "foxy-hot-20", "balloon", "fotballx"}
GALLERY = "https://www.smartsoftgaming.com/games"
CHECKS = ["visibleRules", "paytable", "controlsAndBonuses", "presentationComparison",
          "nativeMath", "walletSettlement", "browserIntegration"]


def normalized(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def digest(data):
    return hashlib.sha256(data).hexdigest()


def demo_url(url):
    if url.startswith("eu-server.ssgportal.com/"):
        url = "https://" + url
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme == "http" and parsed.hostname == "eu-server.ssgportal.com":
        url = "https://" + url.removeprefix("http://")
        parsed = urllib.parse.urlsplit(url)
    if parsed.hostname == "www.google.com" and parsed.path == "/url":
        target = urllib.parse.parse_qs(parsed.query).get("q", [""])[0]
        return demo_url(target) if "google.com" not in target else None
    if parsed.scheme != "https" or parsed.hostname != "eu-server.ssgportal.com" or parsed.path.lower() != "/gamelauncher/loader.aspx":
        return None
    query = urllib.parse.parse_qs(parsed.query)
    if query.get("Token") not in [["DEMO"], ["DEMO_EXH"]] or not query.get("GameName"):
        return None
    return url


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.links = []
        self.title = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "img":
            self.images.append(attrs)
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "meta" and attrs.get("property") == "og:title":
            self.title = attrs.get("content")


def parse(data):
    page = Page()
    page.feed(data.decode("utf-8"))
    return page


def download(url, limit=4_000_000):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname not in {
        "www.smartsoftgaming.com", "cdn.prod.website-files.com"
    }:
        raise ValueError("Unexpected reference host: " + url)
    request = urllib.request.Request(url, headers={"User-Agent": "Superwin-reference-audit/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        final = urllib.parse.urlsplit(response.url)
        if final.hostname != parsed.hostname or final.scheme != "https":
            raise ValueError("Unexpected reference redirect")
        body = response.read(limit + 1)
        if len(body) > limit:
            raise ValueError("Reference too large")
        return body


def image_type(data):
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    raise ValueError("Unsupported image signature; placeholder or HTML rejected")


def select_cover(images, name):
    # Related-game art and generic OG images must not replace this title's art.
    return next((i["src"] for i in images
                 if normalized(i.get("alt", "")) == normalized(name)
                 and "placeholder" not in i.get("src", "").lower()
                 and "w-dyn-bind-empty" not in i.get("class", "")
                 and i.get("src", "").startswith("https://cdn.prod.website-files.com/")), None)


def collect(entry, ordinal, gallery, cache, out, existing, previous):
    slug = entry["url"].rsplit("/", 1)[-1]
    result = {"ordinal": ordinal, "slug": slug, "name": entry["name"].strip(),
              "officialURL": entry["url"], "historicalDemoURL": entry.get("demo_url"),
              "native": existing.get(entry["url"]), "productionLaunchable": False,
              "remainingChecks": CHECKS.copy()}
    try:
        path = cache / (slug + ".html")
        cached = path.exists()
        raw = path.read_bytes() if cached else download(entry["url"])
        page = parse(raw)
        if not cached:
            path.write_bytes(raw)
        title_matches = normalized(re.sub(r"\s+By SmartSoft$", "", page.title or "", flags=re.I)) == normalized(entry["name"])
        result["page"] = {"sha256": digest(raw), "bytes": len(raw), "title": page.title,
                          "titleMatches": title_matches,
                          "observedAt": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat()}
        result["referenceIssues"] = [] if title_matches else ["product-title-mismatch"]
        launches = list(dict.fromkeys(canonical for u in page.links if (canonical := demo_url(u))))
        # Match the historical launcher identity, not related games on the page.
        old_name = urllib.parse.parse_qs(urllib.parse.urlsplit(entry.get("demo_url") or "").query).get("GameName", [entry["name"]])[0]
        result["officialDemoURLs"] = [u for u in launches if
            normalized(urllib.parse.parse_qs(urllib.parse.urlsplit(u).query)["GameName"][0]) == normalized(old_name)]
        result["demoURLNormalization"] = "Known host only: HTTPS upgrade, scheme completion, Google q unwrap; observed launcher path and parameters retained. No launcher executed."
        url = select_cover(gallery.images, entry["name"])
        source = "official-gallery-title-match"
        if not url:
            url = select_cover(page.images, entry["name"]) if title_matches else None
            source = "individual-product-page"
        if not url:
            raise ValueError("No title-specific official cover")
        prior = previous.get(slug, {}).get("cover", {})
        cached_cover = out / prior.get("file", "missing")
        data = cached_cover.read_bytes() if prior.get("sourceURL") == url and cached_cover.is_file() else None
        if data is None or digest(data) != prior.get("sha256"):
            data = download(url)
        ext = image_type(data)
        name = "covers/" + slug + "." + ext
        (out / name).write_bytes(data)
        result["cover"] = {"file": name, "sourceURL": url, "source": source,
                           "sha256": digest(data), "bytes": len(data)}
        result["referenceStatus"] = "product-and-cover-verified" if title_matches else "product-page-needs-review"
        result["demoWalkthroughVerified"] = False
        if not result["officialDemoURLs"]:
            result["referenceIssues"].append("historical-demo-identity-not-on-product-page")
            result["referenceStatus"] = "demo-link-needs-review"
    except Exception as error:
        result["referenceStatus"] = "needs-review"
        result["error"] = str(error)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True,
                        help="Intermediate HTML directory outside the repository")
    parser.add_argument("--output", type=Path, default=ROOT)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "covers").mkdir(exist_ok=True)
    snapshot = json.loads((REPO / "game-expansion/catalog/official-smartsoft-snapshot.json").read_text())
    entries = [e for e in snapshot["entries"] if e["url"].rsplit("/", 1)[-1] not in EXCLUDED]
    if len(entries) != 69 or len({e["url"] for e in entries}) != 69:
        raise ValueError("Historical 69-title scope changed")
    gallery_raw = download(GALLERY)
    (args.cache / "gallery.html").write_bytes(gallery_raw)
    gallery = parse(gallery_raw)
    existing = {}
    # Retain real native IDs; never synthesize ready machines from title names.
    queue = json.loads((REPO / "game-expansion/continuation/requested-list.json").read_text())
    for entry in queue["requested"]:
        url = entry.get("officialReference") or entry.get("officialURL")
        if url:
            existing[url] = {"id": entry["id"], "status": "existing-development"}
    config_source = (REPO / "game-expansion/continuation/client-assets.mjs").read_text()
    configs = json.loads(config_source.removeprefix("export const GAMES=").split(";\n", 1)[0])
    for config in configs:
        url = config.get("officialReference")
        if url and any(e["url"] == url for e in entries):
            existing[url] = {"id": config["id"], "status": "existing-development"}
    catalog_source = (REPO / "player-catalogue/official-covers-20261109/catalog.mjs").read_text()
    catalog = json.loads(catalog_source.split("Object.freeze(", 1)[1].rsplit(");", 1)[0])
    for native in catalog:
        match = next((e for e in entries if normalized(e["name"]) == normalized(native["name"])), None)
        if match:
            existing[match["url"]] = {"id": native["id"], "demoRoute": native["launch"],
                                       "status": "existing-credits-demo", "cashReady": False}
    started = datetime.now(timezone.utc).isoformat()
    previous_file = args.output / "references.json"
    previous = {e["slug"]: e for e in json.loads(previous_file.read_text())["entries"]} if previous_file.exists() else {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        tasks = [pool.submit(collect, e, i + 1, gallery, args.cache, args.output, existing, previous)
                 for i, e in enumerate(entries)]
        results = [task.result() for task in tasks]
    manifest = {"schemaVersion": 1, "observedAt": started, "officialIndexURL": GALLERY,
                "gallerySha256": digest(gallery_raw), "sourceSnapshot": snapshot["source"],
                "scope": "74 historical official titles minus 5 preserved or separate titles",
                "excludedSlugs": sorted(EXCLUDED), "nativeCompletionClaimed": False,
                "financialActionsExecuted": False, "entries": results}
    (args.output / "references.json").write_text(json.dumps(manifest, indent=2) + "\n")
    summary = {"titles": len(results), "covers": sum("cover" in e for e in results),
               "demoLinks": sum(bool(e.get("officialDemoURLs")) for e in results),
               "needsReview": [e["slug"] for e in results if e["referenceStatus"] != "product-and-cover-verified"]}
    print(json.dumps(summary))
    return bool(summary["needsReview"])


if __name__ == "__main__":
    raise SystemExit(main())
