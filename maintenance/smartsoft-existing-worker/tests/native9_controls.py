"""Deployed native frontends with isolated browser-only financial API fixtures.

No real player identity is used. Every action request is fulfilled locally or
aborted, never forwarded. Test credits and receipts are not production funds.
"""
import asyncio
import copy
import json
import re
import sys
import time
import uuid
from pathlib import Path

from playwright.async_api import async_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://superwin-player.apdiy61.workers.dev"
SOURCE = ROOT / "reports/native9"
OUTPUT = ROOT / "reports/native9-browser"
OUTPUT.mkdir(exist_ok=True)
IDS = [
    "multihot100_native", "habeshafortune5_native", "multihotwildways_native",
    "multihot5wild_native", "multihot5superwilds_native", "multihotdeluxe_native",
    "burningice_native", "burningice10_native", "burningice40_native",
]


def cents(value):
    whole, fraction = value.split(".")
    return int(whole) * 100 + int(fraction)


def money(value):
    return f"{value // 100}.{value % 100:02d}"


class Fixture:
    def __init__(self, game_id):
        self.game = json.loads((SOURCE / (game_id + "-game.json")).read_text())
        self.game.update(launchable=True, published=True)
        self.game_id = game_id
        self.balance = 10000
        self.round = None
        self.requests = []
        self.blocked = []
        self.session = "isolated-fixture-" + str(uuid.uuid4())
        self.settlements = 0

    def state(self):
        return {
            "authenticated": True, "currency": "ETB", "demo": False,
            "demoCreditsOnly": False, "sessionId": self.session,
            "balance": money(self.balance), "round": copy.deepcopy(self.round),
            "accepting": True, "other_active_game": None,
            "game": {"id": self.game_id, "version": self.game["version"],
                     "publicConfig": copy.deepcopy(self.game), "launchable": True},
        }

    async def route(self, route):
        request = route.request
        path = request.url.split("?")[0].split(ORIGIN)[-1]
        if path == "/api/machine-session":
            return await route.fulfill(json={"authenticated": True})
        if path == "/api/remaining20/state":
            return await route.fulfill(json=self.state())
        if path == "/api/remaining20/history":
            return await route.fulfill(json={"currency": "ETB", "game_id": self.game_id,
                                            "sessionId": self.session, "rows": []})
        if path == "/api/remaining20/action":
            body = request.post_data_json
            self.requests.append(body)
            assert body["type"] == "start", body
            assert body["game_id"] == self.game_id
            assert body["model_version"] == self.game["version"]
            uuid.UUID(body["request_id"])
            assert request.headers["x-zplay-library-session"] == self.session
            assert len(self.requests) == 1, "STOP must never submit a second round"
            amount = cents(body["stake"])
            assert amount > 0 and amount <= self.balance
            # This is a supplied no-win receipt for presentation testing. The
            # actual backend's RNG and monetary outcomes are not exercised.
            symbols = [str(s["id"]) for s in self.game["symbols"] if str(s["id"]) in ["1", "2", "3", "4", "5", "6", "7"]]
            assert symbols
            grid = [[symbols[c % len(symbols)] for r in range(self.game["rows"])]
                    for c in range(self.game["columns"])]
            round_data = {
                "round_id": str(uuid.uuid4()), "game_id": self.game_id,
                "model_version": self.game["version"], "version": 1,
                "status": "settled", "stakeMinor": str(amount),
                "payoutMinor": "0", "baseWinMinor": "0", "currentCashoutMinor": "0",
                "grid": grid, "wins": [], "frames": [], "actions": [],
                "feature": {"multiplier": 1, "frozenReels": [], "coinReels": [], "addedWilds": []},
            }
            await asyncio.sleep(1.2)
            self.balance -= amount
            self.round = round_data
            self.settlements += 1
            return await route.fulfill(json={**self.state(), "status": "SUCCESS",
                                            "request_id": body["request_id"], "game_id": self.game_id})
        if "/api/" in path and request.method not in ["GET", "HEAD", "OPTIONS"]:
            self.blocked.append({"path": path, "method": request.method})
            return await route.abort()
        return await route.continue_()


async def click_native(page, selector):
    locator = page.locator(selector)
    await expect(locator).to_be_visible(timeout=20000)
    await expect(locator).to_be_enabled(timeout=20000)
    box = await locator.bounding_box()
    assert box and box["width"] > 2 and box["height"] > 2, selector
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    blocked = await locator.evaluate("""(element,point)=>{
      const top=document.elementFromPoint(point.x,point.y);
      return !top||!element.contains(top)&&top!==element
        ? {tag:top?.tagName,id:top?.id,className:top?.className,inert:element.closest('[inert]')?.id,
           startupPhase:document.querySelector('#startupCover')?.dataset.phase}:null
    }""", {"x": x, "y": y})
    assert not blocked, {"selector": selector, "blocked": blocked}
    await page.mouse.click(x, y)


