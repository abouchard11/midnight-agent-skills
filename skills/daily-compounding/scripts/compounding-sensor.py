#!/usr/bin/env python3
"""compounding-sensor — the deterministic half of the morning brief.

Emits the two metrics the brief previously could not compute:

  1. JOB HEALTH   — what actually ran, what is paused, what is failing or stale.
                    Replaces "N succeeded / N failed / N degraded": the Caduceus
                    decision ledger carries no job-execution data, so that box
                    was unsatisfiable from `cad brief --write` alone.
  2. AGING/FLOW   — how long the oldest open item has been open, how many have
                    crossed 7/14/30 days, and opened-vs-closed over 7 days.
                    Replaces "library grew by N items": additions are not value,
                    the library grows on its own sync schedule regardless of this
                    skill (a confounded metric), and a count that rises when junk
                    lands goes green hardest in the worst case.

Every figure is a DELTA against the previous snapshot, never a bare total: a
total tells you nothing about direction, and direction is the whole point.

Stdlib only. Deterministic. No model. Exit 0 even when a source is missing --
missing sources are reported as `unavailable`, never invented.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HOME = Path.home()
LEDGER = HOME / ".caduceus" / "ledger.db"
OUT_DIR = HOME / ".hermes" / "cron" / "output" / "daily-compounding"
SNAP_DIR = OUT_DIR / "snapshots"
DAY = 86400.0

# Mirrors caduceus.followup.DIAGNOSTIC_RUNS. `cad brief` excludes these from
# every open-loop count ("Diagnostic runs are always excluded"), so this sensor
# must exclude them too or the two surfaces report different numbers for the
# same queue (measured 2026-09-29: 16 here vs 13 from `cad brief`).
FALLBACK_DIAGNOSTIC_RUNS = ("20260819-122812", "20260819-115005", "20260819-084035")


def diagnostic_prefixes():
    """Prefer the live constant from caduceus so this cannot drift silently."""
    try:
        sys.path.insert(0, str(HOME / "projects" / "caduceus"))
        from caduceus.followup import DIAGNOSTIC_RUNS  # type: ignore
        return tuple(DIAGNOSTIC_RUNS), "caduceus source"
    except Exception:
        return FALLBACK_DIAGNOSTIC_RUNS, "MIRRORED FALLBACK (may be stale)"


def is_diagnostic(run_id: str, prefixes) -> bool:
    return any(run_id.startswith(p) for p in prefixes)

CRON_FILES = [HOME / ".hermes" / "cron" / "jobs.json"]
CRON_FILES += sorted((HOME / ".hermes" / "profiles").glob("*/cron/jobs.json"))


def days(ts: float, now: float) -> float:
    return (now - ts) / DAY


def fmt(v, suffix=""):
    return f"{v}{suffix}" if v is not None else "unavailable"


# --------------------------------------------------------------- job health

def job_health(now: float, files=None) -> dict:
    total = scheduled = paused = failing = silent_delivery = 0
    stale = []
    rows = []

    scan = CRON_FILES if files is None else files
    for path in scan:
        if not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        jobs = data if isinstance(data, list) else data.get("jobs", [])
        if isinstance(jobs, dict):
            jobs = list(jobs.values())
        for j in jobs:
            if not isinstance(j, dict):
                continue
            total += 1
            state = j.get("state") or ("scheduled" if j.get("enabled") else "paused")
            if state == "paused":
                paused += 1
            else:
                scheduled += 1
            streak = j.get("failure_streak") or 0
            status = (j.get("last_status") or "").lower()
            # A delivery failure is a failure from the operator's side even when
            # the run itself succeeded and failure_streak stays 0. Six jobs were
            # silently in this state (all `Chat not found`) while every health
            # surface called them healthy.
            delivery_err = bool(j.get("last_delivery_error"))
            bad = streak > 0 or delivery_err or status in {
                "error", "failed", "blocked_config", "blocked", "timeout",
                "delivery_failed", "delivery_error",
            }
            if bad:
                failing += 1
                if delivery_err and streak == 0:
                    silent_delivery += 1
            # Staleness: a scheduled job whose output dir has nothing recent.
            age_h = None
            jid = j.get("id")
            if jid:
                od = HOME / ".hermes" / "cron" / "output" / jid
                if od.is_dir():
                    newest = 0.0
                    for f in od.iterdir():
                        try:
                            newest = max(newest, f.stat().st_mtime)
                        except OSError:
                            pass
                    if newest:
                        age_h = (now - newest) / 3600.0
            if state != "paused" and age_h is not None and age_h > 72:
                stale.append((j.get("name") or jid, age_h))
            rows.append((j.get("name") or jid, state, status or "-", streak, age_h))

    return {
        "total": total, "scheduled": scheduled, "paused": paused,
        "failing": failing, "silent_delivery": silent_delivery,
        "stale": stale, "rows": rows,
    }


# ------------------------------------------------------------- aging / flow

def aging(now: float) -> dict:
    out = {
        "ungraded": None, "ungraded_oldest": None,
        "pending": None, "pending_oldest": None,
        "over7": None, "over14": None, "over30": None,
        "opened7": None, "closed7": None, "settled7": None,
        "available": False,
    }
    if not LEDGER.exists():
        return out
    try:
        con = sqlite3.connect(f"file:{LEDGER}?mode=ro", uri=True)
        cur = con.cursor()

        # Same exclusion `cad brief` applies, so both surfaces agree.
        prefixes, src = diagnostic_prefixes()
        out["diag_source"] = src

        cur.execute("SELECT run_id, ts FROM council_runs WHERE settled=0")
        live = [(r, t) for r, t in cur.fetchall() if not is_diagnostic(r, prefixes)]
        out["ungraded"] = len(live)
        out["ungraded_oldest"] = days(min(t for _, t in live), now) if live else None

        cur.execute("SELECT run_id, created_ts FROM commitments WHERE state='pending'")
        pend = [(r, t) for r, t in cur.fetchall() if not is_diagnostic(r, prefixes)]
        out["pending"] = len(pend)
        out["pending_oldest"] = days(min(t for _, t in pend), now) if pend else None

        for label, span in (("over7", 7), ("over14", 14), ("over30", 30)):
            cutoff = now - span * DAY
            out[label] = sum(1 for _, t in pend if t < cutoff)

        week = now - 7 * DAY
        cur.execute("SELECT run_id, created_ts FROM commitments WHERE created_ts >= ?", (week,))
        out["opened7"] = sum(
            1 for r, _ in cur.fetchall() if not is_diagnostic(r, prefixes)
        )
        cur.execute(
            "SELECT COUNT(*) FROM commitments "
            "WHERE state IN ('done','dropped') AND closed_ts IS NOT NULL AND closed_ts >= ?",
            (week,),
        )
        out["closed7"] = cur.fetchone()[0] or 0
        cur.execute("SELECT COUNT(*) FROM outcomes WHERE ts >= ? AND voided=0", (week,))
        out["settled7"] = cur.fetchone()[0] or 0

        out["available"] = True
        con.close()
    except Exception as exc:  # pragma: no cover - reported, not raised
        out["error"] = str(exc)
    return out


# ------------------------------------------------------------------ snapshot

def load_prev() -> dict:
    if not SNAP_DIR.is_dir():
        return {}
    snaps = sorted(SNAP_DIR.glob("*.json"))
    if len(snaps) < 1:
        return {}
    try:
        return json.loads(snaps[-1].read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_snap(payload: dict, now: float) -> Path:
    SNAP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.fromtimestamp(now, timezone.utc).strftime("%Y-%m-%dT%H%M%S")
    path = SNAP_DIR / f"{stamp}.json"
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return path


def delta(cur, prev, key):
    a, b = cur.get(key), prev.get(key)
    if a is None:
        return "unavailable"
    if b is None:
        return "no prior snapshot"
    d = a - b
    return "no change" if d == 0 else f"{d:+d}"


def main() -> int:
    now = time.time()
    health = job_health(now)
    flow = aging(now)
    prev = load_prev()
    prev_flow = prev.get("flow", {})
    prev_health = prev.get("health", {})

    L = []
    L.append(f"## Job health (deterministic, {len(CRON_FILES)} cron stores scanned)")
    L.append("")
    if health["total"] == 0:
        L.append("- unavailable: no cron jobs file readable")
    else:
        L.append(
            f"- {health['total']} jobs: **{health['scheduled']} scheduled, "
            f"{health['paused']} paused** "
            f"(paused Δ {delta(health, prev_health, 'paused')})"
        )
        L.append(
            f"- failing or last-status-blocked: **{health['failing']}** "
            f"(Δ {delta(health, prev_health, 'failing')})"
        )
        if health["silent_delivery"]:
            L.append(
                f"- [RED] **{health['silent_delivery']} of them run fine and cannot "
                f"deliver** (failure_streak stays 0, so no health surface counts them)"
            )
        if health["stale"]:
            for name, age_h in health["stale"][:5]:
                L.append(f"- [RED] stale output: {name} — {age_h:.0f}h since last file")
        else:
            L.append("- [GREEN] no scheduled job with output older than 72h")
        for name, state, status, streak, age_h in health["rows"]:
            if state == "paused" or streak > 0 or status not in ("-", "ok", "delivery_queued"):
                age = f"{age_h:.0f}h" if age_h is not None else "no output"
                L.append(f"  - {name}: {state}, last_status={status}, streak={streak}, output={age}")

    L.append("")
    L.append("## Aging / flow (the compounding metric)")
    L.append("")
    if not flow["available"]:
        L.append(f"- unavailable: {flow.get('error', 'ledger.db not readable')}")
    else:
        L.append(f"  (diagnostic runs excluded via {flow.get('diag_source')} — same rule as `cad brief`)")
        uo = flow["ungraded_oldest"]
        po = flow["pending_oldest"]
        L.append(
            f"- ungraded decisions: **{flow['ungraded']}** "
            f"(Δ {delta(flow, prev_flow, 'ungraded')}), "
            f"oldest **{fmt(round(uo, 1), 'd')}** "
            f"(Δ {round(uo - prev_flow['ungraded_oldest'], 1) if uo is not None and prev_flow.get('ungraded_oldest') is not None else 'no prior snapshot'})"
        )
        L.append(
            f"- unexecuted commitments: **{flow['pending']}** "
            f"(Δ {delta(flow, prev_flow, 'pending')}), "
            f"oldest **{fmt(round(po, 1), 'd')}** "
            f"(Δ {round(po - prev_flow['pending_oldest'], 1) if po is not None and prev_flow.get('pending_oldest') is not None else 'no prior snapshot'})"
        )
        L.append(
            f"- crossed thresholds: >7d **{flow['over7']}**, >14d **{flow['over14']}**, "
            f">30d **{flow['over30']}**"
        )
        L.append(
            f"- last 7d: opened **{flow['opened7']}**, closed **{flow['closed7']}**, "
            f"decisions settled **{flow['settled7']}**"
        )
        net = (flow["closed7"] or 0) - (flow["opened7"] or 0)
        verdict = "draining" if net > 0 else ("holding" if net == 0 else "ACCUMULATING")
        L.append(f"- 7d direction: **{verdict}** (closed - opened = {net:+d})")

    print("\n".join(L))

    save_snap(
        {
            "captured_at": now,
            "captured_iso": datetime.fromtimestamp(now, timezone.utc).isoformat(),
            "health": {k: health[k] for k in ("total", "scheduled", "paused", "failing")},
            "flow": {k: flow[k] for k in flow if k != "error"},
        },
        now,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())