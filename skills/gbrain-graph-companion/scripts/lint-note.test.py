#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("lint_note", Path(__file__).with_name("lint-note.py"))
assert spec and spec.loader
lint_note_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lint_note_mod)
lint_note = lint_note_mod.lint_note


class LintNoteTests(unittest.TestCase):
    def test_good_verified_passes(self):
        text = (ROOT / "examples/good-verified.md").read_text()
        self.assertEqual(lint_note(text), [])

    def test_paid_without_closed_node_fails(self):
        text = (ROOT / "examples/bad-paid-open.md").read_text()
        errors = lint_note(text)
        self.assertTrue(any("irreversible claim" in e for e in errors))

    def test_observed_fails(self):
        text = (ROOT / "examples/bad-observed.md").read_text()
        errors = lint_note(text)
        self.assertTrue(any("tier" in e for e in errors))
        self.assertTrue(any("closer" in e or "model" in e for e in errors))

    def test_secret_fails(self):
        text = """---
tier: verified
lane: gbrain
closer: script
verifier: npm test exit 0
---

key sk_live_abc123 should never be stored
"""
        errors = lint_note(text)
        self.assertTrue(any("secret" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
