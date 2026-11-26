"""Offline reference recovery regressions; no game, wallet or live URL is requested."""
from importlib.util import module_from_spec, spec_from_file_location
from html import escape
import json
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "tools" / "smartsoft_demo_references.py"
spec = spec_from_file_location("smartsoft_demo_references", SOURCE)
refs = module_from_spec(spec)
spec.loader.exec_module(refs)

PAGE = "https://www.smartsoftgaming.com/games/cricket-x"
LAUNCHER = ("http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?"
            "GameCategory=XGames&GameName=CricketX&Token=DEMO&PortalName=DEMO"
            "&&ReturnUrl=https://www.smartsoftgaming.com&Lang=en")


def anchor(url=LAUNCHER):
    return '<a href="' + escape(url, quote=True) + '">Play Demo</a>'


class Response:
    def __init__(self, body, url=PAGE, status=200):
        self.body = body.encode() if isinstance(body, str) else body
        self.url, self.status = url, status
        self.headers = {"Content-Type": "text/html; charset=utf-8"}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass

    def geturl(self):
        return self.url

    def read(self, size):
        return self.body[:size]


class LauncherParsingTests(unittest.TestCase):
    def test_http_reference_is_retained_with_https_transport(self):
        result = refs.select_demo_reference(anchor(), "CricketX", "XGames", PAGE)
        self.assertEqual(result["referenceStatus"], "MATCHED")
        self.assertEqual(result["reference"]["originalHref"], LAUNCHER)
        self.assertEqual(result["reference"]["launchUrl"], LAUNCHER.replace("http:", "https:", 1))
        self.assertTrue(result["reference"]["transportUpgraded"])
        self.assertEqual(result["gameplayStatus"], "NOT_TESTED")
        self.assertFalse(result["liveVerified"])

    def test_related_games_do_not_supply_the_expected_identity(self):
        wrong = LAUNCHER.replace("CricketX", "CricketerX")
        text = anchor(wrong) + anchor()
        selected = refs.select_demo_reference(text, "CricketX", "XGames")
        self.assertEqual(selected["reference"]["gameName"], "CricketX")
        self.assertEqual(refs.select_demo_reference(anchor(wrong), "CricketX", "XGames")["referenceStatus"], "UNAVAILABLE")
        self.assertEqual(refs.select_demo_reference(anchor(), "CricketX", "Slots")["referenceStatus"], "UNAVAILABLE")

    def test_equivalent_http_https_and_query_order_are_one_reference(self):
        simple = LAUNCHER.split("&&")[0]
        reordered = ("https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?"
                     "PortalName=DEMO&Token=DEMO&GameName=CricketX&GameCategory=XGames")
        result = refs.select_demo_reference(anchor(simple) + anchor(reordered), "CricketX", "XGames")
        self.assertEqual(result["referenceStatus"], "MATCHED")
        self.assertEqual(result["matchingCandidateCount"], 1)

    def test_distinct_matching_links_are_ambiguous(self):
        result = refs.select_demo_reference(anchor() + anchor(LAUNCHER.replace("Lang=en", "Lang=fr")), "CricketX", "XGames")
        self.assertEqual(result["referenceStatus"], "AMBIGUOUS")
        self.assertIsNone(result["reference"])

    def test_lookalikes_credentials_ports_and_nonanchors_are_rejected(self):
        for url in (LAUNCHER.replace("ssgportal.com/", "ssgportal.com.evil.test/"),
                    LAUNCHER.replace("http://", "http://person:password@"),
                    LAUNCHER.replace(".com/", ".com:8080/"),
                    LAUNCHER.replace("/GameLauncher/", "/Other/"),
                    LAUNCHER.replace("http://", "https://evil.test/"), LAUNCHER + "#demo",
                    LAUNCHER.replace("eu-server", "eu-server\\")):
            self.assertIsNone(refs.parse_demo_launcher(url))
        self.assertEqual(refs.extract_demo_launchers('<iframe src="' + LAUNCHER + '"></iframe>'), [])
        self.assertEqual(refs.extract_demo_launchers('<a href="' + LAUNCHER + '" href="https://evil.test">x</a>'), [])

    def test_duplicate_or_conflicting_mode_and_identity_are_rejected(self):
        for extra in ("&GameName=CricketerX", "&GAMENAME=CricketX", "&GameCategory=Slots",
                      "&Token=DEMO", "&PortalName=DEMO", "&mode=demo&MODE=demo",
                      "&mode=real", "&playMode=cash", "&realMoney=1", "&isDemo=false"):
            with self.subTest(extra=extra):
                self.assertIsNone(refs.parse_demo_launcher(LAUNCHER + extra))

    def test_private_tokens_and_nested_return_tokens_never_enter_result(self):
        secret = "PRIVATE_SENTINEL"
        invalid = [LAUNCHER.replace("Token=DEMO", "Token=" + secret),
                   LAUNCHER + "&sessionId=" + secret,
                   LAUNCHER.replace("ReturnUrl=https://www.smartsoftgaming.com", "ReturnUrl=https%3A%2F%2Fwww.smartsoftgaming.com%3Ftoken%3D" + secret),
                   LAUNCHER.replace("Token=DEMO", "Token=DEMO_EXH")]
        result = refs.select_demo_reference("".join(anchor(url) for url in invalid), "CricketX", "XGames")
        self.assertEqual(result["referenceStatus"], "UNAVAILABLE")
        self.assertNotIn(secret, json.dumps(result))
        self.assertNotIn("DEMO_EXH", json.dumps(result))

    def test_source_wrappers_and_invalid_return_urls_are_not_guessed(self):
        self.assertIsNone(refs.parse_demo_launcher("https://www.google.com/url?q=" + LAUNCHER))
        self.assertIsNone(refs.parse_demo_launcher(LAUNCHER.replace("ReturnUrl=https://www.smartsoftgaming.com", "ReturnUrl=http://google.com5")))

    def test_empty_category_is_an_explicit_identity(self):
        url = LAUNCHER.replace("GameCategory=XGames", "GameCategory=")
        self.assertEqual(refs.select_demo_reference(anchor(url), "CricketX", "")["referenceStatus"], "MATCHED")
        absent = url.replace("GameCategory=&", "")
        self.assertEqual(refs.select_demo_reference(anchor(absent), "CricketX", None)["referenceStatus"], "MATCHED")
        self.assertIsNone(refs.parse_demo_launcher(absent)["gameCategory"])
        self.assertEqual(refs.select_demo_reference(anchor(absent), "CricketX", "")["referenceStatus"], "UNAVAILABLE")
        self.assertEqual(refs.select_demo_reference(anchor(url), "CricketX", None)["referenceStatus"], "UNAVAILABLE")

    def test_bottle_mania_observed_lowercase_loader_path_is_preserved(self):
        url = ("https://eu-server.ssgportal.com/GameLauncher/loader.aspx?GameCategory=&GameName=BottleMania"
               "&Token=DEMO&PortalName=DEMO&ReturnUrl=https://www.smartsoftgaming.com/")
        result = refs.select_demo_reference(anchor(url), "BottleMania", "", "https://www.smartsoftgaming.com/games/bottle-mania")
        self.assertEqual(result["referenceStatus"], "MATCHED")
        self.assertEqual(result["reference"]["launchUrl"], url)
        self.assertIsNone(refs.parse_demo_launcher(url.replace("loader.aspx", "other.aspx")))

    def test_actual_multi_hot_10_wrapper_is_unwrapped_without_visiting_google(self):
        wrapper = ("https://www.google.com/url?q=https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?"
                   "GameCategory%3DSlots%26GameName%3DMultiHot10%26Token%3DDEMO%26PortalName%3Ddemo"
                   "&sa=D&source=editors&ust=1783957511223679&usg=AOvVaw1-yr2tGhZ9XQ5Wd4UaaSS6")
        page = "https://www.smartsoftgaming.com/games/multi-hot-10-2"
        result = refs.select_demo_reference(anchor(wrapper), "MultiHot10", "Slots", page)
        candidate = result["reference"]
        self.assertEqual(result["referenceStatus"], "MATCHED")
        self.assertEqual(candidate["originalHref"], wrapper)
        self.assertEqual(candidate["launchUrl"], "https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Slots&GameName=MultiHot10&Token=DEMO&PortalName=demo")
        self.assertEqual(candidate["repairs"], [{"code": "GOOGLE_WRAPPER_REMOVED", "levels": 1}])

    def test_nested_duplicate_or_private_wrapper_destinations_are_rejected(self):
        page = "https://www.smartsoftgaming.com/games/multi-hot-10-2"
        wrap = lambda value: "https://www.google.com/url?" + urlencode({"q": value})
        for url in (wrap(wrap(LAUNCHER)), wrap(LAUNCHER.replace("ssgportal.com", "ssgportal.com.evil.test")),
                    wrap(LAUNCHER.replace("Token=DEMO", "Token=PRIVATE_SENTINEL")),
                    wrap(LAUNCHER) + "&q=" + LAUNCHER,
                    wrap(LAUNCHER) + "&session=PRIVATE_SENTINEL"):
            self.assertIsNone(refs.parse_demo_launcher(url, page))

    def test_book_of_bonanza_missing_scheme_is_repaired_only_for_exact_host(self):
        raw = LAUNCHER.replace("http://", "").replace("CricketX", "BookOfBonanza").replace("XGames", "Slots")
        page = "https://www.smartsoftgaming.com/games/book-of-bonanza"
        result = refs.select_demo_reference(anchor(raw), "BookOfBonanza", "Slots", page)
        self.assertEqual(result["reference"]["originalHref"], raw)
        self.assertEqual(result["reference"]["launchUrl"], "https://" + raw)
        self.assertIn({"code": "HTTPS_SCHEME_ADDED"}, result["reference"]["repairs"])
        for invalid in (raw.replace("ssgportal.com", "ssgportal.com.evil.test"), "../" + raw, "evil.test/" + raw):
            self.assertIsNone(refs.parse_demo_launcher(invalid, page))

    def test_wheel_invalid_return_is_repaired_with_specific_official_source(self):
        raw = ("https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=WheelofDestiny"
               "&Token=DEMO&PortalName=demo&ReturnUrl=http://google.com5")
        page = "https://www.smartsoftgaming.com/games/wheel-of-destiny"
        result = refs.select_demo_reference(anchor(raw), "WheelofDestiny", "Games", page)
        candidate = result["reference"]
        self.assertEqual(candidate["originalHref"], raw)
        self.assertEqual(parse_qs(urlsplit(candidate["launchUrl"]).query)["ReturnUrl"], [page])
        self.assertEqual(candidate["repairs"][0]["code"], "INVALID_RETURN_URL_REPLACED")
        self.assertIsNone(refs.parse_demo_launcher(raw))
        self.assertIsNone(refs.parse_demo_launcher(raw, PAGE))
        self.assertIsNone(refs.parse_demo_launcher(raw.replace("http://google.com5", "https://evil.test/?token=PRIVATE_SENTINEL"), page))


