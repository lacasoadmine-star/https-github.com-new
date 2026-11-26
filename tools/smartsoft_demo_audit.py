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
from urllib.parse import parse_qsl, urlsplit, urlunsplit

VIEWPORTS = [(360, 780), (390, 844), (430, 932), (1280, 800)]
MAX_SPINS = 7
# These exact public routes were observed from SmartSoft's official demo link
# on 2026-11-25. A name such as /demo on an arbitrary origin is not evidence.
DEMO_LAUNCHER_HOST = "eu-server.ssgportal.com"
DEMO_GAME_HOST = "eu-server-w3.ssgportal.com"
DEMO_GAME_PATH = re.compile(r"^/SlotsDemo/Slots/[A-Za-z0-9_-]+/Game\.aspx$")
# Observed through the public CricketX launcher on 2026-11-26 UTC. This route
# has no demo namespace: recognizing it for diagnostics MUST NOT permit wagers.
CRICKET_GAME_HOST = "eu-server-w5.ssgportal.com"
CRICKET_GAME_PATH = "/CricketX/XGames/CricketX/Board.aspx"


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
        # Historical official catalogue anchors use HTTP. HTTPS on this exact
        # public launcher was verified in the browser; never upgrade arbitrary
        # origins, session-token URLs, or private game frames by inference.
        secure = urlunsplit(("https", parsed.netloc, parsed.path, parsed.query, parsed.fragment))
        if demo_target_kind(secure) == "official-demo-launcher":
            return secure
        raise ValueError("Remote demo URLs must use HTTPS")
    return value


def public_url(value: str) -> str:
    """Drop query and hash: demo links sometimes contain login or session tokens."""
    try:
        p = urlsplit(value)
        hostname = p.hostname or ""
        netloc = hostname + (f":{p.port}" if p.port else "")
        return urlunsplit((p.scheme, netloc, p.path, "", ""))
    except ValueError:
        return "[invalid URL]"


def demo_target_kind(value: str) -> str | None:
    """Recognize observed official demo contracts, never a parent-frame claim.

    The launcher uses public Token=DEMO. Its SlotsDemo iframe receives a private,
    temporary token, so the iframe's exact host and route are the demo evidence.
    Conflicting or duplicate mode parameters always fail closed.
    """
    try:
        if any(char in value for char in "\r\n\t"):
            return None
        p = urlsplit(value)
        if (p.scheme != "https" or p.username or p.password or p.fragment
                or p.port not in (None, 443)):
            return None
        query: dict[str, list[str]] = {}
        for key, item in parse_qsl(p.query, keep_blank_values=True):
            query.setdefault(key.casefold(), []).append(item.casefold())
        for key in ("mode", "playmode", "portalname"):
            if key in query and query[key] != ["demo"]:
                return None
        for key in ("real", "realmoney", "isreal"):
            if key in query and query[key] not in (["false"], ["0"]):
                return None
        for key in ("demo", "isdemo"):
            if key in query and query[key] not in (["true"], ["1"]):
                return None
        if len(query.get("token", [])) > 1:
            return None
        if (p.hostname == DEMO_LAUNCHER_HOST and p.path == "/GameLauncher/Loader.aspx"
                and query.get("portalname") == ["demo"]
                and query.get("token") == ["demo"]
                and len(query.get("gamename", [])) == 1
                and re.fullmatch(r"[a-z0-9_-]+", query["gamename"][0])):
            return "official-demo-launcher"
        if p.hostname == DEMO_GAME_HOST and DEMO_GAME_PATH.fullmatch(p.path):
            return "official-slots-demo-frame"
    except (TypeError, ValueError):
        pass
    return None


def is_explicit_demo(value: str) -> bool:
    return demo_target_kind(value) is not None


def provider_document_kind(value: str) -> str | None:
    """Classify known provider documents for observation only, not interaction."""
    kind = demo_target_kind(value)
    if kind:
        return kind
    try:
        p = urlsplit(value)
        if (p.scheme != "https" or p.username or p.password or p.fragment
                or p.port not in (None, 443)):
            return None
        if p.hostname == CRICKET_GAME_HOST and p.path == CRICKET_GAME_PATH:
            return "observed-cricket-frame"
        if (p.hostname == DEMO_GAME_HOST
                and p.path == "/SlotsDemo/ErrorPages/Error.aspx"):
            return "provider-error-document"
    except (TypeError, ValueError):
        pass
    return None


