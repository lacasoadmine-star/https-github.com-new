"""Offline checks. No production websites, accounts, databases or wallets are used."""
from importlib.util import module_from_spec, spec_from_file_location
from contextlib import contextmanager, redirect_stderr
from io import StringIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / "tools" / "smartsoft_demo_audit.py"
spec = spec_from_file_location("smartsoft_demo_audit", SOURCE)
audit = module_from_spec(spec)
spec.loader.exec_module(audit)

LAUNCHER = ("https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?"
            "GameName=MultiHot5BurnWilds&PortalName=DEMO&Token=DEMO")
GAME = ("https://eu-server-w3.ssgportal.com/SlotsDemo/Slots/MultiHot5BurnWilds/"
        "Game.aspx?Token=PRIVATE-DEMO-TOKEN&JurisdictionName=RO")
REAL_GAME = GAME.replace("/SlotsDemo/", "/")


def empty_report():
    return {"spinClickCountAttempted": 0, "spinClickCountAcknowledged": 0,
            "spinClickCountUncertain": 0, "roundCountVerified": 0, "actions": [], "notes": []}


class FakeButton:
    def __init__(self, frame, label="SPIN"):
        self.frame = frame
        self.label = label
        self.clicks = 0
        self.visible = self.enabled = True
        self.on_click = None

    def owner_frame(self):
        return self.frame

    def click(self, **kwargs):
        self.clicks += 1
        if self.on_click:
            self.on_click()

    def dispose(self):
        pass


class FakeLocator:
    def __init__(self, frame, button):
        self.frame, self.button = frame, button

    def count(self):
        return 1 if self.button else 0

    def is_visible(self):
        return self.button.visible

    def is_enabled(self):
        return self.button.enabled

    def element_handle(self, **kwargs):
        if self.frame.on_resolve:
            self.frame.on_resolve()
        return self.button


class FakeFrame:
    def __init__(self, url=GAME):
        self.url = url
        self.button = FakeButton(self)
        self.on_resolve = None

    def get_by_role(self, role, name):
        assert role == "button"
        return FakeLocator(self, self.button if name.fullmatch(self.button.label) else None)

    def evaluate(self, expression):
        return {"canvasCount": 1, "controls": []}


class FakePage:
    def __init__(self, frames=None, url=LAUNCHER):
        self.frames = frames if frames is not None else [FakeFrame()]
        self.url = url
        self.goto_error = self.screenshot_error = self.close_error = None

    def goto(self, url, **kwargs):
        if self.goto_error:
            raise self.goto_error
        self.url = url

    def screenshot(self, **kwargs):
        if self.screenshot_error:
            raise self.screenshot_error

    def wait_for_timeout(self, milliseconds):
        pass

    def set_viewport_size(self, size):
        pass

    def title(self):
        return "Official demo"

    def evaluate(self, expression):
        return 60

    def close(self):
        if self.close_error:
            raise self.close_error


@contextmanager
def mocked_playwright(page):
    context = SimpleNamespace(new_page=lambda: page)
    browser = SimpleNamespace(new_context=lambda **kw: context, close=lambda: None)
    runtime = SimpleNamespace(chromium=SimpleNamespace(launch=lambda **kw: browser))

    @contextmanager
    def sync_playwright():
        yield runtime

    with patch.dict("sys.modules", {"playwright.sync_api": SimpleNamespace(sync_playwright=sync_playwright)}):
        yield