class PageRecoveryTests(unittest.TestCase):
    def test_page_only_fetch_does_not_follow_the_demo_link(self):
        requests = []
        def open_url(request, **kwargs):
            requests.append(request.full_url)
            return Response(anchor())
        result = refs.resolve_product({"officialPage": PAGE, "gameName": "CricketX", "gameCategory": "XGames"}, open_url=open_url)
        self.assertEqual(requests, [PAGE])
        self.assertEqual(result["referenceStatus"], "MATCHED")
        self.assertFalse(result["liveVerified"])

    def test_transient_503_then_success_records_both_attempts(self):
        attempts = []
        def open_url(request, **kwargs):
            attempts.append(request.full_url)
            if len(attempts) == 1:
                raise HTTPError(PAGE, 503, "failure with PRIVATE_SENTINEL", {}, None)
            return Response(anchor())
        body, observed = refs.fetch_official_page(PAGE, open_url=open_url, sleep=lambda _: None)
        self.assertIsNotNone(body)
        self.assertEqual([attempt["status"] for attempt in observed["attempts"]], [503, 200])
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(observed))

    def test_timeout_retries_are_bounded(self):
        attempts = []
        def open_url(request, **kwargs):
            attempts.append(1)
            raise URLError(TimeoutError("PRIVATE_SENTINEL"))
        body, observed = refs.fetch_official_page(PAGE, open_url=open_url, sleep=lambda _: None, max_attempts=3)
        self.assertIsNone(body)
        self.assertEqual(len(attempts), 3)
        self.assertEqual(observed["pageStatus"], "TIMED_OUT")
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(observed))

    def test_access_and_missing_pages_are_not_retried(self):
        for code in (401, 403, 404, 429):
            attempts = []
            def open_url(request, **kwargs):
                attempts.append(1)
                raise HTTPError(PAGE, code, "blocked", {}, None)
            body, observed = refs.fetch_official_page(PAGE, open_url=open_url, max_attempts=3)
            self.assertIsNone(body)
            self.assertEqual(len(attempts), 1)
            self.assertEqual(observed["status"], code)

    def test_unsafe_redirects_and_tokenized_pages_fail_before_request(self):
        redirect = refs._OfficialRedirect()
        with self.assertRaises(ValueError):
            redirect.redirect_request(Request(PAGE), None, 302, "Found", {}, "https://evil.test/?token=PRIVATE_SENTINEL")
        calls = []
        result = refs.resolve_product({"officialPage": PAGE + "?token=PRIVATE_SENTINEL", "gameName": "CricketX", "gameCategory": "XGames"}, open_url=lambda *a, **k: calls.append(1))
        self.assertEqual(calls, [])
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(result))

    def test_failed_product_does_not_block_another_product(self):
        vampire_page = "https://www.smartsoftgaming.com/games/vampires"
        vampire_link = LAUNCHER.replace("CricketX", "Vampires").replace("XGames", "Slots")
        def open_url(request, **kwargs):
            if request.full_url == PAGE:
                raise HTTPError(PAGE, 500, "broken", {}, None)
            return Response(anchor(vampire_link), url=vampire_page)
        report = refs.resolve_manifest([
            {"officialPage": PAGE, "gameName": "CricketX", "gameCategory": "XGames"},
            {"officialPage": vampire_page, "gameName": "Vampires", "gameCategory": "Slots"}],
            open_url=open_url, sleep=lambda _: None)
        self.assertEqual([row["referenceStatus"] for row in report["results"]], ["UNAVAILABLE", "MATCHED"])
        self.assertEqual(report["summary"], {"MATCHED": 1, "UNAVAILABLE": 1, "AMBIGUOUS": 0})

    def test_unexpected_failure_is_local_to_one_item(self):
        def fail(*args, **kwargs):
            raise RuntimeError("PRIVATE_SENTINEL")
        report = refs.resolve_manifest([{"officialPage": PAGE, "gameName": "CricketX", "gameCategory": "XGames"}, None], open_url=fail)
        self.assertEqual(report["summary"]["UNAVAILABLE"], 2)
        self.assertNotIn("PRIVATE_SENTINEL", json.dumps(report))


if __name__ == "__main__":
    unittest.main()
