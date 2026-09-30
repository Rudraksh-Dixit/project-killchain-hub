#!/usr/bin/env python3
"""Convert an indicator list (CSV/JSON) to a STIX 2.1 bundle.

Output matches the shape the KillChain API uses for /iocs/export?format=stix,
so bundles produced here can round-trip through scripts/stix_to_ioc.py and
into POST /api/iocs/import.

Examples:
    python scripts/to_stix.py data/export.csv -o bundle.json
    python scripts/to_stix.py feed.json | python scripts/stix_to_ioc.py -
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pkc_common import eprint, normalize_record, read_records

SPECIFIC_HASH = {32: "MD5", 40: "SHA-1", 64: "SHA-256", 128: "SHA-512"}


def stix_pattern(type_: str, value: str) -> str:
    if type_ == "ip":
        prop = "ipv6-addr:value" if ":" in value else "ipv4-addr:value"
        return f"[{prop} = '{value}']"
    if type_ == "domain":
        return f"[domain-name:value = '{value}']"
    if type_ == "url":
        return f"[url:value = '{value}']"
    algorithm = SPECIFIC_HASH.get(len(value), "UNKNOWN")
    return f"[file:hashes.'{algorithm}' = '{value}']"


def deterministic_id(prefix: str, key: str) -> str:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:32]
    return f"{prefix}--{digest}"


def confidence_value(confidence: str) -> int:
    return {"high": 85, "medium": 55}.get(confidence, 25)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="input CSV/JSON file")
    parser.add_argument("-o", "--output", help="output bundle file (default: stdout)")
    parser.add_argument("-f", "--format", choices=["csv", "json"], help="force input format")
    parser.add_argument("--namespace", default="project-killchain-hub", help="label namespace")
    args = parser.parse_args()

    records = read_records(Path(args.input), args.format)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    objects: list[dict] = []
    invalid = 0
    seen: set[tuple[str, str]] = set()

    for raw in records:
        rec, err = normalize_record(raw)
        if err:
            invalid += 1
            continue
        key = (rec["type"], rec["value"])
        if key in seen:
            continue
        seen.add(key)

        objects.append(
            {
                "type": "indicator",
                "spec_version": "2.1",
                "id": deterministic_id("indicator", f"{rec['type']}:{rec['value']}"),
                "created": now,
                "modified": now,
                "name": f"{rec['malware_family']} {rec['type']} indicator",
                "description": rec["description"] or "Training indicator (synthetic data)",
                "pattern": stix_pattern(rec["type"], rec["value"]),
                "pattern_type": "stix",
                "valid_from": rec["first_seen"] or now,
                "labels": ["malicious-activity", rec["category"]],
                "confidence": confidence_value(rec["confidence"]),
                "x_pkc_severity": rec["severity"],
                "x_pkc_malware_family": rec["malware_family"],
                "x_pkc_tags": [t for t in rec["tags"].replace(";", ",").split(",") if t.strip()],
                "x_pkc_source": rec["source"],
                "x_pkc_last_seen": rec["last_seen"] or now,
                "x_pkc_namespace": args.namespace,
            }
        )

    bundle = {
        "type": "bundle",
        "id": f"bundle--{uuid.uuid4()}",
        "created": now,
        "objects": objects,
    }
    text = json.dumps(bundle, indent=2)

    if args.output:
        Path(args.output).write_text(text + "\n", encoding="utf-8")
    else:
        sys.stdout.write(text + "\n")

    eprint(f"indicators={len(objects)} invalid={invalid} skipped_duplicates={len(records) - invalid - len(objects)}")
    return 1 if invalid and not objects else 0


if __name__ == "__main__":
    raise SystemExit(main())
