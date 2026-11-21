"""Integrity and safe-destination tests for the published reference archive."""

import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import warnings
import zipfile

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("evidence_materialize", HERE / "materialize.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class BundleTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="zplay-evidence-test-")
        self.addCleanup(self.temporary.cleanup)
        self.work = Path(self.temporary.name)
        self.root = self.work / "restore"
        self.index = json.loads((HERE / "index.json").read_text())

    def mutated_index(self, change):
        source = self.work / "source"
        source.mkdir(exist_ok=True)
        for part in self.index["archive"]["parts"]:
            shutil.copyfile(HERE / part["file"], source / part["file"])
        change(self.index)
        path = source / "index.json"
        path.write_text(json.dumps(self.index))
        return path

    def test_full_round_trip_and_idempotent_readback(self):
        index = self.mutated_index(lambda data: None)
        self.assertFalse((index.parent / self.index["archive"]["file"]).exists())
        result = MODULE.materialize(index, self.root)
        self.assertEqual(result["writtenFiles"], len(self.index["entries"]))
        self.assertEqual(result["archiveParts"], 8)
        self.assertEqual(result["publicOmissions"], 2)
        for omitted in self.index["publicOmissions"]:
            self.assertNotIn(omitted["path"], {entry["path"] for entry in self.index["entries"]})
            self.assertFalse((self.root / omitted["path"]).exists())
        for entry in self.index["entries"]:
            data = (self.root / entry["path"]).read_bytes()
            self.assertEqual(len(data), entry["bytes"])
            self.assertEqual(hashlib.sha256(data).hexdigest(), entry["sha256"])
        again = MODULE.materialize(index, self.root)
        self.assertEqual(again["writtenFiles"], 0)
        self.assertEqual(again["unchangedFiles"], len(self.index["entries"]))

    def test_changed_existing_destination_blocks_all_writes(self):
        path = self.root / self.index["entries"][-1]["path"]
        path.parent.mkdir(parents=True)
        path.write_bytes(b"different existing evidence")
        with self.assertRaisesRegex(ValueError, "Refusing to overwrite"):
            MODULE.materialize(HERE / "index.json", self.root)
        self.assertEqual([p for p in self.root.rglob("*") if p.is_file()], [path])
        self.assertEqual(path.read_bytes(), b"different existing evidence")

    def test_archive_digest_mismatch_blocks_writes(self):
        index = self.mutated_index(lambda data: data["archive"].update(sha256="0" * 64))
        with self.assertRaisesRegex(ValueError, "Archive SHA-256"):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_entry_digest_mismatch_blocks_writes(self):
        index = self.mutated_index(lambda data: data["entries"][0].update(sha256="0" * 64))
        with self.assertRaisesRegex(ValueError, "Archived image SHA-256"):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_part_digest_mismatch_blocks_all_writes(self):
        index = self.mutated_index(lambda data: data["archive"]["parts"][0].update(sha256="0" * 64))
        with self.assertRaisesRegex(ValueError, "part SHA-256"):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_missing_part_blocks_all_writes(self):
        index = self.mutated_index(lambda data: None)
        (index.parent / self.index["archive"]["parts"][-1]["file"]).unlink()
        with self.assertRaises(FileNotFoundError):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_reordered_parts_rejected_before_restore(self):
        index = self.mutated_index(lambda data: data["archive"]["parts"].reverse())
        with self.assertRaisesRegex(ValueError, "exact ordered"):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_symlink_part_rejected_before_restore(self):
        index = self.mutated_index(lambda data: None)
        part = self.index["archive"]["parts"][0]
        path = index.parent / part["file"]
        path.unlink()
        path.symlink_to(HERE / part["file"])
        with self.assertRaisesRegex(ValueError, "part size or file type"):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_unsafe_or_nonreference_paths_rejected(self):
        for path in ["../outside.jpg", "/absolute.jpg", "codex-work/new-games72-20261121/../outside.jpg",
                     "codex-work//new-games72-20261121/games/roll-x/evidence/a.jpg",
                     "codex-work/new-games72-20261121/games/roll-x/assets/texture.png",
                     "codex-work/new-games72-20261121/games/roll-x/evidence/../a.jpg",
                     "codex-work/new-games72-20261121/games/roll-x/evidence/2026-11-21/a\n.jpg",
                     "codex-work/new-games72-20261121/games/roll-x/evidence/2026-11-21/my-bets-history.jpg",
                     "codex-work/new-games72-20261121/games/roll-x/evidence/2026-11-21/account.png"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                MODULE.reference_path(path)

    def test_symlink_parent_cannot_redirect_restore(self):
        self.root.mkdir()
        outside = self.work / "outside"
        outside.mkdir()
        (self.root / "codex-work").symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symbolic link"):
            MODULE.materialize(HERE / "index.json", self.root)
        self.assertEqual(list(outside.iterdir()), [])

    def test_duplicate_archive_member_rejected_with_even_matching_archive_digest(self):
        index = self.mutated_index(lambda data: None)
        archive = index.parent / self.index["archive"]["file"]
        archive.write_bytes(MODULE.archive_bytes(index.parent, self.index["archive"]))
        self.index["archive"].pop("parts")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            with zipfile.ZipFile(archive, "a", compression=zipfile.ZIP_STORED) as bundle:
                bundle.writestr(self.index["entries"][0]["path"], b"duplicate")
        raw = archive.read_bytes()
        self.index["archive"].update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        index.write_text(json.dumps(self.index))
        with self.assertRaisesRegex(ValueError, "members differ"):
            MODULE.materialize(index, self.root)
        self.assertFalse(self.root.exists())

    def test_verify_only_checks_bundle_without_creating_paths(self):
        result = MODULE.materialize(HERE / "index.json", self.root, verify_only=True)
        self.assertEqual(result["writtenFiles"], 0)
        self.assertEqual(result["missingFiles"], len(self.index["entries"]))
        self.assertFalse(self.root.exists())


if __name__ == "__main__":
    unittest.main()
