#!/usr/bin/env python3
"""Recover public SmartSoft demo references from product pages, without launching games.

Only validated public DEMO links are retained. HTTP source hrefs remain evidence;
their transport URL upgrades only the exact official launcher host to HTTPS.
A MATCHED reference is not a successful launch, a completed round or LIVE VERIFIED.
"""
from __future__ import annotations

import argparse
import concurrent.futures
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import socket
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

DEMO_HOST = "eu-server.ssgportal.com"
DEMO_PATH = "/GameLauncher/Loader.aspx"
# The current Bottle Mania source publishes the lowercase filename exactly.
DEMO_PATHS = {DEMO_PATH, "/GameLauncher/loader.aspx"}
PAGE_HOSTS = {"www.smartsoftgaming.com", "smartsoftgaming.com"}
TRANSIENT_HTTP = {500, 502, 503, 504}
MAX_PAGE_BYTES = 4 * 1024 * 1024
IDENTITY = re.compile(r"^[A-Za-z0-9_-]+$")
PUBLIC_KEYS = {"gamename", "gamecategory", "token", "portalname", "returnurl", "lang",
               "mode", "playmode", "real", "realmoney", "isreal", "demo", "isdemo"}


def official_page_url(value: str, *, allow_catalog: bool = False) -> str:
    """Validate before any request or redirect; queries and credentials are excluded."""
    if not isinstance(value, str) or re.search(r"[\x00-\x20\\]", value):
        raise ValueError("Invalid official product URL")
    p = urlsplit(value)
    valid_path = re.fullmatch(r"/games/[A-Za-z0-9_-]+/?", p.path)
    if allow_catalog and p.path in ("/games", "/games/"):
        valid_path = True
    if (p.scheme != "https" or p.hostname not in PAGE_HOSTS or p.username or p.password
            or p.port not in (None, 443) or p.query or p.fragment or not valid_path):
        raise ValueError("Expected an official HTTPS product page")
    return value


def parse_demo_launcher(href: str, base_url: str | None = None) -> dict | None:
    """Return a public reference, or None without retaining a rejected/private href."""
    try:
        if not isinstance(href, str) or re.search(r"[\x00-\x20\\]", href):
            return None
        source_page = official_page_url(base_url, allow_catalog=True) if base_url is not None else None
        repairs = []
        value = href
        source = urlsplit(href)
        if source.hostname == "www.google.com":
            # This one wrapper occurs on the current official Multi Hot 10 page.
            # Decode q once, validate the destination below, and never visit Google.
            if (source_page is None or source.scheme != "https" or source.username or source.password
                    or source.port not in (None, 443) or source.path != "/url" or source.fragment):
                return None
            wrapper = {}
            for name, item in parse_qsl(source.query, keep_blank_values=True, max_num_fields=8):
                name = name.casefold()
                if name in wrapper or name not in {"q", "sa", "source", "ust", "usg"}:
                    return None
                if name != "q" and not re.fullmatch(r"[A-Za-z0-9_-]{1,200}", item):
                    return None
                wrapper[name] = item
            value = wrapper.get("q", "")
            destination = urlsplit(value)
            if (destination.scheme not in ("http", "https") or destination.hostname != DEMO_HOST
                    or re.search(r"[\x00-\x20\\]", value)):
                return None
            repairs.append({"code": "GOOGLE_WRAPPER_REMOVED", "levels": 1})
        elif any(href.startswith(DEMO_HOST + path + "?") for path in DEMO_PATHS):
            value = "https://" + href
            repairs.append({"code": "HTTPS_SCHEME_ADDED"})
        # Scheme-relative anchors are accepted only with a validated official source.
        elif href.startswith("//"):
            if source_page is None:
                return None
            value = urljoin(source_page, href)
        p = urlsplit(value)
        if (p.scheme not in ("http", "https") or p.hostname != DEMO_HOST
                or p.username or p.password or p.fragment or p.path not in DEMO_PATHS
                or p.port not in (None, 80 if p.scheme == "http" else 443)):
            return None
        query = {}
        query_pairs = parse_qsl(p.query, keep_blank_values=True, max_num_fields=30)
        for name, item in query_pairs:
            name = name.casefold()
            if name in query or name not in PUBLIC_KEYS or re.search(r"[\x00-\x1f\x7f]", item):
                return None
            query[name] = item
        if (query.get("token", "").casefold() != "demo"
                or query.get("portalname", "").casefold() != "demo"
                or not IDENTITY.fullmatch(query.get("gamename", ""))
                or (query.get("gamecategory") and not IDENTITY.fullmatch(query["gamecategory"]))):
            return None
        if any(query[key].casefold() != "demo" for key in ("mode", "playmode") if key in query):
            return None
        if any(query[key].casefold() not in ("false", "0") for key in ("real", "realmoney", "isreal") if key in query):
            return None
        if any(query[key].casefold() not in ("true", "1") for key in ("demo", "isdemo") if key in query):
            return None
        if "lang" in query and not re.fullmatch(r"[A-Za-z]{2,3}(?:[-_][A-Za-z]{2,4})?", query["lang"]):
            return None
        if "returnurl" in query:
            # A nested token in ReturnUrl must never be written into evidence.
            end = urlsplit(query["returnurl"])
            if (end.scheme not in ("http", "https") or end.hostname not in PAGE_HOSTS
                    or end.username or end.password or end.query or end.fragment
                    or end.port not in (None, 80 if end.scheme == "http" else 443)
                    or not re.fullmatch(r"/[A-Za-z0-9/_-]*|", end.path)):
                # Repair only the exact malformed public value freshly observed
                # for this identity; arbitrary return URLs/private tokens stay rejected.
                if (query["returnurl"] != "http://google.com5" or query["gamename"] != "WheelofDestiny"
                        or query.get("gamecategory") != "Games" or source_page is None
                        or urlsplit(source_page).path.rstrip("/") != "/games/wheel-of-destiny"):
                    return None
                query_pairs = [(name, source_page if name.casefold() == "returnurl" else item)
                               for name, item in query_pairs]
                repairs.append({"code": "INVALID_RETURN_URL_REPLACED", "originalValue": "http://google.com5",
                                "replacement": source_page})
        if p.scheme == "http":
            repairs.append({"code": "HTTP_UPGRADED_TO_HTTPS"})
        launch_query = urlencode(query_pairs) if any(x["code"] == "INVALID_RETURN_URL_REPLACED" for x in repairs) else p.query
        return {"originalHref": href,
                "launchUrl": urlunsplit(("https", DEMO_HOST, p.path, launch_query, "")),
                "gameName": query["gamename"], "gameCategory": query.get("gamecategory"),
                "transportUpgraded": p.scheme == "http", "sourcePage": source_page, "repairs": repairs}
    except (TypeError, ValueError):
        return None


