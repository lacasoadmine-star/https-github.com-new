#!/usr/bin/env python3
"""Collect a fresh SmartSoft catalogue and public, game-specific reference files."""
import concurrent.futures
import hashlib
import html
import json
import re
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_URL = "https://www.smartsoftgaming.com/games"
GROUPS = {
    "01-source": "Official page, attribution, retrieval time and metadata",
    "02-screenshots": "Fresh browser captures; target: ten different observed states",
    "03-sound": "Public demo audio resources and any captured audio",
    "04-video-animation": "Recorded demo playback and public animation resources",
    "05-reels-system": "Observed reels, timing and game state transitions",
    "06-artwork": "Game-specific public artwork, symbols, textures and atlases",
    "07-buttons": "Observed controls, actions, responses and screenshots",
    "08-rules-paytable": "Observed rules, help, paytable and published specifications",
    "09-network": "Request provenance, failures and demo session observations",
    "10-layout-mobile": "Viewport and responsive layout observations",
    "11-fonts": "Fonts actually served by the public demo",
    "12-client-code": "Public browser client resources; not server source code",
    "13-live-build-specification": "Per-title construction brief, own symbol/animation inventories, native interactions, evidence and explicitly missing requirements",
}


def now():
    return datetime.now(timezone.utc).isoformat()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def download(url, destination, max_bytes=40 * 1024 * 1024):
    parts = urlsplit(url)
    safe = urlunsplit((parts.scheme, parts.netloc, quote(parts.path, safe="/%:@!$&'()*+,;=-._~"), parts.query, ""))
    request = Request(safe, headers={"User-Agent": "Mozilla/5.0 (compatible; ReferenceResearch/1.0)"})
    with urlopen(request, timeout=40) as response:
        body = response.read(max_bytes + 1)
        if len(body) > max_bytes:
            raise ValueError("Resource exceeds per-file limit")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(body)
        return {"source_url": url, "resolved_url": response.url, "retrieved_at": now(),
                "status": response.status, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
                "content_type": response.headers.get("Content-Type"), "path": str(destination.relative_to(ROOT))}


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.suppressed = 0
        self.stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        suppress = tag in ("script", "style", "noscript") or "w-condition-invisible" in attrs.get("class", "")
        if tag not in ("img", "input", "source", "meta", "link", "br", "hr", "embed", "area", "wbr"):
            self.stack.append((tag, suppress))
            self.suppressed += suppress
        if not self.suppressed and tag in ("p", "h1", "h2", "h3", "h4", "li", "br", "div"):
            self.text.append("\n")

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                self.suppressed -= sum(x[1] for x in self.stack[i:])
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        if not self.suppressed:
            self.text.append(data)

    def result(self):
        return "\n".join(line.strip() for line in "".join(self.text).splitlines() if line.strip())


def get_catalogue():
    src = ROOT / "sources/smartsoft-games.html"
    record = download(CATALOGUE_URL, src)
    source = src.read_text()
    games = []
    for item in source.split('<div role="listitem" class="games_item w-dyn-item">')[1:]:
        name = re.search(r'<p[^>]*fs-cmsfilter-field="name"[^>]*>(.*?)</p>', item)
        category = re.search(r'<p[^>]*fs-cmsfilter-field="category"[^>]*>(.*?)</p>', item)
        page = re.search(r'href="(/games/[^"]+)"', item)
        if not name or not page:
            continue
        links = [html.unescape(link) for link in re.findall(r'href="([^"]*)"', item)]
        demo = next((link for link in links if "ssgportal.com/GameLauncher/" in link), None)
        original_demo = demo
        if demo and urlsplit(demo).netloc == "www.google.com":
            demo = parse_qs(urlsplit(demo).query)["q"][0]
        if demo and demo.startswith("eu-server."):
            demo = "https://" + demo
        if demo and demo.startswith("http://eu-server."):
            demo = "https://" + demo[len("http://"):]
        thumb = re.search(r'<img[^>]*src="([^"]+)"', item)
        games.append({"id": page[1].rsplit("/", 1)[-1], "name": html.unescape(name[1]).strip(),
                      "category": html.unescape(category[1]).strip() if category else "Unspecified",
                      "official_url": urljoin(CATALOGUE_URL, page[1]), "demo_url": demo,
                      "original_demo_url": original_demo,
                      "demo_url_normalization": "Unwrapped official redirect / HTTPS normalization" if demo != original_demo else None,
                      "thumbnail_url": html.unescape(thumb[1]) if thumb else None})
    assert len(games) == len({game["id"] for game in games}), "Duplicate official game pages"
    catalog = {"schema_version": 1, "provider": "SmartSoft Gaming", "retrieved_at": now(),
               "source_url": CATALOGUE_URL, "requested_count": 74, "actual_count": len(games),
               "selection": "All distinct titles on the official SmartSoft catalogue, selected at the user's request",
               "category_counts": dict(Counter(game["category"] or "Unspecified" for game in games)),
               "source_record": record, "games": games}
    write_json(ROOT / "catalogues/smartsoft-games.json", catalog)
    write_json(ROOT / "catalogues/groups.json", GROUPS)
    return catalog


def collect_game(game):
    directory = ROOT / "games" / game["id"]
    for group in GROUPS:
        (directory / group).mkdir(parents=True, exist_ok=True)
    metadata = dict(game, retrieved_at=now(), assets=[], errors=[], demo_status="not_attempted")
    try:
        official = directory / "01-source/official-page.html"
        metadata["official_page"] = download(game["official_url"], official)
        raw = official.read_text()
        main = re.split(r'<section\b[^>]*class="[^"]*\b(?:section_games-other|section_game-partners)\b', raw, maxsplit=1)[0]
        text = VisibleText()
        text.feed(main)
        (directory / "08-rules-paytable/official-page-text.txt").write_text(text.result() + "\n")
        media = [game["thumbnail_url"]] if game.get("thumbnail_url") else []
        for tag in re.findall(r'<(?:img|source)\b[^>]*>', main):
            match = re.search(r'\bsrc="([^"]+)"', tag)
            if match and "/68263adafcf8918559aaa083/" in match[1]:
                media.append(html.unescape(match[1]))
        for url in dict.fromkeys(media):
            filename = re.sub(r"[^a-zA-Z0-9._-]", "_", unquote(urlsplit(url).path.rsplit("/", 1)[-1]))
            group = "04-video-animation" if re.search(r"\.(mp4|webm)$", filename, re.I) else "06-artwork"
            try:
                metadata["assets"].append(download(url, directory / group / filename))
            except Exception as exc:
                metadata["errors"].append({"url": url, "error": str(exc)})
        metadata["source_status"] = "saved"
    except Exception as exc:
        metadata["source_status"] = "failed"
        metadata["errors"].append({"url": game["official_url"], "error": str(exc)})
    write_json(directory / "01-source/metadata.json", metadata)
    return {"id": game["id"], "name": game["name"], "status": metadata["source_status"],
            "assets": len(metadata["assets"]), "errors": len(metadata["errors"])}


def main():
    catalogue = get_catalogue()
    print(json.dumps({"catalogue_count": catalogue["actual_count"], "categories": catalogue["category_counts"]}), flush=True)
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for result in pool.map(collect_game, catalogue["games"]):
            results.append(result)
            print(json.dumps(result), flush=True)
    write_json(ROOT / "reports/source-collection.json", {"finished_at": now(), "games": results})
    print(json.dumps({"finished": True, "pages_saved": sum(r["status"] == "saved" for r in results),
                      "artwork_files": sum(r["assets"] for r in results)}), flush=True)


if __name__ == "__main__":
    main()
