#!/usr/bin/env python3
"""Contract test for daily-compounding's deterministic stage.

The skill's `## Verification` list is prose. Prose drifts. This file pins the
deterministic half of that list so an edit to compounding-sensor.py that drops a
required field goes RED instead of silently producing a briefing that looks
complete but is missing the metrics the whole skill exists to emit.

Deliberately NOT tested here (they belong to the model stage, which is
additive and non-authoritative): the R/Y/B classification lines, Today's Plan,
and Delegated Today. Those are validated by diffing a real run's output.

Run: python3 sensor.test.py
"""

import importlib.util
import re
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "compounding_sensor", HERE / "compounding-sensor.py"
)
assert spec and spec.loader
cs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cs)


class ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.health = cs.job_health(__import__("time").time())
        cls.flow = cs.aging(__import__("time").time())

    # -- box: job health ---------------------------------------------------

    def test_job_health_counts_are_present(self):
        for key in ("total", "scheduled", "paused", "failing"):
            self.assertIn(key, self.health)
            self.assertIsInstance(self.health[key], int)

    def test_scheduled_and_paused_partition_the_total(self):
        """A job that is neither scheduled nor paused would vanish from the report."""
        self.assertEqual(
            self.health["total"], self.health["scheduled"] + self.health["paused"]
        )

    def test_a_job_with_a_delivery_error_counts_as_failing(self):
        """failure_streak stays 0 when only delivery fails, so the streak alone
        under-reports. Six jobs sat in exactly that state."""
        fake = [{
            "id": "x", "name": "x", "state": "scheduled",
            "failure_streak": 0, "last_status": "delivery_failed",
            "last_delivery_error": "Telegram send failed: Chat not found",
        }]
        import json
        import tempfile
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            json.dump(fake, fh)
            path = Path(fh.name)
        try:
            h = cs.job_health(__import__("time").time(), files=[path])
        finally:
            path.unlink(missing_ok=True)
        self.assertEqual(h["failing"], 1)
        self.assertEqual(h["silent_delivery"], 1)

    # -- box: aging, as numbers -------------------------------------------

    def test_aging_reports_a_numeric_oldest_for_both_queues(self):
        if not self.flow.get("available"):
            self.skipTest("ledger.db not readable in this environment")
        for key in ("ungraded_oldest", "pending_oldest"):
            val = self.flow[key]
            # None is legal only when the queue is genuinely empty.
            if val is not None:
                self.assertIsInstance(val, float)
                self.assertGreaterEqual(val, 0.0)

    def test_aging_excludes_diagnostic_runs(self):
        """`cad brief` excludes DIAGNOSTIC_RUNS from every open-loop count. If the
        sensor does not, the two surfaces report different numbers for the same
        queue (measured 2026-09-29: 16 vs 13)."""
        prefixes, _src = cs.diagnostic_prefixes()
        self.assertTrue(prefixes, "diagnostic prefixes must not be empty")
        for p in prefixes:
            self.assertTrue(cs.is_diagnostic(p + "-000000", prefixes))
        self.assertFalse(cs.is_diagnostic("20260101-000000", prefixes))

    def test_thresholds_are_consistent_with_the_counts(self):
        if not self.flow.get("available"):
            self.skipTest("ledger.db not readable in this environment")
        # each threshold is a subset of the pending queue, nested by span
        self.assertLessEqual(self.flow["over7"], self.flow["pending"])
        self.assertLessEqual(self.flow["over14"], self.flow["over7"])
        self.assertLessEqual(self.flow["over30"], self.flow["over14"])

    # -- box: rendered output carries every required marker ---------------

    def test_rendered_output_contains_the_contract_markers(self):
        import io
        import contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            cs.main()
        out = buf.getvalue()

        self.assertIn("## Job health", out)
        self.assertIn("## Aging / flow", out)
        self.assertRegex(out, r"\d+ jobs: \*\*\d+ scheduled, \d+ paused\*\*")
        self.assertIn("failing or last-status-blocked:", out)
        self.assertRegex(out, r"ungraded decisions: \*\*\d+\*\*")
        self.assertRegex(out, r"unexecuted commitments: \*\*\d+\*\*")
        self.assertIn("crossed thresholds:", out)
        self.assertRegex(out, r"7d direction: \*\*(draining|holding|ACCUMULATING)\*\*")
        # trend, not bare totals
        self.assertIn("(Δ", out)


if __name__ == "__main__":
    unittest.main(verbosity=2)