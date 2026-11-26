"""Acquisition must reject credential/executable sources and corrupted cache files."""
import importlib.util
import json
from pathlib import Path
import tempfile
import struct
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
        for suffix in (".png", ".mp3", ".webp", ".json", ".atlas.txt", ".atlas", ".svg", ".skel"):
            with self.subTest(suffix=suffix), self.assertRaises((ValueError, UnicodeError)):
                media.validate_content(URL.replace(".json", suffix), b"<html>Access denied</html>")

    def test_passive_svg_gradients_are_preserved_but_code_and_network_are_rejected(self):
        source = URL.replace(".json", ".svg")
        art = b'<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gold"/></defs><path fill="url(#gold)" d="M0 0h1v1z"/></svg>'
        self.assertEqual(media.validate_content(source, art), "image/svg+xml")
        for fragment in ['<script>alert(1)</script>', '<path onload="alert(1)"/>', '<use href="https://example.com/image.svg"/>', '<path style="fill:url(https://example.com/p.png)"/>', '<style>@import "https://example.com/style.css";</style>', '<foreignObject/>']:
            with self.subTest(fragment=fragment), self.assertRaises(ValueError):
                media.validate_content(source, ('<svg>'+fragment+'</svg>').encode())
        with self.assertRaises(ValueError):
            media.validate_content(source, b'<!DOCTYPE svg [<!ENTITY remote SYSTEM "file:///etc/passwd">]><svg>&remote;</svg>')

    def test_spine_atlas_and_binary_animation_headers_are_media_not_scripts(self):
        atlas = URL.replace(".json", ".atlas")
        data = b'\nsheet.png\nsize: 512,512\nfilter: Linear,Linear\nregion\n  bounds: 1,1,10,10\n'
        self.assertEqual(media.validate_content(atlas, data), "text/plain")
        self.assertEqual(media.texture_references(atlas, data), [URL.replace("sprite.json", "sheet.png")])
        source = URL.replace(".json", ".skel")
        modern = b'12345678\x074.2.43'+struct.pack('>ffff', 0, 0, 560, 1105)+b'\x00'
        older = b'\x05hash\x073.8.99'+struct.pack('>ffff', 0, 0, 560, 1105)+b'\x00'
        for skeleton in (modern, older):
            self.assertEqual(media.validate_content(source, skeleton), "application/octet-stream")
        for invalid in (modern[:10], b'function game(){return 42}', b'12345678\x074.2.43'+struct.pack('>ffff', 0, 0, float('nan'), 1)+b'\x00'):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                media.validate_content(source, invalid)

    def test_only_explicit_atlas_references_are_followed(self):
        data = json.dumps({"meta": {"image": "sheet.png", "related_multi_packs": ["sheet-2.json"]}, "url": "arbitrary.png"}).encode()
        self.assertEqual(media.texture_references(URL, data), [URL.replace("sprite.json", "sheet.png"), URL.replace("sprite.json", "sheet-2.json")])

    def test_reference_stylesheets_follow_only_declared_media_and_reject_active_payloads(self):
        source = URL.replace("sprite.json", "style.css")
        css = b'/* background: url(ignored.png) */ @font-face{font-family:Intro;src:url("../Fonts/intro.woff2")} .bet{background:url(button.png);color:#fff}'
        self.assertEqual(media.validate_content(source, css), "text/css")
        self.assertEqual(media.validate_content(source, b'body{scroll-behavior:smooth}'), "text/css")
        self.assertEqual(media.validate_content(source, b'\xef\xbb\xbf'), "text/css")
        self.assertEqual(media.texture_references(source, css), [URL.replace("Example/sprite.json", "Fonts/intro.woff2"), URL.replace("sprite.json", "button.png")])
        for data in (b'<html>Not found</html>', b'body{background:expression(alert(1))}', b'a{background:url(javascript:alert(1))}', b'{"error":"404"}'):
            with self.subTest(data=data), self.assertRaises(ValueError):
                media.validate_content(source, data)

    def test_provider_image_with_mislabeled_extension_retains_detected_mime(self):
        self.assertEqual(media.validate_content(URL.replace(".json", ".webp"), b"\x89PNG\r\n\x1a\nexample"), "image/png")
        self.assertEqual(media.validate_content(URL.replace(".json", ".mp3"), b"RIFFxxxxWAVEexample"), "audio/wav")
        self.assertEqual(media.validate_content(URL.replace(".json", ".otf"), b"\x00\x01\x00\x00example"), "font/ttf")

    def test_texture_names_with_spaces_are_encoded_once(self):
        data = json.dumps({"meta": {"image": "folder%20name/smartsoft symbol.png"}}).encode()
        self.assertEqual(media.texture_references(URL, data), [URL.replace("sprite.json", "folder%20name/smartsoft%20symbol.png")])
        self.assertEqual(media.encoded_url(URL.replace("sprite.json", "literal%2Fname.png")), URL.replace("sprite.json", "literal%2Fname.png"))

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
