#!/usr/bin/env python3
"""Validate a project-memory event against the LIVE Graphiti contract, and emit the exact
add_memory arguments. Prepare-only: this never touches the network.

Why this exists instead of the package it was folded in from
-----------------------------------------------------------
`record-graphiti-memory` (v1.0, 2026-08-09) carried a good idea — a schema, a credential
guard, and a deterministic dedupe id — and five assumptions that this graph does not share.
Each was checked against the running server, not against a doc:

  1. `group_id` was `"project-" + slug`. The registry (~/dev/graphiti/groups.yaml, D-mem-004)
     holds 39 groups and not one begins with `project-`. A write there lands in a namespace no
     scoped query reaches, and flips the `group_id_not_registered` invariant to warn.
  2. `tier` was omitted. `add_memory` REQUIRES it. The write is refused, not warned about.
  3. `uuid` was set to the dedupe uuid. The tool documents `uuid` as "only to UPDATE an
     existing episode ... leave unset for a new write" — so the idempotency trick silently
     rewrote the prior episode instead of adding one. Dedupe here is search-then-write.
  4. `source_description` was free text. It must name THE METHOD that produced the content.
  5. It shipped a `write` mode over HTTP that printed `written: true` for any non-error
     response. `add_memory` returns a receipt (`status: "spooled"`) and saves NOTHING until
     `confirm_write` says `landed`. The native MCP tools are the write path.

What is kept from it: the event schema, the credential/PII guard, and the deterministic
dedupe identity — none of which `add_memory` provides (it has no content-hash guard).

Usage
-----
    python3 validate-event.py --input event.json
    python3 validate-event.py --input - --seat envoy
    python3 validate-event.py --input event.json --groups /path/to/groups.yaml

Exit 0 = valid, and stdout carries the exact arguments. Exit 2 = refused, with the reason on
stderr. A refusal is free: the server refuses before spooling, so fixing and resending cannot
duplicate. That is why this refuses rather than warns.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import uuid
from datetime import datetime
from typing import Any, NoReturn

SCHEMA_VERSION = "2.0"
# Fixed namespace so the same (project, type, dedupe_key) always yields the same identity,
# across machines and runs.
DEDUPE_NAMESPACE = uuid.UUID("da1c7ea3-ef66-4ad1-9261-30358043b8d9")

DEFAULT_GROUPS_PATH = os.path.expanduser("~/dev/graphiti/groups.yaml")

EVENT_TYPES = {"decision", "incident", "release", "legal_version", "experiment"}
STATUSES = {
    "proposed", "accepted", "superseded", "open", "resolved",
    "failed", "succeeded", "rolled_back", "published",
}
ATTRIBUTE_FIELDS = {
    "decision": ({"choice", "rationale"}, {"alternatives", "consequences"}),
    "incident": ({"impact", "resolution"}, {"cause", "prevention"}),
    "release": ({"version", "changes", "verification"}, {"environment"}),
    "legal_version": ({"document", "version", "material_changes"}, {"effective_date", "approval_status"}),
    "experiment": ({"hypothesis", "metric", "result", "decision"}, {"method"}),
}
EVIDENCE_TYPES = {"commit", "pr", "deployment", "test", "document", "url", "other"}
# The server's tiers. NOT the companion skill's trust tiers (observed/verified/decided/
# irreversible); `derived` exists only here, and `irreversible` does not exist here at all.
SERVER_TIERS = {"observed", "derived", "verified", "decided"}
SEATS = {"forge", "recon", "finisher", "sparring", "envoy"}

BANNED_KEYS = re.compile(
    r"(^|_)(password|passwd|secret|token|api_?key|private_?key|authorization|cookie|"
    r"headers?|raw_?(log|event|request|payload|body)|request_?body|customer_?(data|id)|"
    r"user_?id|email|ip_?address|access_?log)(_|$)",
    re.IGNORECASE,
)
SECRET_PATTERNS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"\b(?:sk|pk|rk|ghp|github_pat|xox[baprs])-[-A-Za-z0-9_]{12,}\b", re.IGNORECASE),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    # Catches the shape of the TypeSafe key as well as `Bearer <jwt>`.
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+\-/]{8,}=*", re.IGNORECASE),
    re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    re.compile(r"\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY)\s*[:=]\s*\S+", re.IGNORECASE),
    re.compile(r"\bapikey_[A-Za-z0-9_]{20,}", re.IGNORECASE),
]
EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
IPV4_PATTERN = re.compile(r"(?<![\d.])(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\d.])")


class Refused(ValueError):
    """The event cannot be written. Refusal is free — nothing has been spooled."""


def refuse(message: str) -> NoReturn:
    raise Refused(message)


# --------------------------------------------------------------------------- registry

def load_registry(path: str) -> dict[str, dict[str, str]]:
    """Minimal reader for groups.yaml. Deliberately not PyYAML: the skill must run with
    nothing but the stdlib, and this file's shape (`- id:` then indented scalars) is fixed."""
    if not os.path.isfile(path):
        refuse(f"group registry not found at {path}; pass --groups")
    registry: dict[str, dict[str, str]] = {}
    current: dict[str, str] | None = None
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            if line.lstrip().startswith("#"):
                continue
            stripped = line.strip()
            if not stripped or stripped == "groups:":
                continue
            if stripped.startswith("- "):
                current = {}
                stripped = stripped[2:]
            if current is None or ":" not in stripped:
                continue
            key, _, value = stripped.partition(":")
            key, value = key.strip(), value.strip().strip("'\"")
            if key == "id" and current is not None:
                current["id"] = value
                registry[value] = current
            elif current is not None:
                current[key] = value
    if not registry:
        refuse(f"group registry at {path} parsed to zero groups")
    return registry


