#!/usr/bin/env python3
"""Read-only browser audit for official SmartSoft demos; spins require explicit demo gating.

Playwright screenshots/videos are local evidence, not assets to publish with games.
No credentials, cookies, storage state, request bodies, or auth URLs are exported.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.parse import parse_qs, urlsplit, urlunsplit

VIEWPORTS = [(360, 780), (390, 844), (430, 932), (1280, 800)]
MAX_SPINS = 7


def clean_id(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug or len(slug) > 80:
        raise ValueError("game-id must contain 1 to 80 URL-safe characters")
    return slug


def validate_url(value: str) -> str:
    parsed = urlsplit(value)
    if parsed.username or parsed.password:
        raise ValueError("URLs containing credentials are forbidden")
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("Expected a complete HTTP(S) URL")
    if parsed.scheme != "https" and parsed.hostname not in ("localhost", "127.0.0.1"):
        raise ValueError("Remote demo URLs must use HTTPS")
    return value


def public_url(value: str) -> str:
    """Drop query and hash: demo links sometimes contain login or session tokens."""
    p = urlsplit(value)
    hostname = p.hostname or ""
    netloc = hostname + (f":{p.port}" if p.port else "")
    return urlunsplit((p.scheme, netloc, p.path, "", ""))


def is_explicit_demo(value: str) -> bool:
    p = urlsplit(value)
    path = p.path.lower()
    if "playreal" in path:
        return False
    modes = parse_qs(p.query.lower()).get("mode", []) + parse_qs(p.query.lower()).get("playmode", [])
    return (any(m in ("demo", "practice", "playfree", "freeplay") for m in modes)
            or bool(re.search(r"(?:^|/)(?:demo|practice|playfree|freeplay)(?:/|$)", path)))


def audit_frame(frame) -> dict:
    try:
        return frame.evaluate("""() => ({
          canvasCount: document.querySelectorAll('canvas').length,
          iframeCount: document.querySelectorAll('iframe').length,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          controls: Array.from(document.querySelectorAll('button,[role=button],input'))
            .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length))
            .slice(0,80).map(el => {
              const b=el.getBoundingClientRect();
              return {role:el.tagName.toLowerCase(),label:(el.getAttribute('aria-label') || el.innerText ||
               el.getAttribute('placeholder') || '').trim().slice(0,75),
               x:Math.round(b.x), y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};
            })
        })""")
    except Exception as error:
        return {"inspectionError": error.__class__.__name__}


def estimated_raf_fps(page) -> float | None:
    try:
        return page.evaluate("""() => new Promise(resolve => {
          let ticks = 0, start = performance.now();
          const tick = t => {
            ticks++;
            if(t - start >= 800) resolve(Math.round(ticks * 1000 / (t - start)));
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        })""")
    except Exception:
        return None


def find_spin_button(page):
    for frame in page.frames:
        # A demo parent page may embed a live-money iframe. Never click it.
        if not is_explicit_demo(frame.url):
            continue
        for label in ("SPIN", "PLAY"):
            button = frame.get_by_role("button", name=re.compile(rf"^{label}$", re.I))
            if button.count() > 0:
                return button.first
    return None


def capture(args) -> Path:
    from playwright.sync_api import sync_playwright

    url = validate_url(args.url)
    slug = clean_id(args.game_id)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = Path(args.output).resolve() / slug / stamp
    out.mkdir(parents=True, exist_ok=False)
    report = {"gameId": slug, "requestedUrl": public_url(url), "capturedAtUTC": stamp,
              "mode": "read-only" if args.spin_count == 0 else "demo-spin-audit",
              "spinCountRequested": args.spin_count, "spinCountExecuted": 0,
              "audioVerified": False, "gameFPSVerified": False, "viewports": [], "notes": []}
    browser = None
    page = None
    with sync_playwright() as playwright:
        try:
            if args.cdp:
                # Creates an additional tab in the already signed-in Chrome profile.
                # Never writes browser storage/session exports to disk.
                browser = playwright.chromium.connect_over_cdp(args.cdp)
                context = browser.contexts[0]
                page = context.new_page()
            else:
                browser = playwright.chromium.launch(headless=not args.headed)
                context = browser.new_context(ignore_https_errors=False)
                page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(1400)
            report["landedUrl"] = public_url(page.url)
            report["title"] = page.title()[:120]
            for width, height in VIEWPORTS:
                page.set_viewport_size({"width": width, "height": height})
                page.wait_for_timeout(500)
                screenshot = f"viewport-{width}.png"
                page.screenshot(path=str(out / screenshot), full_page=False, animations="disabled")
                report["viewports"].append({"width": width, "height": height, "screenshot": screenshot,
                                            "estimatedBrowserRAF": estimated_raf_fps(page),
                                            "frames": [{"url": public_url(f.url), **audit_frame(f)} for f in page.frames]})
            if args.spin_count:
                if not args.confirm_demo or not is_explicit_demo(page.url):
                    report["notes"].append("No spins: not confirmed as a demo-only URL")
                else:
                    # A named DOM button is needed; never guess canvas hitbox coordinates.
                    spin = find_spin_button(page)
                    if spin is None:
                        report["notes"].append("No spins: Canvas control requires verified coordinates")
                    else:
                        for index in range(1, args.spin_count + 1):
                            spin.click(timeout=4500)
                            page.wait_for_timeout(2600)
                            page.screenshot(path=str(out / f"spin-{index:02d}.png"), full_page=False)
                            report["spinCountExecuted"] += 1
            report["notes"].append("Browser RAF is not proof of the game's renderer FPS")
            report["notes"].append("Playwright screenshots do not verify Web Audio output")
        except Exception as error:
            # Never persist raw exception messages: they can include signed query URLs.
            report["error"] = f"{error.__class__.__name__}: audit failed"
            raise
        finally:
            (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
            if page is not None:
                page.close()
            if browser is not None and not args.cdp:
                browser.close()
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit one SmartSoft game at a time in Playwright")
    parser.add_argument("--url", required=True, help="Official demo/game URL; query tokens never exported")
    parser.add_argument("--game-id", required=True, help="Stable unique slug for this game")
    parser.add_argument("--output", default="qa-artifacts/smartsoft", help="Local evidence directory (never commit)")
    parser.add_argument("--cdp", help="Optional user-managed Chrome CDP endpoint, e.g. http://127.0.0.1:9222")
    parser.add_argument("--headed", action="store_true", help="Show a new browser window (non-CDP mode)")
    parser.add_argument("--spin-count", type=int, default=0, help="0..7; only explicit demo URLs may be clicked")
    parser.add_argument("--confirm-demo", action="store_true", help="Confirm the target only uses demo credits")
    args = parser.parse_args()
    if not 0 <= args.spin_count <= MAX_SPINS:
        parser.error(f"--spin-count must be between 0 and {MAX_SPINS}")
    if args.spin_count and not args.confirm_demo:
        parser.error("--spin-count requires --confirm-demo")
    try:
        result = capture(args)
    except (ValueError, RuntimeError) as error:
        parser.error(str(error))
    print(f"Local private QA evidence: {result}")


if __name__ == "__main__":
    main()
