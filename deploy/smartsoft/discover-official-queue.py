"""Build a construction queue from published provider pages, never guessed demos.

This only discovers references. It does not implement, approve or launch games.
Raw public pages stay in the supplied evidence directory; the queue records hashes.
"""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import parse_qs, urljoin, urlsplit

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
MAX_PAGE_BYTES = 2_000_000
SOURCE_HOSTS = {"www.playngo.com", "www.relax-gaming.com", "www.pragmaticplay.com"}
DEMO_HOSTS = {
    "playngo": {"released.playngonetwork.com"},
    "relax": {"d2drhksbtcqozo.cloudfront.net", "d1yt6x7f5ys7zn.cloudfront.net"},
    "pragmatic": {"demogamesfree.pragmaticplay.net", "demogamesfree.pragmaticplay.com"},
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def public_url(value, hosts):
    parsed = urlsplit(value)
    return (parsed.scheme == "https" and parsed.hostname in hosts and
            not parsed.username and not parsed.password and parsed.port in (None, 443))


def read_page(url, evidence):
    if not public_url(url, SOURCE_HOSTS):
        raise ValueError("UNTRUSTED_OFFICIAL_PAGE")
    target = evidence / "pages" / (digest(url.encode()) + ".html")
    if target.exists() and 0 < target.stat().st_size <= MAX_PAGE_BYTES:
        return target.read_bytes()
    for attempt in range(2):
        result = subprocess.run(
            ["curl", "-fsS", "--proto", "=https", "--max-time", "20",
             "--max-filesize", str(MAX_PAGE_BYTES), url], capture_output=True)
        if result.returncode == 0 and 0 < len(result.stdout) <= MAX_PAGE_BYTES:
            target.write_bytes(result.stdout)
            return result.stdout
        if attempt == 0:
            time.sleep(1)
    raise ValueError("OFFICIAL_PAGE_UNAVAILABLE")


def candidate_links(evidence, providers):
    relax = json.loads((evidence / "relax-games.json").read_text())
    candidates = [{"provider": "relax", "officialPage": urljoin("https://www.relax-gaming.com", row["gameURL"]),
                   "name": row["name"], "studio": row["studio"], "providerKey": row["id"],
                   "officialIcon": row["imageURL"]}
                  for row in relax if row.get("game_type") and row.get("gameURL", "").startswith("/products/casino/")]
    soup = BeautifulSoup((evidence / "playngo-sitemap.txt").read_bytes(), "xml")
    for page in dict.fromkeys(item.get_text() for item in soup.select("loc")):
        if page.startswith("https://www.playngo.com/games/"):
            candidates.append({"provider": "playngo", "studio": "Play'n GO", "officialPage": page})
    # Follow links actually published by the provider's normal paginated catalogue.
    for page in sorted(evidence.glob("pragmatic-list-*.html")):
        soup = BeautifulSoup(page.read_bytes(), "html.parser")
        for card in soup.select(".game"):
            anchor = card.select_one("a.game__thumbnail[href]")
            if not anchor:
                continue
            url = anchor["href"].split("?")[0]
            if url.startswith("https://www.pragmaticplay.com/en/games/"):
                candidates.append({"provider": "pragmatic", "studio": "Pragmatic Play", "officialPage": url})
    return list({row["officialPage"]: row for row in candidates if row['provider'] in providers}.values())


def discover(candidate, evidence):
    try:
        raw = read_page(candidate["officialPage"], evidence)
        soup = BeautifulSoup(raw, "html.parser")
        provider = candidate["provider"]
        values = [node.get(attr) for node in soup.select("a[href],iframe[data-game-src],iframe[src]")
                  for attr in ("href", "data-game-src", "src") if node.get(attr)]
        demos = [url for url in values if public_url(url, DEMO_HOSTS[provider])]
        if provider == "relax":
            demos = [url for url in demos if parse_qs(urlsplit(url).query).get("moneymode") == ["fun"]]
        elif provider == "playngo":
            demos = [url for url in demos if parse_qs(urlsplit(url).query).get("practice") == ["1"]]
        else:
            demos = [url for url in demos if urlsplit(url).path == "/gs2c/openGame.do"]
        if not demos:
            raise ValueError("NO_PUBLISHED_FREE_DEMO")
        demo = next((url for url in demos if parse_qs(urlsplit(url).query).get("channel") == ["mobile"]), demos[0])
        query = parse_qs(urlsplit(demo).query)
        provider_key = next((query[key][0] for key in ("gameid", "gid", "gameSymbol") if query.get(key)), None)
        if not provider_key or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", provider_key):
            raise ValueError("DEMO_IDENTITY_UNAVAILABLE")
        if candidate.get("providerKey") and candidate["providerKey"] != provider_key:
            raise ValueError("DEMO_IDENTITY_MISMATCH")
        heading = soup.select_one("h1")
        name = candidate.get("name") or (heading.get_text(" ", strip=True) if heading else None)
        icon = soup.select_one('meta[property="og:image"]')
        image = candidate.get("officialIcon") or (icon.get("content") if icon else None)
        if not name or len(name) > 180 or not image or urlsplit(image).scheme != "https":
            raise ValueError("OFFICIAL_IDENTITY_INCOMPLETE")
        return {"provider": provider, "studio": candidate["studio"], "providerKey": provider_key,
                "name": name, "officialPage": candidate["officialPage"], "officialDemo": demo,
                "officialIcon": image, "sourceSha256": digest(raw), "sourceBytes": len(raw),
                "status": "reference_identified", "demoObserved": False,
                "presentationVerified": False, "financialRelease": False}
    except Exception as error:
        return {"officialPage": candidate["officialPage"], "error": str(error)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--target", type=int, default=1000)
    parser.add_argument("--workers", type=int, default=4, choices=range(1, 7))
    parser.add_argument("--providers", nargs='+', choices=['relax', 'playngo', 'pragmatic'], default=['relax', 'playngo', 'pragmatic'])
    args = parser.parse_args()
    if not 69 <= args.target <= 1000:
        parser.error("This authorized construction queue has a target of 69 through 1000.")
    args.evidence.mkdir(parents=True, exist_ok=True)
    (args.evidence / "pages").mkdir(exist_ok=True)
    candidates = candidate_links(args.evidence, args.providers)
    print(json.dumps({"candidates": len(candidates), "target": args.target}), flush=True)
    output, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        for number, row in enumerate(pool.map(lambda c: discover(c, args.evidence), candidates), 1):
            (failures if "error" in row else output).append(row)
            if number % 25 == 0:
                print(json.dumps({"processed": number, "references": len(output), "unavailable": len(failures)}), flush=True)
    (args.evidence / "discovered.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    (args.evidence / "discovery-failures.json").write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n")
    retained = json.loads((ROOT / "official-queue-69.json").read_text())
    games = [{**row, "provider": "smartsoft", "studio": "SmartSoft Gaming", "demoObserved": False,
              "sourceSha256": retained["catalogueSha256"], "evidenceKind": "official_catalogue"} for row in retained["games"]]
    seen = set()
    # Keep all 69 original references first, then actual discovered titles. No placeholders.
    for row in games:
        seen.add((row["studio"].casefold(), row["providerKey"].casefold()))
    for row in output:
        identity = (row["studio"].casefold(), row["providerKey"].casefold())
        if identity not in seen and len(games) < args.target:
            games.append(row)
            seen.add(identity)
    # The official Hacksaw site publishes its launcher in JavaScript, rather
    # than an anchor. These URLs are captured by clicking its visible Try it
    # controls; the capture records each actual iframe navigation.
    captured = args.evidence / 'hacksaw-discovered.json'
    if captured.exists():
        for row in json.loads(captured.read_text()):
            identity = (row['studio'].casefold(), row['providerKey'].casefold())
            if identity not in seen and len(games) < args.target:
                games.append(row)
                seen.add(identity)
    queue = {"schemaVersion": 1, "release": "official-construction-r15", "targetCount": args.target,
             "referenceCount": len(games), "unfilledCount": max(0, args.target - len(games)),
             "selection": "Retain the original 69 SmartSoft references, then add individually published official free demos. A reference is not an implemented or financially released game.",
             "existingPlayerUrl": "https://play.superwinn.net", "walletLedger": "existing-postgresql",
             "protectedExistingGames": ["multi_hot_5_native", "foxy_hot_20_native"],
             "games": [{"queueId": row["provider"] + ":" + row["providerKey"], **row} for row in games]}
    previous_path=ROOT / 'official-queue-1000.json'
    if previous_path.exists():
        previous={row['queueId']:row for row in json.loads(previous_path.read_text())['games']}
        for row in queue['games']:
            old=previous.get(row['queueId'])
            if old and old['officialDemo']==row['officialDemo'] and old['officialIcon']==row['officialIcon'] and old.get('cover'):
                row['cover']=old['cover']
    (ROOT / "official-queue-1000.json").write_text(json.dumps(queue, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"queued": len(games), "target": args.target, "unfilled": queue["unfilledCount"],
                      "verifiedBehaviorCount": 0, "financiallyReleasedCount": 0}), flush=True)


if __name__ == "__main__":
    main()