def resolve_group(registry: dict[str, dict[str, str]], project_id: str, requested: str | None) -> str:
    """A write must land in a REGISTERED group. Prefer an explicit request, then the group whose
    `project:` field names this project, then a group that simply is the project id."""
    if requested:
        if requested not in registry:
            refuse(f"group_id {requested!r} is not in the registry ({len(registry)} groups)")
        return requested
    if project_id in registry:
        return project_id
    by_project = [gid for gid, entry in registry.items() if entry.get("project") == project_id]
    if len(by_project) == 1:
        return by_project[0]
    if len(by_project) > 1:
        refuse(f"project {project_id!r} maps to several groups: {sorted(by_project)}")
    refuse(
        f"project {project_id!r} maps to no registered group. A 'project-{project_id}' style "
        f"group is NOT registered and would strand the write; register it first or pass --group"
    )
    return ""  # unreachable


# --------------------------------------------------------------------------- validation

def require_string(value: Any, field: str, *, maximum: int, minimum: int = 1) -> str:
    if not isinstance(value, str):
        refuse(f"{field} must be a string")
    value = value.strip()
    if not minimum <= len(value) <= maximum:
        refuse(f"{field} must contain {minimum}-{maximum} characters")
    return value


def check_safety(value: Any, path: str = "event") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if BANNED_KEYS.search(str(key)):
                refuse(f"unsafe field rejected at {path}.{key}")
            check_safety(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            check_safety(child, f"{path}[{index}]")
    elif isinstance(value, str):
        if EMAIL_PATTERN.search(value):
            refuse(f"email address rejected at {path}")
        if IPV4_PATTERN.search(value):
            refuse(f"IP address rejected at {path}")
        for pattern in SECRET_PATTERNS:
            if pattern.search(value):
                refuse(f"credential-like content rejected at {path}")
        if len(value) > 4_000:
            refuse(f"oversized text rejected at {path}; summarize it")


def parse_timestamp(value: Any, field: str) -> str:
    text = require_string(value, field, maximum=40)
    normalized = text[:-1] + "+00:00" if text.endswith("Z") else text
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise Refused(f"{field} must be RFC 3339") from exc
    if parsed.tzinfo is None:
        refuse(f"{field} must include a timezone")
    return text


def slug(value: Any, field: str) -> str:
    text = require_string(value, field, maximum=64).lower()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", text):
        refuse(f"{field} must be a lowercase hyphenated slug")
    return text


def normalize_short_value(value: Any, field: str) -> str | list[str]:
    if isinstance(value, str):
        return require_string(value, field, maximum=1_000)
    if isinstance(value, list):
        if not 1 <= len(value) <= 20:
            refuse(f"{field} must contain 1-20 items")
        return [require_string(item, f"{field}[{i}]", maximum=500) for i, item in enumerate(value)]
    refuse(f"{field} must be a string or list of strings")
    return ""


def normalize_event(raw: Any, registry: dict[str, dict[str, str]], group: str | None) -> dict[str, Any]:
    if not isinstance(raw, dict):
        refuse("event must be a JSON object")
    if len(json.dumps(raw, ensure_ascii=False).encode("utf-8")) > 16_384:
        refuse("event exceeds the 16 KB safety limit; summarize it")
    check_safety(raw)

    allowed = {"project", "event_type", "title", "summary", "occurred_at", "dedupe_key",
               "status", "tier", "method", "attributes", "evidence", "source"}
    unknown = set(raw) - allowed
    if unknown:
        refuse(f"unknown top-level fields: {', '.join(sorted(unknown))}")

    project = raw.get("project")
    if not isinstance(project, dict) or set(project) - {"id", "name"}:
        refuse("project must contain only id and name")
    project_id = slug(project.get("id"), "project.id")
    project_name = require_string(project.get("name"), "project.name", maximum=120)
    group_id = resolve_group(registry, project_id, group)

    event_type = raw.get("event_type")
    if event_type not in EVENT_TYPES:
        refuse(f"event_type must be one of: {', '.join(sorted(EVENT_TYPES))}")
    title = require_string(raw.get("title"), "title", maximum=120)
    summary = require_string(raw.get("summary"), "summary", maximum=2_000)
    occurred_at = parse_timestamp(raw.get("occurred_at"), "occurred_at")
    dedupe_key = require_string(raw.get("dedupe_key"), "dedupe_key", maximum=240)

    status = raw.get("status")
    if status is not None and status not in STATUSES:
        refuse(f"status must be one of: {', '.join(sorted(STATUSES))}")

    # REQUIRED by add_memory; a write without it is refused by the server.
    tier = raw.get("tier")
    if tier not in SERVER_TIERS:
        refuse(f"tier is required and must be one of: {', '.join(sorted(SERVER_TIERS))}")

    # source_description must name THE METHOD that produced the content.
    method = require_string(raw.get("method"), "method", maximum=240)

    attributes = raw.get("attributes")
    if not isinstance(attributes, dict):
        refuse("attributes must be an object")
    required, optional = ATTRIBUTE_FIELDS[event_type]
    missing = required - set(attributes)
    unknown_attributes = set(attributes) - required - optional
    if missing:
        refuse(f"missing {event_type} attributes: {', '.join(sorted(missing))}")
    if unknown_attributes:
        refuse(f"unknown {event_type} attributes: {', '.join(sorted(unknown_attributes))}")
    normalized_attributes = {
        key: normalize_short_value(value, f"attributes.{key}")
        for key, value in sorted(attributes.items())
    }

    evidence = raw.get("evidence", [])
    if not isinstance(evidence, list) or len(evidence) > 10:
        refuse("evidence must be a list of no more than 10 items")
    normalized_evidence = []
    for index, item in enumerate(evidence):
        if not isinstance(item, dict) or set(item) - {"type", "ref", "description"}:
            refuse(f"evidence[{index}] has unsupported fields")
        evidence_type = item.get("type")
        if evidence_type not in EVIDENCE_TYPES:
            refuse(f"evidence[{index}].type is unsupported")
        ref = require_string(item.get("ref"), f"evidence[{index}].ref", maximum=500)
        if ref.startswith(("http://", "https://")):
            from urllib import parse as _parse
            parsed = _parse.urlsplit(ref)
            if parsed.query or parsed.fragment or parsed.username or parsed.password:
                refuse(f"evidence[{index}].ref must not contain credentials, query strings or fragments")
        normalized_item = {"type": evidence_type, "ref": ref}
        if item.get("description") is not None:
            normalized_item["description"] = require_string(
                item["description"], f"evidence[{index}].description", maximum=500)
        normalized_evidence.append(normalized_item)

    source = raw.get("source", {})
    if not isinstance(source, dict) or set(source) - {"system", "reference", "captured_by"}:
        refuse("source supports only system, reference, and captured_by")
    normalized_source = {
        key: require_string(value, f"source.{key}", maximum=240)
        for key, value in sorted(source.items())
    }

    # The deterministic identity. NOT passed as `uuid` to add_memory (that would UPDATE an
    # existing episode); carried in the body and the name so a search finds it.
    identity = f"{project_id}\n{event_type}\n{dedupe_key}\ntier={tier}"
    dedupe_uuid = str(uuid.uuid5(DEDUPE_NAMESPACE, identity))

    normalized: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "dedupe_id": dedupe_uuid,
        "group_id": group_id,
        "tier": tier,
        "project": {"id": project_id, "name": project_name},
        "event_type": event_type,
        "title": title,
        "summary": summary,
        "occurred_at": occurred_at,
        "dedupe_key": dedupe_key,
        "method": method,
        "attributes": normalized_attributes,
    }
    if status is not None:
        normalized["status"] = status
    if normalized_evidence:
        normalized["evidence"] = normalized_evidence
    if normalized_source:
        normalized["source"] = normalized_source
    return normalized


