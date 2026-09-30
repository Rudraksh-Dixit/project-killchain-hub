#!/usr/bin/env python3
"""Validate, normalize and deduplicate an indicator list.

Reads CSV or JSON (auto-detected), applies the same validation rules as the
KillChain API, normalizes values (canonical IP/domain/hash casing), fills
defaults, removes duplicates and writes an import-ready CSV.

Examples:
    python scripts/normalize_iocs.py data/export.csv -o clean.csv
    python scripts/normalize_iocs.py feed.json --strict
    cat raw.csv | python scripts/normalize_iocs.py - -o clean.csv
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from pkc_common import (
    CSV_COLUMNS,
    eprint,
    normalize_record,
    read_records,
    write_csv,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="input CSV/JSON file, or - for stdin")
    parser.add_argument("-o", "--output", help="output CSV file (default: stdout)")
    parser.add_argument("-f", "--format", choices=["csv", "json"], help="force input format")
    parser.add_argument("--strict", action="store_true", help="exit non-zero if any row is invalid")
    parser.add_argument("-q", "--quiet", action="store_true", help="suppress the stderr summary")
    args = parser.parse_args()

    if args.input == "-":
        import json

        text = sys.stdin.read()
        sniff_json = args.format == "json" or text.lstrip()[:1] in ("[", "{")
        if sniff_json:
            data = json.loads(text)
            if isinstance(data, dict):
                data = data.get("items") or data.get("iocs") or []
            records = data if isinstance(data, list) else []
        else:
            records = list(csv.DictReader(text.splitlines()))
    else:
        records = read_records(Path(args.input), args.format)

    valid: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    invalid: list[tuple[int, str]] = []
    duplicates = 0

    for index, raw in enumerate(records, start=1):
        rec, err = normalize_record(raw)
        if err:
            invalid.append((index, err))
            continue
        key = (rec["type"], rec["value"])
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        valid.append(rec)

    if args.output and args.output != "-":
        out = open(args.output, "w", encoding="utf-8", newline="")
    else:
        out = sys.stdout
    try:
        write_csv(valid, out)
    finally:
        if out not in (sys.stdout, sys.stderr):
            out.close()

    if not args.quiet:
        eprint(
            f"rows={len(records)} valid={len(valid)} invalid={len(invalid)} duplicates={duplicates}"
        )
        for index, reason in invalid[:20]:
            eprint(f"  line {index}: {reason}")
        if len(invalid) > 20:
            eprint(f"  ... {len(invalid) - 20} more")

    if args.strict and invalid:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