async def audit(browser, game_id):
    fixture = Fixture(game_id)
    context = await browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = await context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.route("**/*", fixture.route)
    started = time.monotonic()
    checks = []
    try:
        response = await page.goto(ORIGIN + "/games/" + game_id, wait_until="domcontentloaded", timeout=45000)
        assert response.status == 200
        # Wait for the real renderer's sound-choice gate, including slow asset
        # decoding. A fixed sleep can race its transparent fading overlay.
        for _ in range(100):
            phase = await page.locator("#startupCover").get_attribute("data-phase")
            if phase == "sound":
                await page.locator("#startupNo").click(timeout=5000)
                break
            if phase in ["open", "uncovered", "recovery"]:
                break
            await page.wait_for_timeout(400)
        await expect(page.locator("#startupCover")).to_be_hidden(timeout=10000)
        await expect(page.locator('[data-control="play"]')).to_be_enabled(timeout=20000)
        checks.append("Native art loads and sound-choice gate releases the controls")
        await page.screenshot(path=str(OUTPUT / (game_id + "-ready-fixture.png")))

        await click_native(page, '[data-control="menu"],button[aria-label="Game menu"]')
        await expect(page.locator("#menuDialog")).to_be_visible(timeout=5000)
        labels = await page.locator("#menuDialog button").evaluate_all("es=>es.map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()).filter(Boolean)")
        checks.append({"menuOpens": True, "availableMenuButtons": labels})
        await page.keyboard.press("Escape")

        bet = page.locator('[data-control="bet"]')
        if await bet.count() and await bet.is_visible() and await bet.is_enabled():
            await click_native(page, '[data-control="bet"]')
            await expect(page.locator("#betDialog")).to_be_visible(timeout=10000)
            checks.append("Bet control opens its actual native dialog")
            await page.keyboard.press("Escape")

        await click_native(page, '[data-control="play"]')
        for _ in range(50):
            if fixture.requests:
                break
            await page.wait_for_timeout(20)
        assert len(fixture.requests) == 1, "SPIN should submit one isolated fixture request"
        await click_native(page, '[data-control="play"]')
        assert len(fixture.requests) == 1
        checks.append("SPIN then native STOP sends one action request only")
        await expect(page.locator('[data-control="play"]')).to_be_enabled(timeout=15000)
        for _ in range(100):
            if fixture.settlements == 1 and await page.locator("#wallet").inner_text() == money(fixture.balance):
                break
            await page.wait_for_timeout(100)
        assert fixture.settlements == 1
        assert await page.locator("#wallet").inner_text() == money(fixture.balance)
        assert len(fixture.requests) == 1
        checks.append("Verified test receipt renders the resulting test balance without another round")

        sizes = []
        for width, height in [(320, 568), (390, 844), (844, 390)]:
            await page.set_viewport_size({"width": width, "height": height})
            await page.wait_for_timeout(180)
            dims = await page.evaluate("()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})")
            assert dims["scrollWidth"] <= width and dims["scrollHeight"] <= height, dims
            sizes.append(dims)
        checks.append({"phoneViewportChecks": sizes})
        assert not errors, errors
        return {"id": game_id, "status": "passed", "checks": checks, "fixtureRequests": len(fixture.requests),
                "fixtureSettlements": fixture.settlements, "realWagers": 0, "realDatabaseWrites": 0,
                "blockedOtherWrites": fixture.blocked, "elapsedSeconds": round(time.monotonic() - started, 2)}
    except Exception as error:
        diagnostics = await page.evaluate("()=>({url:location.href,startupPhase:document.querySelector('#startupCover')?.dataset.phase,inert:document.querySelector('#machineShell')?.inert,text:document.body.innerText.slice(-1200)})")
        await page.screenshot(path=str(OUTPUT / (game_id + "-failure.png")))
        return {"id": game_id, "status": "failed", "error": str(error)[:2500], "checks": checks,
                "diagnostics": diagnostics, "pageErrors": errors, "fixtureRequests": len(fixture.requests),
                "fixtureSettlements": fixture.settlements, "realWagers": 0, "realDatabaseWrites": 0}
    finally:
        await context.close()


async def main():
    selected = [value for value in sys.argv[1:] if value in IDS] or IDS
    results = []
    semaphore = asyncio.Semaphore(2)
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox", "--disable-dev-shm-usage"])

        async def run(game_id):
            async with semaphore:
                result = await audit(browser, game_id)
                results.append(result)
                report = {"scope": "Actual deployed frontends with isolated financial API fixtures; no real account, wager or ledger mutation", "games": results}
                (ROOT / "reports/native9-browser-verification.json").write_text(json.dumps(report, indent=2) + "\n")
                print(json.dumps({key: result.get(key) for key in ["id", "status", "error", "fixtureRequests", "fixtureSettlements"]}), flush=True)

        await asyncio.gather(*(run(game_id) for game_id in selected))
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
