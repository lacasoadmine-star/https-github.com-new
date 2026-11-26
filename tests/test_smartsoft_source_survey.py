"""Offline regressions for source catalogue selection and product-page recovery."""
from importlib.util import module_from_spec, spec_from_file_location
from html import escape
from pathlib import Path
from urllib.parse import urlencode
import unittest
from unittest.mock import patch

SOURCE = (Path(__file__).resolve().parents[1] / "codex-work" / "new-games90-20261123"
          / "references" / "survey-current-sources.py")
spec = spec_from_file_location("smartsoft_source_survey", SOURCE)
survey = module_from_spec(spec)
spec.loader.exec_module(survey)

CRICKET = ("http://eu-server.ssgportal.com/GameLauncher/Loader.aspx?"
           "GameCategory=XGames&GameName=CricketX&Token=DEMO&PortalName=DEMO&Lang=en")
VAMPIRES = CRICKET.replace("CricketX", "Vampires").replace("XGames", "Slots")


def anchor(url):
    return '<a href="' + escape(url, quote=True) + '">Play Demo</a>'


def card(name, slug, url):
    return ('<div role="listitem"><p fs-cmsfilter-field="name">' + name + '</p>'
            '<a href="/games/' + slug + '">Details</a>' + anchor(url)
            + '<p fs-cmsfilter-field="category">Slots</p></div>')


def observation(*links, base_url=None):
    return {"status": 200, "pageStatus": "FETCHED",
            "officialDemoLinks": survey.extract_demo_launchers("".join(anchor(url) for url in links), base_url)}