def http_state(status: int | None) -> str:
    if status is None:
        return "unobserved"
    if status == 404:
        return "not_found"
    if status in (401, 403):
        return "access_denied"
    if status == 429:
        return "rate_limited"
    if 500 <= status <= 599:
        return "upstream_error"
    if 200 <= status <= 299:
        return "responded"
    return "other_http_status"


def record_document_response(response, report: dict) -> None:
    """Observe document responses only, with no bodies, headers or query tokens."""
    try:
        if response.request.resource_type != "document":
            return
        kind = provider_document_kind(response.url)
        if kind is None:
            return
        entry = {"url": public_url(response.url), "documentKind": kind,
                 "httpStatus": response.status, "httpState": http_state(response.status)}
        responses = report.setdefault("documentResponses", [])
        # Bound memory without deduplicating retries that are diagnostically useful.
        if len(responses) < 40:
            responses.append(entry)
    except Exception:
        report.setdefault("notes", []).append("One document response could not be inspected")


def record_renderer_page_error(error, report: dict) -> None:
    """Retain only the observed renderer failure code, never a message/stack/URL."""
    try:
        message = getattr(error, "message", None)
        if not isinstance(message, str):
            message = str(error)
        first_line = message.splitlines()[0].strip() if message else ""
        if first_line not in (
                "CanvasRenderer is not yet implemented",
                "Error: CanvasRenderer is not yet implemented",
                "Uncaught (in promise) Error: CanvasRenderer is not yet implemented"):
            return
        errors = report.setdefault("rendererErrors", [])
        if len(errors) < 10:
            errors.append({"code": "CANVAS_RENDERER_NOT_IMPLEMENTED"})
    except Exception:
        # Diagnostics must not expose raw exception text or interrupt observation.
        pass


def audit_frame(frame) -> dict:
    try:
        return frame.evaluate("""() => {
          const text = document.body?.innerText || '';
          return {
          canvasCount: document.querySelectorAll('canvas').length,
          iframeCount: document.querySelectorAll('iframe').length,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          signals: {
            runtimeError: /Server Error in ['\"][^\\n]*Application\\.|(?:^|\\n)\\s*Runtime Error\\s*(?:\\n|$)/i.test(text),
            regionRestricted: /not available in your country|not available in your region/i.test(text),
            accessDenied: /(?:^|\\n)\\s*(?:Access denied|403 Forbidden|error code: 1010)\\s*(?:\\n|$)/i.test(text),
            visibleDemoCurrency: /\\bDMO\\b/.test(text)
          },
          controls: Array.from(document.querySelectorAll('button,[role=button],input'))
            .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length))
            .slice(0,80).map(el => {
              const b=el.getBoundingClientRect();
              return {role:el.tagName.toLowerCase(),label:(el.getAttribute('aria-label') || el.innerText ||
               el.getAttribute('placeholder') || '').trim().slice(0,75),
               x:Math.round(b.x), y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};
            })
        }}""")
    except Exception as error:
        return {"inspectionError": error.__class__.__name__}


def inspect_page(page) -> list[dict]:
    return [{"url": public_url(frame.url),
             "documentKind": provider_document_kind(frame.url), **audit_frame(frame)}
            for frame in page.frames]


