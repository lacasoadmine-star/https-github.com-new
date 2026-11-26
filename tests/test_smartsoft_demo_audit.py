"""Offline checks. No production websites, accounts, databases or wallets are used."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "tools" / "smartsoft_demo_audit.py"
spec = spec_from_file_location("smartsoft_demo_audit", SOURCE)
audit = module_from_spec(spec)
spec.loader.exec_module(audit)


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
        self.assertFalse(audit.is_explicit_demo("https://x.test/playreal?x=1"))
        self.assertFalse(audit.is_explicit_demo("https://x.test/playreal?mode=demo"))
        self.assertTrue(audit.is_explicit_demo("https://x.test/launch?mode=demo"))
        self.assertFalse(audit.is_explicit_demo("https://x.test/launch?token=demo-credential"))


if __name__ == "__main__":
    unittest.main()