def prepare(raw: Any, registry: dict[str, dict[str, str]], group: str | None, seat: str) -> dict[str, Any]:
    if seat not in SEATS:
        refuse(f"seat must be one of: {', '.join(sorted(SEATS))}")
    event = normalize_event(raw, registry, group)
    body = json.dumps(event, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()

    # `source_description` must name the method AND carry seat provenance in the format
    # graphiti-brain documents. The tool's own spec wins on content: it refuses a write that
    # cannot say how it was produced.
    source_description = f"{event['method']} | src={event['event_type']} | orig={seat} | promoted_by=finisher"

    tool_arguments = {
        "name": f"{event['event_type']}: {event['title']} [{event['dedupe_id'][:8]}]",
        "episode_body": body,
        "group_id": event["group_id"],
        "source": "json",
        "source_description": source_description,
        "tier": event["tier"],
        "reference_time": event["occurred_at"],
        # `uuid` deliberately ABSENT: it means UPDATE-on-existing, not dedupe.
    }
    return {
        "event": event,
        "sha256": digest,
        "tool_name": "add_memory",
        "tool_arguments": tool_arguments,
        "then": {
            "confirm_write": "call with the receipt_id from add_memory; ~17s median to land",
            "read_back": "get_episodes(group_ids=[<group_id>], max_episodes=1) must show it",
            "never": "do not infer landing from get_status timestamps; a receipt is not a confirmation",
        },
    }


def load_event(path: str) -> Any:
    if path == "-":
        return json.load(sys.stdin)
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", required=True, help="Event JSON file, or - for stdin")
    parser.add_argument("--groups", default=DEFAULT_GROUPS_PATH, help="groups.yaml registry")
    parser.add_argument("--group", default=None, help="Force a specific registered group_id")
    parser.add_argument("--seat", default=os.environ.get("MEMORY_SEAT", "envoy"), help="Originating seat")
    args = parser.parse_args()
    try:
        registry = load_registry(args.groups)
        prepared = prepare(load_event(args.input), registry, args.group, args.seat)
    except (Refused, json.JSONDecodeError, OSError) as exc:
        print(f"refused: {exc}", file=sys.stderr)
        return 2
    json.dump(prepared, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())