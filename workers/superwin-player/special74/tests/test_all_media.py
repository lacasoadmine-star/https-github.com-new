"""Acquisition must reject credential/executable sources and corrupted cache files."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("all_media", Path(__file__).parents[1] / "tools/fetch-all-media.py")
media = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(media)
URL = "https://static.ssg-public.com/cache/b1/SlotsDemo/Content/Images/Example/sprite.json"


class MediaAcquisitionTests(unittest.TestCase):
    def test_sources_cannot_escape_public_media(self):
        for source in [URL.replace("https:", "http:"), URL.replace(".json", ".js"), URL + "?Token=DEMO", URL.replace("Example", "%2e%2e"), URL.replace("Example", "%252e%252e"), URL.replace("static.ssg-public.com", "evil.test"), URL.replace("static.ssg-public.com", "user:password@static.ssg-public.com"), URL.replace("/Content/", "/api/"), URL + "#session"]:
            with self.subTest(source=source), self.assertRaises(ValueError):
                media.validate_source(source)

    def test_response_signatures_reject_error_pages(self):
        for suffix in (".png", ".mp3", ".webp", ".json", ".atlas.txt"):
            with self.subTest(suffix=suffix), self.assertRaises((ValueError, UnicodeError)):
                media.validate_content(URL.replace(".json", suffix), b"<html>Access denied</html>")

    def test_only_explicit_atlas_references_are_followed(self):
        data = json.dumps({"meta": {"image": "sheet.png", "related_multi_packs": ["sheet-2.json"]}, "url": "arbitrary.png"}).encode()
        self.assertEqual(media.texture_references(URL, data), [URL.replace("sprite.json", "sheet.png"), URL.replace("sprite.json", "sheet-2.json")])

    def test_provider_image_with_mislabeled_extension_retains_detected_mime(self):
        self.assertEqual(media.validate_content(URL.replace(".json", ".webp"), b"\x89PNG\r\n\x1a\nexample"), "image/png")
        self.assertEqual(media.validate_content(URL.replace(".json", ".mp3"), b"RIFFxxxxWAVEexample"), "audio/wav")
        self.assertEqual(media.validate_content(URL.replace(".json", ".otf"), b"\x00\x01\x00\x00example"), "font/ttf")

    def test_texture_names_with_spaces_are_encoded_once(self):
        data = json.dumps({"meta": {"image": "folder%20name/smartsoft symbol.png"}}).encode()
        self.assertEqual(media.texture_references(URL, data), [URL.replace("sprite.json", "folder%20name/smartsoft%20symbol.png")])

    def test_verified_cache_avoids_network_but_corruption_requires_restore(self):
        data = b'{"meta":{"image":"sheet.png"}}'
        previous = {"sha256": media.hashlib.sha256(data).hexdigest(), "bytes": len(data)}
        with tempfile.TemporaryDirectory() as tmp:
            package = Path(tmp)
            path = media.local_path(URL, package)
            path.parent.mkdir(parents=True)
            path.write_bytes(data)
            with patch.object(media.subprocess, "run", side_effect=AssertionError("network should not run")):
                result, _ = media.acquire({"source": URL}, previous, package)
                self.assertTrue(result["reused"])
            path.write_bytes(b"{}")
            with patch.object(media.subprocess, "run", side_effect=RuntimeError("restore attempted")) as network:
                with self.assertRaisesRegex(RuntimeError, "restore attempted"):
                    media.acquire({"source": URL}, previous, package)
                network.assert_called_once()

    def test_changed_upstream_bytes_cannot_replace_a_pinned_asset(self):
        original = b'{"frames":{}}'
        previous = {"sha256": media.hashlib.sha256(original).hexdigest(), "bytes": len(original)}
        with tempfile.TemporaryDirectory() as tmp:
            package = Path(tmp)

            def changed_download(command, **kwargs):
                Path(command[-1]).write_bytes(b'{"frames":{"changed":true}}')
                return media.subprocess.CompletedProcess(command, 0, "", "")

            with patch.object(media.subprocess, "run", side_effect=changed_download):
                with self.assertRaisesRegex(ValueError, "Previously pinned original media changed"):
                    media.acquire({"source": URL}, previous, package)
            self.assertFalse(media.local_path(URL, package).exists())

    def test_interrupted_resume_preserves_unprocessed_pins_without_local_journal(self):
        other = URL.replace("sprite.json", "other.json")
        first = {"source": URL, "sha256": "a" * 64, "bytes": 12}
        second = {"source": other, "sha256": "b" * 64, "bytes": 34}
        sources = {url: {"gameIds": {"001-multi-hot-5"}, "evidence": {"capture.json"}, "declaredBy": set()} for url in (URL, other)}
        # Simulate saving after only the first of two previously pinned assets was
        # reverified, then resuming with only the committed manifest available.
        checkpoint = media.persistent_manifest({URL: first}, {URL: first, other: second}, sources, {}, "now")
        restored = media.load_pins(json.loads(json.dumps(checkpoint)))
        self.assertEqual(len(checkpoint["assets"]), 1)
        self.assertEqual(len(checkpoint["unverifiedPins"]), 1)
        self.assertEqual(restored[other]["sha256"], second["sha256"])
        self.assertEqual(restored[other]["bytes"], second["bytes"])


if __name__ == "__main__":
    unittest.main()