class _Anchors(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag.casefold() == "a":
            hrefs = [value for key, value in attrs if key.casefold() == "href"]
            if len(hrefs) == 1 and hrefs[0] is not None:
                self.hrefs.append(hrefs[0])


def extract_demo_launchers(html_text: str, base_url: str | None = None) -> list[dict]:
    parser = _Anchors()
    parser.feed(html_text)
    references = []
    for href in parser.hrefs:
        candidate = parse_demo_launcher(href, base_url)
        if candidate is not None and candidate not in references:
            references.append(candidate)
    return references


def select_demo_candidates(candidates: list[dict], expected_game_name: str,
                           expected_category: str | None) -> dict:
    """Require exact identity; never choose another game's related-product link."""
    if (not isinstance(expected_game_name, str) or not IDENTITY.fullmatch(expected_game_name)
            or (expected_category is not None and not isinstance(expected_category, str))
            or (expected_category and not IDENTITY.fullmatch(expected_category))):
        raise ValueError("Expected an explicit game name and category")
    matched = {}
    for entry in candidates:
        # Revalidate even callers' stored candidate objects before exposing a URL.
        candidate = parse_demo_launcher(entry.get("originalHref"), entry.get("sourcePage")) if isinstance(entry, dict) else None
        if candidate is None or candidate["gameName"] != expected_game_name or candidate["gameCategory"] != expected_category:
            continue
        query = parse_qsl(urlsplit(candidate["launchUrl"]).query, keep_blank_values=True)
        signature = tuple(sorted((key.casefold(), value.casefold() if key.casefold() in ("token", "portalname") else value)
                                 for key, value in query))
        matched.setdefault(signature, candidate)
    return {"referenceStatus": "MATCHED" if len(matched) == 1 else "AMBIGUOUS" if matched else "UNAVAILABLE",
            "expectedGameName": expected_game_name, "expectedGameCategory": expected_category,
            "matchingCandidateCount": len(matched),
            "reference": next(iter(matched.values())) if len(matched) == 1 else None,
            "gameplayStatus": "NOT_TESTED", "liveVerified": False}


def select_demo_reference(html_text: str, expected_game_name: str, expected_category: str | None,
                          base_url: str | None = None) -> dict:
    candidates = extract_demo_launchers(html_text, base_url)
    return select_demo_candidates(candidates, expected_game_name, expected_category)


class _OfficialRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        official_page_url(newurl, allow_catalog=True)
        return super().redirect_request(request, fp, code, msg, headers, newurl)


def fetch_official_page(url: str, *, max_attempts: int = 2, timeout: float = 15,
                        open_url=None, sleep=time.sleep, allow_catalog=False) -> tuple[bytes | None, dict]:
    """GET only official metadata pages. Never request a game launcher or game frame."""
    if not 1 <= max_attempts <= 3 or not 0 < timeout <= 30:
        raise ValueError("Use 1..3 attempts and a timeout no greater than 30 seconds")
    official_page_url(url, allow_catalog=allow_catalog)
    open_url = open_url or build_opener(_OfficialRedirect()).open
    observation = {"requestedUrl": url, "retrievedAtUtc": datetime.now(timezone.utc).isoformat(),
                   "attempts": [], "status": None}
    for index in range(1, max_attempts + 1):
        attempt = {"attempt": index}
        try:
            request = Request(url, headers={"User-Agent": "ZPLAY-public-reference-metadata/2.0"})
            with open_url(request, timeout=timeout) as response:
                response_url = official_page_url(response.geturl(), allow_catalog=allow_catalog)
                status = response.status
                if status != 200:
                    raise HTTPError(url, status, "Official page unavailable", {}, None)
                body = response.read(MAX_PAGE_BYTES + 1)
                if len(body) > MAX_PAGE_BYTES:
                    raise ValueError("Official page exceeds response limit")
                observation.update({"responseUrl": response_url, "status": status,
                                    "sizeBytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
                                    "contentType": response.headers.get("Content-Type"), "pageStatus": "FETCHED"})
                attempt["status"] = status
                observation["attempts"].append(attempt)
                return body, observation
        except HTTPError as error:
            observation["status"] = attempt["status"] = error.code
            retry = error.code in TRANSIENT_HTTP
            observation["pageStatus"] = "HTTP_ERROR"
        except (TimeoutError, socket.timeout, URLError) as error:
            reason = error.reason if isinstance(error, URLError) else error
            retry = isinstance(reason, (TimeoutError, socket.timeout))
            observation["pageStatus"] = "TIMED_OUT" if retry else "FETCH_ERROR"
            attempt["errorType"] = type(error).__name__
        except (OSError, ValueError) as error:
            retry = False
            observation["pageStatus"] = "FETCH_ERROR"
            attempt["errorType"] = type(error).__name__
        observation["attempts"].append(attempt)
        if not retry or index == max_attempts:
            break
        sleep(0.25 * index)
    return None, observation


def resolve_product(item: dict, **fetch_options) -> dict:
    """Resolve one expected product; failures are sanitized and do not stop a batch."""
    result = {"gameId": None, "officialPage": None, "referenceStatus": "UNAVAILABLE",
              "reference": None, "gameplayStatus": "NOT_TESTED", "liveVerified": False}
    try:
        game_id = item.get("gameId")
        if isinstance(game_id, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,100}", game_id):
            result["gameId"] = game_id
        page = official_page_url(item["officialPage"])
        result["officialPage"] = page
        expected = select_demo_candidates([], item["gameName"], item.get("gameCategory"))
        result.update(expected)
        body, observation = fetch_official_page(page, **fetch_options)
        result["pageObservation"] = observation
        if body is not None:
            result.update(select_demo_reference(body.decode("utf-8", errors="replace"),
                                                item["gameName"], item.get("gameCategory"), page))
    except (KeyError, TypeError, ValueError, AttributeError) as error:
        result["inputError"] = type(error).__name__
    except Exception as error:
        # Unexpected transport/parser failure belongs to this item, never the whole queue.
        result["resolutionError"] = type(error).__name__
    return result


def resolve_manifest(items: list[dict], *, workers=4, **fetch_options) -> dict:
    if not isinstance(items, list) or not 1 <= len(items) <= 200 or not 1 <= workers <= 6:
        raise ValueError("Expected 1..200 product records and 1..6 workers")
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(lambda item: resolve_product(item, **fetch_options), items))
    return {"schema": "zplay/official-demo-reference-recovery/v1",
            "recordedAtUtc": datetime.now(timezone.utc).isoformat(),
            "scope": "Official product-page references only; launchers and gameplay were not tested",
            "results": results,
            "summary": {status: sum(row["referenceStatus"] == status for row in results)
                        for status in ("MATCHED", "UNAVAILABLE", "AMBIGUOUS")}}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--page", help="Official HTTPS product page")
    source.add_argument("--manifest", type=Path, help="JSON array, or object with games array: officialPage, gameName, gameCategory")
    parser.add_argument("--game-name")
    parser.add_argument("--game-category", help="Exact category; omit to require an absent parameter, or pass '' for explicitly blank")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--attempts", type=int, choices=(1, 2, 3), default=2)
    parser.add_argument("--workers", type=int, choices=range(1, 7), default=4)
    parser.add_argument("--timeout", type=float, default=15)
    args = parser.parse_args()
    if args.page and args.game_name is None:
        parser.error("--page requires --game-name")
    try:
        if args.manifest:
            document = json.loads(args.manifest.read_text(encoding="utf-8"))
            items = document.get("games") if isinstance(document, dict) else document
        else:
            items = [{"officialPage": args.page, "gameName": args.game_name, "gameCategory": args.game_category}]
        report = resolve_manifest(items, workers=args.workers, max_attempts=args.attempts, timeout=args.timeout)
        value = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(value, encoding="utf-8")
        else:
            print(value, end="")
    except (OSError, ValueError, TypeError) as error:
        parser.exit(2, f"Reference recovery failed ({type(error).__name__}); no raw URL or response was printed.\n")


if __name__ == "__main__":
    main()