class SourceSurveyTests(unittest.TestCase):
    def test_cricket_and_vampires_http_links_are_no_longer_discarded(self):
        products = survey.parse_catalog(card("Cricket X", "cricket-x", CRICKET) + card("Vampires", "vampires", VAMPIRES))
        self.assertEqual([product["officialDemoHref"] for product in products], [CRICKET, VAMPIRES])
        self.assertEqual([product["demoGameName"] for product in products], ["CricketX", "Vampires"])
        self.assertTrue(all(product["officialDemoLaunchUrl"].startswith("https://") for product in products))

    def test_fresh_exact_product_link_wins_over_stale_catalogue(self):
        product = survey.parse_catalog(card("Cricket X", "cricket-x", CRICKET))[0]
        fresh = CRICKET.replace("http:", "https:", 1) + "&ReturnUrl=https://www.smartsoftgaming.com"
        result = survey.reconcile_product_reference(product, observation(VAMPIRES, fresh))
        self.assertEqual(result["referenceStatus"], "MATCHED")
        self.assertEqual(result["reference"]["originalHref"], fresh)
        self.assertEqual(result["source"], "PRODUCT_PAGE")
        self.assertEqual(product["officialDemoHref"], CRICKET)

    def test_missing_fresh_identity_does_not_reuse_stale_or_related_game(self):
        product = survey.parse_catalog(card("Cricket X", "cricket-x", CRICKET))[0]
        result = survey.reconcile_product_reference(product, observation(VAMPIRES))
        self.assertEqual(result["referenceStatus"], "UNAVAILABLE")
        self.assertIsNone(result["reference"])

    def test_ambiguous_page_cannot_select_its_first_link(self):
        product = survey.parse_catalog(card("Cricket X", "cricket-x", CRICKET))[0]
        result = survey.reconcile_product_reference(product, observation(CRICKET, CRICKET.replace("Lang=en", "Lang=fr")))
        self.assertEqual(result["referenceStatus"], "AMBIGUOUS")
        self.assertIsNone(result["reference"])

    def test_failed_page_remains_unavailable_despite_a_catalogue_reference(self):
        product = survey.parse_catalog(card("Cricket X", "cricket-x", CRICKET))[0]
        result = survey.reconcile_product_reference(product, {"status": 500, "pageStatus": "HTTP_ERROR"})
        self.assertEqual(result["referenceStatus"], "UNAVAILABLE")
        self.assertEqual(result["reason"], "PRODUCT_PAGE_UNAVAILABLE")

    def test_private_or_wrapped_catalogue_links_are_not_used_as_identity(self):
        for url in (CRICKET.replace("Token=DEMO", "Token=DEMO_EXH"), "https://google.com/url?q=" + CRICKET):
            product = survey.parse_catalog(card("Cricket X", "cricket-x", url))[0]
            self.assertEqual(product["referenceStatus"], "UNAVAILABLE")
            self.assertIsNone(product["officialDemoHref"])
            result = survey.reconcile_product_reference(product, observation(CRICKET))
            self.assertEqual(result["reason"], "CATALOGUE_IDENTITY_UNAVAILABLE")

    def test_page_fetch_only_exports_valid_public_demo_links(self):
        text = '<h1>Cricket X</h1>' + anchor(CRICKET) + anchor(CRICKET.replace("Token=DEMO", "Token=PRIVATE_SENTINEL"))
        with patch.object(survey, "fetch_official_page", return_value=(text.encode(), {"status": 200, "pageStatus": "FETCHED"})):
            result = survey.fetch("https://www.smartsoftgaming.com/games/cricket-x")
        self.assertEqual(result["officialDemoHrefs"], [CRICKET])
        self.assertEqual(result["headings"], ["Cricket X"])

    def test_unexpected_page_failure_does_not_abort_survey_processing(self):
        with patch.object(survey, "fetch_official_page", side_effect=RuntimeError("PRIVATE_SENTINEL")):
            result = survey.fetch("https://www.smartsoftgaming.com/games/cricket-x")
        self.assertEqual(result["pageStatus"], "FETCH_ERROR")
        self.assertEqual(result["errorType"], "RuntimeError")
        self.assertNotIn("PRIVATE_SENTINEL", str(result))

    def test_three_observed_malformed_source_links_are_recovered_transparently(self):
        mh10 = CRICKET.replace("CricketX", "MultiHot10").replace("XGames", "Slots").replace("http:", "https:", 1)
        raw_wrapper = "https://www.google.com/url?" + urlencode({"q": mh10})
        bonanza = CRICKET.replace("http://", "").replace("CricketX", "BookOfBonanza").replace("XGames", "Slots")
        wheel = ("https://eu-server.ssgportal.com/GameLauncher/Loader.aspx?GameCategory=Games&GameName=WheelofDestiny"
                 "&Token=DEMO&PortalName=demo&ReturnUrl=http://google.com5")
        examples = [("Multi Hot 10", "multi-hot-10-2", raw_wrapper, "GOOGLE_WRAPPER_REMOVED"),
                    ("Book of Bonanza", "book-of-bonanza", bonanza, "HTTPS_SCHEME_ADDED"),
                    ("Wheel Of Destiny", "wheel-of-destiny", wheel, "INVALID_RETURN_URL_REPLACED")]
        for title, slug, raw, repair in examples:
            with self.subTest(title=title):
                product = survey.parse_catalog(card(title, slug, raw))[0]
                self.assertEqual(product["referenceStatus"], "MATCHED")
                self.assertEqual(product["officialDemoHref"], raw)
                self.assertEqual(product["referenceRepairs"][0]["code"], repair)
                fresh = observation(VAMPIRES, raw, base_url=product["officialPage"])
                result = survey.reconcile_product_reference(product, fresh)
                self.assertEqual(result["referenceStatus"], "MATCHED")
                self.assertEqual(result["reference"]["originalHref"], raw)

    def test_absent_category_remains_distinct_from_explicitly_blank(self):
        absent = CRICKET.replace("GameCategory=XGames&", "")
        blank = CRICKET.replace("GameCategory=XGames", "GameCategory=")
        product = survey.parse_catalog(card("Cricket X", "cricket-x", absent))[0]
        self.assertIsNone(product["demoGameCategory"])
        self.assertEqual(survey.reconcile_product_reference(product, observation(absent))["referenceStatus"], "MATCHED")
        self.assertEqual(survey.reconcile_product_reference(product, observation(blank))["referenceStatus"], "UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
