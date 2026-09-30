#!/usr/bin/env python3
"""Convert a STIX 2.1 bundle into an import-ready KillChain CSV.

Parses indicator objects and their patterns (ipv4/ipv6, domain, url and
file hashes), preserving x_pkc_* metadata when present. Accepts a bundle
file or a file exported by GET /api/iocs/export?format=stix.

Examples:
    python scripts/stix_to_ioc.py bundle.json -o iocs.csv
    python scripts/stix_to_ioc.py - < bundle.json > iocs.csv
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from pkc_common import eprint, normalize_record, write_csv

PATTERNS = [
    (re.compile(r"ipv4-addr:value\s*=\s*'([^']+)'"), "ip"),
    (re.compile(r"ipv6-addr:value\s*=\s*'([^']+)'"), "ip"),
    (re.compile(r"domain-name:value\s*=\s*'([^']+)'"), "domain"),
    (re.compile(r"url:value\s*=\s*'([^']+)'"), "url"),
    (re.compile(r"file:hashes\.'(?:MD5|SHA-1|SHA-256|SHA-512|SHA3-256)'\s*=\s*'([^']+)'"), "hash"),
]

CSV_ALIASES = {
    "x_pkc_severity": "severity",
    "x_pkc_malware_family": "malware_family",
    "x_pkc_source": "source",
    "x_pkc_last_seen": "last_seen",
}


def parse_pattern(pattern: str) -> tuple[str, str] | None:
    for regex, type_ in PATTERNS:
        match = regex.search(pattern)
        if match:
            return type_, match.group(1)
    return None


def indicator_to_record(indicator: dict) -> dict[str, str] | None:
    parsed = parse_pattern(str(indicator.get("pattern", "")))
    if parsed is None:
        return None
    type_, value = parsed

    tags = indicator.get("x_pkc_tags")
    if isinstance(tags, list):
        tags = ",".join(str(t) for t in tags)
    labels = indicator.get("labels") or []
    category = next((lbl for lbl in labels if lbl != "malicious-activity"), "network")

    record = {
        "type": type_,
        "value": value,
        "malware_family": indicator.get("x_pkc_malware_family")
        or (indicator.get("name", "").rsplit(" ", 2)[0] or "Unknown"),
        "category": str(category),
        "severity": str(indicator.get("x_pkc_severity") or "medium"),
        "confidence": "high" if (indicator.get("confidence") or 55) >= 75 else "medium",
        "first_seen": str(indicator.get("valid_from") or ""),
        "last_seen": str(indicator.get("x_pkc_last_seen") or indicator.get("modified") or ""),
        "tags": tags if isinstance(tags, str) else "",
        "source": str(indicator.get("x_pkc_source") or ""),
        "description": str(indicator.get("description") or ""),
    }
    return record


def load_objects(path: str | None) -> list[dict]:
    text = sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")
    data = json.loads(text)
    if isinstance(data, dict):
        objects = data.get("objects") or data.get("items") or []
        if isinstance(objects, list):
            return [o for o in objects if isinstance(o, dict)]
        return [data]
    if isinstance(data, list):
        return [o for o in data if isinstance(o, dict)]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", nargs="?", default="-", help="STIX bundle file, or - for stdin")
    parser.add_argument("-o", "--output", help="output CSV file (default: stdout)")
    parser.add_argument("--strict", action="store_true", help="exit non-zero on unparsed indicators")
    args = parser.parse_args()

    objects = load_objects(args.input)
    records: list[dict[str, str]] = []
    unparsed: list[str] = []
    invalid = 0

    for obj in objects:
        if obj.get("type") != "indicator":
            continue
        record = indicator_to_record(obj)
        if record is None:
            unparsed.append(str(obj.get("id", "?")))
            continue
        normalized, err = normalize_record(record)
        if err:
            invalid += 1
            eprint(f"  invalid {record['value']}: {err}")
            continue
        records.append(normalized)

    seen: set[tuple[str, str]] = set()
    unique: list[dict[str, str]] = []
    for rec in records:
        key = (rec["type"], rec["value"])
        if key not in seen:
            seen.add(key)
            unique.append(rec)

    if args.output and args.output != "-":
        out = open(args.output, "w", encoding="utf-8", newline="")
    else:
        out = sys.stdout
    try:
        write_csv(unique, out)
    finally:
        if out not in (sys.stdout, sys.stderr):
            out.close()

    eprint(f"indicators={len(unique)} unparsed={len(unparsed)} invalid={invalid}")
    if unparsed:
        for ident in unparsed[:10]:
            eprint(f"  unparsed: {ident}")
    return 1 if args.strict and (unparsed or invalid) else 0


if __name__ == "__main__":
    raise SystemExit(main())