class AuditSafetyTests(unittest.TestCase):
    def test_slug_and_traversal(self):
        self.assertEqual(audit.clean_id("Safari Simba / Game #1"), "safari-simba-game-1")
        with self.assertRaises(ValueError):
            audit.clean_id("../")

    def test_url_rules(self):
        with self.assertRaises(ValueError):
            audit.validate_url("http://zplaybet.xyz/play")
        with self.assertRaises(ValueError):
            audit.validate_url("https://user:pass@x.test/demo")
        self.assertEqual(audit.validate_url("https://smartsoftgaming.com/demo"),
                         "https://smartsoftgaming.com/demo")
        self.assertEqual(audit.validate_url("http://localhost:4177"), "http://localhost:4177")

    def test_token_redaction(self):
        self.assertEqual(audit.public_url("https://eu02-server-w3.ssgportal.com/d?token=SECRET#key"),
                         "https://eu02-server-w3.ssgportal.com/d")

    def test_protect_real_mode(self):
        for url in ("https://x.test/playreal?x=1", "https://x.test/playreal?mode=demo",
                    "https://x.test/launch?mode=demo", "https://x.test/demo",
                    "https://x.test/launch?token=demo-credential", REAL_GAME):
            with self.subTest(url=audit.public_url(url)):
                self.assertFalse(audit.is_explicit_demo(url))

    def test_observed_official_launcher_and_frame_are_recognized(self):
        self.assertEqual(audit.demo_target_kind(LAUNCHER), "official-demo-launcher")
        self.assertEqual(audit.demo_target_kind(GAME), "official-slots-demo-frame")

    def test_conflicting_duplicate_or_private_launcher_parameters_are_rejected(self):
        for extra in ("&mode=real", "&playmode=cash", "&mode=demo&mode=real",
                      "&mode=demo&playmode=real", "&PortalName=real", "&realMoney=1",
                      "&isDemo=false", "&Token=PRIVATE", "&mode=demo&MODE=demo"):
            with self.subTest(extra=extra):
                self.assertFalse(audit.is_explicit_demo(LAUNCHER + extra))
                self.assertFalse(audit.is_explicit_demo(GAME + extra))
        self.assertFalse(audit.is_explicit_demo(LAUNCHER.replace("Token=DEMO", "Token=PRIVATE")))

    def test_unverified_origins_and_url_shapes_are_rejected(self):
        for url in (GAME.replace(".ssgportal.com", ".ssgportal.com.evil.test"),
                    GAME.replace("eu-server-w3", "unobserved-server"),
                    GAME.replace("https:", "http:"),
                    GAME.replace("https://", "https://user:password@"),
                    GAME.replace(".com/", ".com:8443/"),
                    GAME.replace("/SlotsDemo/", "/Demo/"),
                    GAME + "#mode=real"):
            self.assertFalse(audit.is_explicit_demo(url))


class AuditActionTests(unittest.TestCase):
    def test_demo_parent_does_not_authorize_real_money_iframe(self):
        page = FakePage([FakeFrame(REAL_GAME)])
        report = empty_report()
        audit.capture_demo_clicks(page, 7, True, Path("/unused"), report)
        self.assertEqual(page.frames[0].button.clicks, 0)
        self.assertEqual(report["spinClickCountAttempted"], 0)

    def test_navigation_to_real_frame_stops_next_click(self):
        frame = FakeFrame()
        frame.button.on_click = lambda: setattr(frame, "url", REAL_GAME)
        report = empty_report()
        audit.capture_demo_clicks(FakePage([frame]), 7, True, Path("/unused"), report)
        self.assertEqual(frame.button.clicks, 1)
        self.assertEqual(report["spinClickCountAcknowledged"], 1)
        self.assertEqual(report["roundCountVerified"], 0)

    def test_each_action_rediscovers_the_current_control(self):
        frame = FakeFrame()
        first = frame.button
        second = FakeButton(frame)
        first.on_click = lambda: setattr(frame, "button", second)
        report = empty_report()
        audit.capture_demo_clicks(FakePage([frame]), 2, True, Path("/unused"), report)
        self.assertEqual((first.clicks, second.clicks), (1, 1))
        self.assertNotIn("PRIVATE-DEMO-TOKEN", json.dumps(report))

    def test_frame_navigation_during_resolution_blocks_the_action(self):
        frame = FakeFrame()
        frame.on_resolve = lambda: setattr(frame, "url", REAL_GAME)
        report = empty_report()
        audit.capture_demo_clicks(FakePage([frame]), 1, True, Path("/unused"), report)
        self.assertEqual(frame.button.clicks, 0)

    def test_button_owner_must_still_be_the_verified_frame(self):
        frame = FakeFrame()
        frame.button.frame = FakeFrame(REAL_GAME)
        report = empty_report()
        audit.capture_demo_clicks(FakePage([frame]), 1, True, Path("/unused"), report)
        self.assertEqual(frame.button.clicks, 0)

    def test_parent_navigation_stops_further_actions(self):
        page = FakePage()
        page.frames[0].button.on_click = lambda: setattr(page, "url", "https://zplaybet.xyz/en/")
        report = empty_report()
        audit.capture_demo_clicks(page, 7, True, Path("/unused"), report)
        self.assertEqual(page.frames[0].button.clicks, 1)

    def test_canvas_missing_controls_ambiguity_and_disabled_buttons_are_not_guessed(self):
        for condition in ("canvas", "disabled", "hidden", "ambiguous"):
            page = FakePage()
            button = page.frames[0].button
            if condition == "canvas":
                button.label = ""
            elif condition == "disabled":
                button.enabled = False
            elif condition == "hidden":
                button.visible = False
            else:
                page.frames.append(FakeFrame())
            report = empty_report()
            audit.capture_demo_clicks(page, 1, True, Path("/unused"), report)
            self.assertEqual(button.clicks, 0, condition)

    def test_click_is_not_misreported_as_a_completed_round(self):
        report = empty_report()
        audit.capture_demo_clicks(FakePage(), 7, True, Path("/unused"), report)
        self.assertEqual(report["spinClickCountAcknowledged"], 7)
        self.assertEqual(report["roundCountVerified"], 0)
        self.assertTrue(all(a["roundCompletion"] == "not-observed" for a in report["actions"]))
        self.assertNotIn("spinCountExecuted", report)

    def test_screenshot_failure_does_not_erase_acknowledged_click(self):
        page = FakePage()
        page.screenshot_error = OSError("screenshot failed")
        report = empty_report()
        with self.assertRaises(OSError):
            audit.capture_demo_clicks(page, 1, True, Path("/unused"), report)
        self.assertEqual(report["spinClickCountAcknowledged"], 1)
        self.assertEqual(report["roundCountVerified"], 0)

    def test_timed_out_click_is_uncertain_and_never_retried(self):
        frame = FakeFrame()

        def fail_after_click():
            raise TimeoutError("timeout after input")

        frame.button.on_click = fail_after_click
        report = empty_report()
        with self.assertRaises(TimeoutError):
            audit.capture_demo_clicks(FakePage([frame]), 7, True, Path("/unused"), report)
        self.assertEqual(frame.button.clicks, 1)
        self.assertEqual(report["spinClickCountAcknowledged"], 0)
        self.assertEqual(report["spinClickCountUncertain"], 1)
        self.assertEqual(report["actions"][0]["clickStatus"], "uncertain")


