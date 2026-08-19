#!/usr/bin/env python3
"""Fail a memory note the model is not allowed to persist."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ALLOWED_TIERS = {"verified", "decided"}
ALLOWED_LANES = {"gbrain", "graphiti"}
ALLOWED_CLOSERS = {"script", "human", "policy"}
IRREVERSIBLE_WORDS = ("paid", "posted", "published", "transferred", "deleted")
SECRET_RE = re.compile(
    r"(sk_live_|sk_test_|rk_live_|whsec_|Bearer\s+[A-Za-z0-9._\-]+|api[_-]?key\s*[:=])",
    re.I,
)
CLOSED_NODE_RE = re.compile(
    r"(pay|post|accept|publish)\s+(passed|closed|released)|node\s+\1\s+(passed|closed)",
    re.I,
)


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        raise ValueError("note must start with YAML frontmatter")
    end = text.find("---", 3)
    if end == -1:
        raise ValueError("frontmatter not closed")
    meta: dict[str, str] = {}
    for line in text[3:end].strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip().lower()] = value.strip().strip('"').strip("'")
    return meta, text[end + 3 :]


def lint_note(text: str) -> list[str]:
    errors: list[str] = []
    try:
        meta, body = parse_frontmatter(text)
    except ValueError as exc:
        return [str(exc)]

    tier = meta.get("tier", "")
    lane = meta.get("lane", "")
    closer = meta.get("closer", "")
    verifier = meta.get("verifier", "")

    if tier not in ALLOWED_TIERS:
        errors.append(f"tier must be verified|decided, got {tier or 'missing'}")
    if lane not in ALLOWED_LANES:
        errors.append(f"lane must be gbrain|graphiti, got {lane or 'missing'}")
    if closer not in ALLOWED_CLOSERS:
        errors.append(f"closer must be script|human|policy, got {closer or 'missing'}")
    if closer == "model":
        errors.append("irreversible persist cannot be closed by the model")
    if not verifier or len(verifier) < 8:
        errors.append("verifier must name the independent check")

    blob = f"{verifier}\n{body}"
    if SECRET_RE.search(blob):
        errors.append("note contains a secret pattern")
    if any(word in blob.lower() for word in IRREVERSIBLE_WORDS):
        if not re.search(r"(passed|closed|released|funded checkout)", blob, re.I):
            errors.append("irreversible claim without a closed-node verifier")

    if lane == "gbrain" and re.search(r"\b(@\w+|group_id)\b", body) and "pointer" not in body.lower():
        if re.search(r"\b(creator|person|company|entity)\b", body, re.I):
            errors.append("entity facts belong in Graphiti; GBrain may hold a pointer only")

    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: lint-note.py <note.md>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    errors = lint_note(path.read_text())
    if errors:
        print(f"FAIL {path}")
        for error in errors:
            print(f"  - {error}")
        return 1
    print(f"PASS {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
