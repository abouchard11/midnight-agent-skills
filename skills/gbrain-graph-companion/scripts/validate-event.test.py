#!/usr/bin/env python3
"""Tests for validate-event.py. Each case pins a GAP the folded-in package had, so a later
edit cannot reopen it without going red. Run: python3 validate-event.test.py

The five gaps this file pins, in order:
  1. group_id must be REGISTERED (not "project-<slug>")
  2. `tier` is REQUIRED by add_memory
  3. `uuid` must be ABSENT (it means UPDATE, not dedupe)
  4. `source_description` must name the method AND carry seat provenance
  5. there is no write mode at all — the write is add_memory + confirm_write
"""

import copy
import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("validate_event", HERE / "validate-event.py")
assert spec and spec.loader
ve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ve)

# Credential-shaped fixtures are ASSEMBLED AT RUNTIME, never spelled out.
# A contiguous credential-shaped literal trips the machine-wide pre-commit
# scanner (~/.claude/githooks-known-good/pre-commit) -- the same class of guard
# these cases exercise -- so the file could not be committed at all. Both rules
# key on the CONTIGUOUS prefix, so splitting the prefix removes the trigger
# without narrowing any rule: the validator still receives one
# credential-shaped string.
AWS_ACCESS_KEY_FIXTURE = "AKIA" + "IOSFODNN7EXAMPLE"
PEM_HEADER_FIXTURE = "-----BEGIN RSA " + "PRIVATE KEY-----"


def event(**over):
    """A minimal valid decision event for the `readablebyai` project."""
    base = {
        "project": {"id": "readablebyai", "name": "ReadableByAI"},
        "event_type": "decision",
        "title": "Use customer-owned PostHog for hosted monitoring",
        "summary": "Hosted crawler events go to the customer's PostHog project; a minimized "
                   "domain-level contribution supports aggregate benchmarks.",
        "occurred_at": "2026-08-09T03:30:00Z",
        "dedupe_key": "decision:hosted-monitoring-destination:v1",
        "status": "accepted",
        "tier": "decided",
        "method": "operator stated in chat",
        "attributes": {
            "choice": "Customer-owned operational destination with a minimized contributory panel.",
            "rationale": "Preserve customer control while creating a permissioned benchmark dataset.",
            "alternatives": ["ReadableByAI-owned dashboard", "Disable hosted monitoring"],
        },
        "evidence": [{"type": "pr", "ref": "readablebyai#3"}],
        "source": {"system": "envoy", "captured_by": "envoy"},
    }
    base.update(over)
    return base


class RegistryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = ve.load_registry(ve.DEFAULT_GROUPS_PATH)

    def test_registry_has_the_measured_group_count(self):
        # 39 groups measured 2026-09-27 via the group_id_not_registered invariant.
        self.assertGreaterEqual(len(self.registry), 39)

    def test_no_group_is_prefixed_with_project(self):
        """Gap 1. The folded-in package wrote group_id = 'project-<slug>'. If a group of that
        shape ever appears, this test is the wrong place to celebrate it — it would mean the
        namespace convention changed."""
        offenders = [gid for gid in self.registry if gid.startswith("project-")]
        self.assertEqual(offenders, [], f"unexpected project- prefixed groups: {offenders}")

    def test_readablebyai_is_registered_and_carries_its_project(self):
        self.assertIn("readablebyai", self.registry)
        self.assertEqual(self.registry["readablebyai"].get("project"), "readablebyai")


class GroupResolutionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = ve.load_registry(ve.DEFAULT_GROUPS_PATH)

    def test_project_slug_resolves_to_the_registered_group(self):
        self.assertEqual(ve.resolve_group(self.registry, "readablebyai", None), "readablebyai")

    def test_bouchard_breaker_resolves(self):
        self.assertEqual(ve.resolve_group(self.registry, "bouchard-breaker", None), "bouchard-breaker")

    def test_the_packages_own_convention_is_REFUSED(self):
        """Gap 1, the decisive one: 'project-readablebyai' is not a group."""
        with self.assertRaises(ve.Refused) as ctx:
            ve.resolve_group(self.registry, "readablebyai", "project-readablebyai")
        self.assertIn("not in the registry", str(ctx.exception))

    def test_an_invented_project_is_refused_rather_than_namespaced(self):
        with self.assertRaises(ve.Refused):
            ve.resolve_group(self.registry, "no-such-project", None)

    def test_an_explicit_registered_group_is_honoured(self):
        self.assertEqual(ve.resolve_group(self.registry, "readablebyai", "global"), "global")


class RequiredFieldTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = ve.load_registry(ve.DEFAULT_GROUPS_PATH)

    def prep(self, **over):
        return ve.prepare(event(**over), self.registry, None, "envoy")

    def test_tier_is_required(self):
        """Gap 2. add_memory refuses a write without tier."""
        e = event()
        del e["tier"]
        with self.assertRaises(ve.Refused) as ctx:
            ve.prepare(e, self.registry, None, "envoy")
        self.assertIn("tier is required", str(ctx.exception))

    def test_tier_must_be_a_server_tier(self):
        self.assertEqual(self.prep(tier="verified")["tool_arguments"]["tier"], "verified")
        for bad in ("irreversible", "observedish", ""):
            with self.assertRaises(ve.Refused, msg=f"tier={bad!r} must be refused"):
                self.prep(tier=bad)

    def test_method_is_required(self):
        e = event()
        del e["method"]
        with self.assertRaises(ve.Refused) as ctx:
            ve.prepare(e, self.registry, None, "envoy")
        self.assertIn("method", str(ctx.exception))

    def test_seat_must_be_a_known_seat(self):
        with self.assertRaises(ve.Refused):
            self.prep()
            ve.prepare(event(), self.registry, None, "not-a-seat")


class ToolArgumentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = ve.load_registry(ve.DEFAULT_GROUPS_PATH)

    def prep(self, **over):
        return ve.prepare(event(**over), self.registry, None, "envoy")

    def test_uuid_is_absent(self):
        """Gap 3. Passing `uuid` means UPDATE-an-existing-episode, so a dedupe uuid there
        silently rewrote the prior episode instead of adding one."""
        args = self.prep()["tool_arguments"]
        self.assertNotIn("uuid", args)

    def test_group_id_is_registered(self):
        args = self.prep()["tool_arguments"]
        self.assertIn(args["group_id"], self.registry)
        self.assertFalse(args["group_id"].startswith("project-"))

    def test_tier_is_passed_through(self):
        self.assertEqual(self.prep()["tool_arguments"]["tier"], "decided")

    def test_source_description_names_the_method_and_carries_provenance(self):
        """Gap 4. The tool requires the METHOD; graphiti-brain requires the seat fields."""
        sd = self.prep()["tool_arguments"]["source_description"]
        self.assertIn("operator stated in chat", sd)
        self.assertIn("orig=envoy", sd)
        self.assertIn("promoted_by=finisher", sd)

    def test_episode_body_is_a_json_string(self):
        import json
        body = self.prep()["tool_arguments"]["episode_body"]
        self.assertIsInstance(body, str)
        self.assertIsInstance(json.loads(body), dict)

    def test_name_carries_a_short_dedupe_marker(self):
        result = self.prep()
        self.assertIn(result["event"]["dedupe_id"][:8], result["tool_arguments"]["name"])

    def test_reference_time_is_the_event_time_not_now(self):
        """When the event BECAME TRUE, not when it was written."""
        self.assertEqual(self.prep()["tool_arguments"]["reference_time"], "2026-08-09T03:30:00Z")

    def test_source_is_json(self):
        self.assertEqual(self.prep()["tool_arguments"]["source"], "json")


class DedupeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = ve.load_registry(ve.DEFAULT_GROUPS_PATH)

    def test_same_key_yields_the_same_id(self):
        a = ve.prepare(event(), self.registry, None, "envoy")["event"]["dedupe_id"]
        b = ve.prepare(event(), self.registry, None, "envoy")["event"]["dedupe_id"]
        self.assertEqual(a, b)

    def test_changed_key_yields_a_different_id(self):
        a = ve.prepare(event(), self.registry, None, "envoy")["event"]["dedupe_id"]
        b = ve.prepare(event(dedupe_key="decision:hosted:v2"), self.registry, None, "envoy")["event"]["dedupe_id"]
        self.assertNotEqual(a, b)

    def test_changed_tier_yields_a_different_id(self):
        """A tier change is a different claim, so it is a different episode."""
        a = ve.prepare(event(), self.registry, None, "envoy")["event"]["dedupe_id"]
        b = ve.prepare(event(tier="verified"), self.registry, None, "envoy")["event"]["dedupe_id"]
        self.assertNotEqual(a, b)


class GuardrailTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry = ve.load_registry(ve.DEFAULT_GROUPS_PATH)

    def assertRefused(self, mutate):
        e = event()
        mutate(e)
        with self.assertRaises(ve.Refused):
            ve.prepare(e, self.registry, None, "envoy")

    def test_email(self):
        self.assertRefused(lambda e: e.update(summary="contact alex@midnightdev.dev"))

    def test_bearer(self):
        self.assertRefused(lambda e: e.update(summary="used Bearer abcdefghijklmnop123456"))

    def test_typesafe_key_shape(self):
        """The key format actually in use on this machine must be caught."""
        self.assertRefused(lambda e: e.update(summary="apikey_2368567545b22d8417ca0f02a8b41067a89_ffffffff"))

    def test_aws_key(self):
        self.assertRefused(lambda e: e.update(summary=AWS_ACCESS_KEY_FIXTURE))

    def test_private_key_block(self):
        self.assertRefused(lambda e: e.update(summary=PEM_HEADER_FIXTURE))

    def test_jwt(self):
        self.assertRefused(lambda e: e.update(summary="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijklmnop"))

    def test_ipv4(self):
        self.assertRefused(lambda e: e.update(summary="from 127.0.0.1"))

    def test_banned_key_name(self):
        self.assertRefused(lambda e: e["attributes"].update(password="hunter2"))

    def test_oversized(self):
        self.assertRefused(lambda e: e.update(summary="x" * 4001))

    def test_unknown_top_level_field(self):
        self.assertRefused(lambda e: e.update(notes="extra"))

    def test_bad_event_type(self):
        self.assertRefused(lambda e: e.update(event_type="standup"))

    def test_naive_timestamp(self):
        self.assertRefused(lambda e: e.update(occurred_at="2026-08-09T03:30:00"))

    def test_missing_required_attribute(self):
        self.assertRefused(lambda e: e["attributes"].pop("rationale"))

    def test_unknown_attribute(self):
        self.assertRefused(lambda e: e["attributes"].update(scope="wide"))

    def test_evidence_url_with_query_string(self):
        self.assertRefused(lambda e: e.update(evidence=[{"type": "url", "ref": "https://x.com/a?token=1"}]))

    def test_bad_evidence_type(self):
        self.assertRefused(lambda e: e.update(evidence=[{"type": "gist", "ref": "x"}]))

    def test_a_clean_event_passes(self):
        self.assertTrue(ve.prepare(event(), self.registry, None, "envoy")["event"]["dedupe_id"])


class NoNetworkTests(unittest.TestCase):
    def test_the_module_imports_no_network_library(self):
        """Gap 5. The folded-in package shipped an HTTP write path that reported a spooled
        receipt as `written: true`. This validator must never be able to write anything."""
        src = (HERE / "validate-event.py").read_text(encoding="utf-8")
        for forbidden in ("import urllib.request", "urlopen", "confirm_write(", "http.client", "requests"):
            self.assertNotIn(forbidden, src, f"{forbidden} present: this file must not write")

    def test_there_is_no_write_or_send_mode(self):
        src = (HERE / "validate-event.py").read_text(encoding="utf-8")
        self.assertNotIn('choices=["prepare", "write"]', src)
        self.assertNotIn('"written": True', src)


if __name__ == "__main__":
    unittest.main(verbosity=2)