class AuditErrorTests(unittest.TestCase):
    def test_page_title_cannot_export_a_private_signed_url(self):
        page = FakePage()
        with TemporaryDirectory() as directory, mocked_playwright(page), \
                patch.object(page, "title", return_value=GAME) as title:
            args = SimpleNamespace(url=LAUNCHER, game_id="burn-wilds", output=directory,
                                   spin_count=0, cdp=None, headed=False, confirm_demo=False)
            report_path = audit.capture(args) / "report.json"
            report_text = report_path.read_text()
            self.assertNotIn("title", json.loads(report_text))
            self.assertNotIn("PRIVATE-DEMO-TOKEN", report_text)
            title.assert_not_called()

    def test_capture_sanitizes_browser_and_cleanup_failures(self):
        page = FakePage()
        page.goto_error = TimeoutError("navigation failed: " + GAME)
        page.close_error = RuntimeError("closing " + GAME)
        with TemporaryDirectory() as directory, mocked_playwright(page):
            args = SimpleNamespace(url=LAUNCHER, game_id="burn-wilds", output=directory,
                                   spin_count=0, cdp=None, headed=False, confirm_demo=False)
            with self.assertRaises(RuntimeError) as raised:
                audit.capture(args)
            self.assertNotIn("PRIVATE-DEMO-TOKEN", str(raised.exception))
            self.assertTrue(raised.exception.__suppress_context__)
            report = json.loads(next(Path(directory).rglob("report.json")).read_text())
            self.assertEqual(report["error"], "TimeoutError: audit failed")
            self.assertEqual(report["cleanupErrors"], ["RuntimeError"])
            self.assertNotIn("PRIVATE-DEMO-TOKEN", json.dumps(report))

    def test_cli_does_not_print_raw_exception_traceback_or_url(self):
        stderr = StringIO()
        with patch("sys.argv", ["audit", "--url", LAUNCHER, "--game-id", "burn-wilds"]), \
                patch.object(audit, "capture", side_effect=Exception("private failure " + GAME)), \
                redirect_stderr(stderr):
            with self.assertRaises(SystemExit) as raised:
                audit.main()
        self.assertEqual(raised.exception.code, 2)
        self.assertNotIn("PRIVATE-DEMO-TOKEN", stderr.getvalue())
        self.assertNotIn("Traceback", stderr.getvalue())
        self.assertIn("Audit failed", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
