"""Exercise private CLI inputs with synthetic local fixtures; no remote calls."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PrivateInputBuilderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.worker = self.root / "worker"
        self.worker.mkdir()
        for name in ("build-staging-artifacts.py", "new74-router.template.mjs", "stage-new74-version.mjs"):
            shutil.copyfile(ROOT / "worker" / name, self.worker / name)
        public = self.root / "public"
        public.mkdir()
        records = []
        for name in ("index.html", "lobby.mjs", "lobby.css", "entry-link.mjs"):
            content = ("fixture " + name).encode()
            (public / name).write_bytes(content)
            records.append({"path": name, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
        for i in range(59):
            content = ("synthetic asset fixture " + str(i)).encode()
            digest = hashlib.sha256(content).hexdigest()
            name = "assets/fresh74/" + digest + ".jpg"
            path = public / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            records.append({"path": name, "bytes": len(content), "sha256": digest})
        (self.root / "build-manifest.json").write_text(json.dumps({"files": records}))
        original = b"export const fixture = true;"
        (self.root / "original.mjs").write_bytes(original)
        self.version = "00000000-0000-4000-8000-000000000001"
        baseline = {
            "metadata": {"id": self.version, "number": 2, "main_module": "new74-entry-r1.mjs"},
            "modules": [{"name": "new74-router-r1.mjs", "content_type": "application/javascript+module", "base64_chars": len(base64.b64encode(original))}],
        }
        (self.root / "baseline.json").write_text(json.dumps(baseline))
        self.command = [sys.executable, str(self.worker / "build-staging-artifacts.py"),
                        "--baseline-index", str(self.root / "baseline.json"),
                        "--original-router", str(self.root / "original.mjs"),
                        "--account-id", "a" * 32,
                        "--expected-version", self.version,
                        "--expected-version-number", "2", "--expected-module-count", "1"]

    def test_explicit_private_inputs_build_local_payload(self):
        result = subprocess.run(self.command, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        review = json.loads((self.worker / "review.json").read_text())
        self.assertEqual(review["remoteCallsPerformedByBuilder"], 0)
        self.assertEqual(review["expectedVersion"], self.version)
        self.assertEqual(review["expectedVersionNumber"], 2)
        self.assertEqual(review["expectedModuleCount"], 1)
        self.assertEqual(review["freshFileCount"], 63)
        payload = json.loads((self.worker / "stage-request.json").read_text())
        self.assertEqual(payload["account_id"], "a" * 32)

    def test_missing_account_input_cannot_use_embedded_target(self):
        command = list(self.command)
        index = command.index("--account-id")
        del command[index:index + 2]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("--account-id", result.stderr)
        self.assertFalse((self.worker / "stage-request.json").exists())

    def test_expected_baseline_mismatch_stops_payload_generation(self):
        command = list(self.command)
        command[command.index("--expected-version-number") + 1] = "3"
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unexpected reviewed baseline", result.stderr)
        self.assertFalse((self.worker / "stage-request.json").exists())


if __name__ == "__main__":
    unittest.main()