def launch_state(frames: list[dict], responses: list[dict], renderer_errors: list[dict] | None = None) -> str:
    """Keep successful HTTP navigation separate from a rendered, playable game."""
    relevant = [frame for frame in frames if frame.get("documentKind")]
    for flag, state in (("accessDenied", "access_denied"),
                        ("regionRestricted", "region_restricted"),
                        ("runtimeError", "provider_runtime_error")):
        if any(frame.get("signals", {}).get(flag) for frame in relevant):
            return state
    # The current document list may have lost the normal game route on redirect.
    if any(frame.get("documentKind") == "provider-error-document" for frame in relevant):
        return "provider_runtime_error"
    # Use the latest response for each document, not a transient error that was
    # subsequently recovered. Embedded errors must beat an HTTP 200 outer shell.
    current_urls = {frame["url"] for frame in relevant}
    latest = {response["url"]: response for response in responses
              if response["url"] in current_urls}
    for state in ("access_denied", "rate_limited", "not_found", "upstream_error"):
        if any(response.get("httpState") == state for response in latest.values()):
            return state
    # HTTP 200, balances, DOM buttons and even a canvas element may exist behind
    # the loader after renderer initialization fails; they do not prove rendering.
    if any(error.get("code") == "CANVAS_RENDERER_NOT_IMPLEMENTED" for error in (renderer_errors or [])):
        return "render_error"
    if any(frame.get("documentKind") in ("official-slots-demo-frame", "observed-cricket-frame")
           and (frame.get("canvasCount", 0) > 0 or frame.get("controls")) for frame in relevant):
        return "game_interface_observed"
    return "loading_or_unverified"


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
    candidates = []
    for frame in page.frames:
        # A demo parent page may embed a live-money iframe. Never click it.
        frame_url = frame.url
        if demo_target_kind(frame_url) != "official-slots-demo-frame":
            continue
        for label in ("SPIN", "PLAY"):
            button = frame.get_by_role("button", name=re.compile(rf"^{label}$", re.I))
            if button.count() == 1 and button.is_visible() and button.is_enabled():
                candidates.append((frame, frame_url, button, label))
    # Do not choose an arbitrary button when several games or controls match.
    return candidates[0] if len(candidates) == 1 else None


def capture_demo_clicks(page, requested_count: int, confirm_demo: bool, out: Path, report: dict) -> None:
    """Capture acknowledged demo control clicks; no round completion is inferred."""
    if not confirm_demo:
        report["notes"].append("No clicks: demo-only use was not confirmed")
        return
    for index in range(1, requested_count + 1):
        # Check the current page and rediscover the owning frame before EVERY action.
        if report.get("rendererErrors"):
            report["notes"].append("Clicks stopped: a renderer failure was observed")
            break
        if not is_explicit_demo(page.url):
            report["notes"].append("Clicks stopped: current page is not a recognized official demo")
            break
        target = find_spin_button(page)
        if target is None:
            report["notes"].append("Clicks stopped: no unique visible enabled demo SPIN/PLAY button; canvas coordinates are not guessed")
            break
        frame, frame_url, locator, label = target
        handle = locator.element_handle(timeout=1000)
        try:
            if (handle is None or handle.owner_frame() != frame or frame.url != frame_url
                    or demo_target_kind(frame.url) != "official-slots-demo-frame"
                    or not is_explicit_demo(page.url)):
                report["notes"].append("Clicks stopped: control's owning demo frame changed before the action")
                break
            # Resolving the handle/owner can dispatch a pageerror after the
            # loop-entry check. Recheck immediately before recording or clicking.
            if report.get("rendererErrors"):
                report["notes"].append("Clicks stopped: a renderer failure was observed before input")
                break
            # Pin the current element, rather than letting a locator resolve a new
            # document after navigation. Playwright disposes handles on navigation.
            action = {"index": index, "control": label, "frameUrl": public_url(frame_url),
                      "clickStatus": "uncertain", "roundCompletion": "not-observed"}
            report["actions"].append(action)
            report["spinClickCountAttempted"] += 1
            try:
                handle.click(timeout=4500)
            except Exception:
                report["spinClickCountUncertain"] += 1
                # A click may have reached the page before Playwright timed out.
                # Never retry an uncertain action or claim that nothing happened.
                raise
            action["clickStatus"] = "acknowledged"
            report["spinClickCountAcknowledged"] += 1
            page.wait_for_timeout(2600)
            screenshot = f"spin-click-{index:02d}.png"
            page.screenshot(path=str(out / screenshot), full_page=False)
            action["screenshot"] = screenshot
        finally:
            if handle is not None:
                try:
                    handle.dispose()
                except Exception:
                    pass


