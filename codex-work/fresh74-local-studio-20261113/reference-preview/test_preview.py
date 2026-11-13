#!/usr/bin/env python3
"""Regression checks for evidence boundaries, offline packaging and local API."""
import base64
import hashlib
import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest import mock


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


builder = load("preview_builder", "build-preview.py")
server_module = load("preview_server", "server.py")
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOioAAAAASUVORK5CYII=")


class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.evidence = self.root / "fresh"
        self.evidence.mkdir()
        self.output = self.root / "bundle"
        self.image = self.evidence / "frame.png"
        self.image.write_bytes(PNG)
        self.sha = hashlib.sha256(PNG).hexdigest()
        self.manifest_path = self.evidence / "manifest.json"
        self.manifest = {"catalogueCapturedAt": "2026-11-13T12:00:00Z", "updatedAt": "2026-11-13T12:10:00Z", "entries": []}
        for index in range(1, 75):
            self.manifest["entries"].append({"index": index, "name": f"Fixture {index}", "status": "failed-renderer", "attempted": True,
                "finishedAttempt": True, "screenshots": [{"path": str(self.image), "sha256": self.sha, "at": "2026-11-13T12:01:00Z", "label": "Test fixture"}],
                "poster": str(self.image), "posterVerification": {"path": str(self.image), "sha256": self.sha, "visualType": "failure-loader"},
                "sampledDurationSeconds": None, "completeReferenceCapture": False, "fullMinuteGameplayVerified": False})

    def build(self):
        self.manifest_path.write_text(json.dumps(self.manifest))
        return builder.build(self.manifest_path, self.evidence, self.output)

    def start_server(self):
        self.build()
        service = server_module.make_server(self.output)
        thread = threading.Thread(target=service.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(lambda: (service.shutdown(), service.server_close(), thread.join()))
        return service

    def request(self, service, method, path, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", service.server_port, timeout=3)
        connection.request(method, path, headers=headers or {})
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_offline_snapshot_has_all_74_and_unchanged_original_bytes(self):
        result = self.build()
        self.assertEqual(result["counts"]["titles"], 74)
        self.assertEqual(result["counts"]["needsRetry"], 74)
        self.assertEqual(result["counts"]["audioCaptures"], 0)
        self.assertEqual(result["counts"]["completeReferenceCaptures"], 0)
        self.assertEqual(result["mediaFiles"], 1)
        data = json.loads((self.output / "catalogue.json").read_text())
        self.assertEqual((self.output / data["entries"][0]["poster"]["url"]).read_bytes(), PNG)
        self.assertEqual(data["entries"][0]["poster"]["width"], 1)
        self.assertTrue((self.output / "catalogue-data.js").read_text().startswith("window.FRESH74_DATA = "))
        self.assertIn("catalogue-data.js", (self.output / "index.html").read_text())
        self.assertNotIn(str(self.evidence), (self.output / "catalogue.json").read_text())

    def test_newly_missing_files_remain_visible_and_retryable(self):
        self.image.unlink()
        result = self.build()
        self.assertEqual(result["counts"]["titles"], 74)
        self.assertGreater(result["missingMedia"], 0)
        data = json.loads((self.output / "catalogue.json").read_text())
        self.assertIsNone(data["entries"][0]["poster"])
        self.assertFalse(data["entries"][0]["completeReferenceCapture"])

    def test_hash_mismatch_fails_closed(self):
        self.image.write_bytes(PNG + b"changed")
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            self.build()

    def test_manifest_identity_hashes_the_exact_snapshot_that_was_parsed(self):
        self.manifest["updatedAt"] = "before"
        self.manifest_path.write_text(json.dumps(self.manifest))
        expected = hashlib.sha256(self.manifest_path.read_bytes()).hexdigest()
        copy = builder.shutil.copy2
        changed = False

        def copying(source, destination):
            nonlocal changed
            result = copy(source, destination)
            if not changed:
                changed = True
                newer = dict(self.manifest, updatedAt="after")
                self.manifest_path.write_text(json.dumps(newer))
            return result

        with mock.patch.object(builder.shutil, "copy2", side_effect=copying):
            builder.build(self.manifest_path, self.evidence, self.output)
        data = json.loads((self.output / "catalogue.json").read_text())
        self.assertEqual(data["sourceUpdatedAt"], "before")
        self.assertEqual(data["buildId"], expected)
        self.assertNotEqual(data["buildId"], hashlib.sha256(self.manifest_path.read_bytes()).hexdigest())

    def test_changed_copy_is_rejected_before_it_becomes_packaged_evidence(self):
        copy = builder.shutil.copy2

        def corrupted_copy(source, destination):
            result = copy(source, destination)
            Path(destination).write_bytes(PNG + b"changed during copy")
            return result

        with mock.patch.object(builder.shutil, "copy2", side_effect=corrupted_copy):
            with self.assertRaisesRegex(ValueError, "Copied media hash mismatch"):
                self.build()
        self.assertFalse((self.output / "media" / (self.sha + ".png")).exists())
        self.assertEqual(list((self.output / "media").glob("*.pending")), [])

    def test_evidence_outside_fresh_run_or_symlink_is_rejected(self):
        outside = self.root / "older.png"
        outside.write_bytes(PNG)
        self.manifest["entries"][0]["screenshots"][0]["path"] = str(outside)
        with self.assertRaisesRegex(ValueError, "escapes"):
            self.build()
        link = self.evidence / "linked.png"
        link.symlink_to(outside)
        self.manifest["entries"][0]["screenshots"][0]["path"] = str(link)
        with self.assertRaisesRegex(ValueError, "escapes"):
            self.build()

    def test_inventory_rejects_duplicate_or_missing_title(self):
        self.manifest["entries"][73]["index"] = 73
        with self.assertRaisesRegex(ValueError, "exactly"):
            self.build()

    def test_relocated_fresh_run_uses_only_its_declared_original_prefix(self):
        self.manifest["evidenceRoot"] = "/original/fresh-run"
        for entry in self.manifest["entries"]:
            entry["screenshots"][0]["path"] = "/original/fresh-run/frame.png"
            entry["poster"] = "/original/fresh-run/frame.png"
            entry["posterVerification"]["path"] = "/original/fresh-run/frame.png"
        result = self.build()
        self.assertEqual(result["mediaFiles"], 1)
        self.manifest["entries"][0]["poster"] = "/original/older-run/frame.png"
        with self.assertRaisesRegex(ValueError, "escapes"):
            self.build()

    def test_silent_clip_requires_export_verification_and_hash(self):
        clip = self.evidence / "fake.mp4"
        clip.write_bytes(b"test fixture, not a video")
        summary = self.evidence / "summary.json"
        summary.write_text(json.dumps({"exportType": "timestamped-screenshot-sample-playback", "containsAudioTrack": True, "verification": {"audioStreamCount": 1}}))
        self.manifest["entries"][0].update(clip=str(clip), clipSummary=str(summary))
        with self.assertRaisesRegex(ValueError, "has not been verified"):
            self.build()

    def test_local_api_checkpoint_retains_failures_and_rejects_mutation(self):
        service = self.start_server()
        code, _, body = self.request(service, "GET", "/api/progress")
        self.assertEqual(code, 200)
        data = json.loads(body)
        self.assertEqual(len(data["retryableTitles"]), 74)
        self.assertFalse(data["providerRequests"])
        self.assertEqual(data["counts"]["completeReferenceCaptures"], 0)
        self.assertEqual(self.request(service, "POST", "/api/checkpoint")[0], 405)
        self.assertEqual(self.request(service, "GET", "/api/progress", {"Host": "attacker.invalid"})[0], 403)
        self.assertEqual(self.request(service, "GET", "/api/progress", {"Origin": "https://attacker.invalid"})[0], 403)

    def test_range_playback_and_traversal_boundaries(self):
        service = self.start_server()
        media = f"/media/{self.sha}.png"
        status, headers, body = self.request(service, "GET", media, {"Range": "bytes=0-7"})
        self.assertEqual(status, 206)
        self.assertEqual(body, PNG[:8])
        self.assertEqual(headers["Content-Range"], f"bytes 0-7/{len(PNG)}")
        self.assertEqual(self.request(service, "GET", media, {"Range": "bytes=999999-"})[0], 416)
        status, headers, body = self.request(service, "HEAD", media)
        self.assertEqual(status, 200)
        self.assertEqual(int(headers["Content-Length"]), len(PNG))
        self.assertEqual(body, b"")
        self.assertEqual(self.request(service, "GET", "/%2e%2e/private.json")[0], 403)
        outside = self.root / "private.json"
        outside.write_text('{"secret":"fixture"}')
        (self.output / "escape.json").symlink_to(outside)
        self.assertEqual(self.request(service, "GET", "/escape.json")[0], 403)
        self.assertEqual(self.request(service, "GET", "/media/")[0], 403)

    def test_parent_root_redirect_preserves_relative_asset_resolution(self):
        self.output = self.root / "local-app" / "reference-preview"
        self.build()
        service = server_module.make_server(self.output.parent)
        thread = threading.Thread(target=service.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(lambda: (service.shutdown(), service.server_close(), thread.join()))
        for route in ("/", "/reference-preview/"):
            status, headers, _ = self.request(service, "GET", route)
            self.assertEqual(status, 302)
            self.assertEqual(headers["Location"], "/reference-preview/index.html")
        for route in ("/reference-preview/index.html", "/reference-preview/style.css", "/reference-preview/catalogue-data.js"):
            self.assertEqual(self.request(service, "GET", route)[0], 200)


if __name__ == "__main__":
    unittest.main(verbosity=2)