def capture(args) -> Path:
    url = validate_url(args.url)
    slug = clean_id(args.game_id)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = Path(args.output).resolve() / slug / stamp
    out.mkdir(parents=True, exist_ok=False)
    report = {"reportSchemaVersion": 3, "gameId": slug, "requestedUrl": public_url(url), "capturedAtUTC": stamp,
              "mode": "read-only" if args.spin_count == 0 else "demo-control-audit",
              "spinClickCountRequested": args.spin_count, "spinClickCountAttempted": 0,
              "spinClickCountAcknowledged": 0, "spinClickCountUncertain": 0,
              "roundCountVerified": 0, "audioVerified": False, "gameFPSVerified": False,
              "playableVerified": False, "liveVerified": False, "documentResponses": [], "rendererErrors": [],
              "viewports": [], "actions": [], "notes": [
                  "Control clicks and delayed screenshots do not prove completed game rounds",
                  "Browser RAF is not proof of the game's renderer FPS",
                  "Playwright screenshots do not verify Web Audio output"]}
    browser = None
    page = None
    failure = None
    try:
        from playwright.sync_api import sync_playwright

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
                page.on("response", lambda response: record_document_response(response, report))
                page.on("pageerror", lambda error: record_renderer_page_error(error, report))
                response = page.goto(url, wait_until="domcontentloaded", timeout=45000)
                report["launcherHttpStatus"] = response.status if response is not None else None
                page.wait_for_timeout(1400)
                report["landedUrl"] = public_url(page.url)
                # Titles can be signed URLs on loader/error pages. Do not export them.
                for width, height in VIEWPORTS:
                    page.set_viewport_size({"width": width, "height": height})
                    page.wait_for_timeout(500)
                    screenshot = f"viewport-{width}.png"
                    page.screenshot(path=str(out / screenshot), full_page=False, animations="disabled")
                    report["viewports"].append({"width": width, "height": height, "screenshot": screenshot,
                                                "estimatedBrowserRAF": estimated_raf_fps(page),
                                                "frames": inspect_page(page)})
                report["launchState"] = launch_state(report["viewports"][-1]["frames"],
                                                      report["documentResponses"], report["rendererErrors"])
                if args.spin_count:
                    if report["launchState"] in ("access_denied", "region_restricted", "rate_limited",
                                                  "not_found", "upstream_error", "provider_runtime_error", "render_error"):
                        report["notes"].append("No clicks: provider launch failure was observed")
                    else:
                        capture_demo_clicks(page, args.spin_count, args.confirm_demo, out, report)
                # An exception can also arrive during an optional demo observation.
                report["launchState"] = launch_state(report["viewports"][-1]["frames"],
                                                      report["documentResponses"], report["rendererErrors"])
                if any(frame.get("documentKind") == "observed-cricket-frame"
                       for frame in report["viewports"][-1]["frames"]):
                    report["notes"].append("Cricket X is a crash-game interface; automatic slot SPIN actions do not apply. Its observed route alone does not establish demo currency.")
            finally:
                # Cleanup failures must not expose raw URLs or hide the primary failure.
                for resource in (page, browser if not args.cdp else None):
                    if resource is not None:
                        try:
                            resource.close()
                        except Exception as error:
                            report.setdefault("cleanupErrors", []).append(error.__class__.__name__)
    except Exception as error:
        # Neither the JSON report nor the caller receives the raw browser message.
        failure = error.__class__.__name__
        report["error"] = f"{failure}: audit failed"
    finally:
        (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    if failure:
        raise RuntimeError(f"{failure}: audit failed; private report was saved") from None
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit one SmartSoft game at a time in Playwright")
    parser.add_argument("--url", required=True, help="Official demo/game URL; query tokens never exported")
    parser.add_argument("--game-id", required=True, help="Stable unique slug for this game")
    parser.add_argument("--output", default="qa-artifacts/smartsoft", help="Local evidence directory (never commit)")
    parser.add_argument("--cdp", help="Optional user-managed Chrome CDP endpoint, e.g. http://127.0.0.1:9222")
    parser.add_argument("--headed", action="store_true", help="Show a new browser window (non-CDP mode)")
    parser.add_argument("--spin-count", type=int, default=0, help="0..7 demo control clicks; completed rounds are not inferred")
    parser.add_argument("--confirm-demo", action="store_true", help="Confirm the target only uses demo credits")
    args = parser.parse_args()
    if not 0 <= args.spin_count <= MAX_SPINS:
        parser.error(f"--spin-count must be between 0 and {MAX_SPINS}")
    if args.spin_count and not args.confirm_demo:
        parser.error("--spin-count requires --confirm-demo")
    try:
        result = capture(args)
    except Exception as error:
        # Playwright errors can embed signed URLs, even when they are not RuntimeError.
        parser.exit(2, f"Audit failed ({error.__class__.__name__}); no raw browser error is printed.\n")
    print(f"Local private QA evidence: {result}")


if __name__ == "__main__":
    main()
