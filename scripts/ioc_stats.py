#!/usr/bin/env python3
"""Summarize an indicator list (CSV/JSON) as a Markdown report.

Prints totals, breakdowns by type/severity/category, top malware families,
tag frequencies and a validity check — handy for PR review of bulk imports.

Examples:
    python scripts/ioc_stats.py data/export.csv
    python scripts/ioc_stats.py feed.json --top 15 -o report.md
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

from pkc_common import eprint, normalize_record, read_records


def table(title: str, rows: list[tuple[str, int]], total: int) -> list[str]:
    lines = [f"### {title}", "", "| Value | Count | Share |", "| --- | ---: | ---: |"]
    for name, count in rows:
        share = (count / total * 100) if total else 0
        lines.append(f"| {name} | {count} | {share:.1f}% |")
    lines.append("")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="input CSV/JSON file")
    parser.add_argument("-o", "--output", help="write Markdown here instead of stdout")
    parser.add_argument("-f", "--format", choices=["csv", "json"], help="force input format")
    parser.add_argument("--top", type=int, default=10, help="rows per breakdown (default: 10)")
    args = parser.parse_args()

    records = read_records(Path(args.input), args.format)

    valid: list[dict[str, str]] = []
    invalid: list[str] = []
    seen: set[tuple[str, str]] = set()
    duplicates = 0

    for raw in records:
        rec, err = normalize_record(raw)
        if err:
            invalid.append(err)
            continue
        key = (rec["type"], rec["value"])
        if key in seen:
            duplicates += 1
            continue
        seen.add(key)
        valid.append(rec)

    def count_by(field: str) -> list[tuple[str, int]]:
        counter = Counter(rec[field] for rec in valid)
        return sorted(counter.items(), key=lambda kv: (-kv[1], kv[0]))[: args.top]

    tag_counter: Counter[str] = Counter()
    for rec in valid:
        for tag in rec["tags"].replace(";", ",").split(","):
            tag = tag.strip()
            if tag:
                tag_counter[tag] += 1

    dates = sorted(rec["first_seen"] for rec in valid if rec["first_seen"])
    window = f"{dates[0][:10]} → {dates[-1][:10]}" if len(dates) >= 2 else "n/a"

    lines = [
        "# Indicator report",
        "",
        f"- Source: `{args.input}`",
        f"- Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"- Rows: **{len(records)}** total · **{len(valid)}** unique valid · "
        f"**{duplicates}** duplicates · **{len(invalid)}** invalid",
        f"- First-seen window: {window}",
        "",
    ]
    lines += table("By type", count_by("type"), len(valid))
    lines += table("By severity", count_by("severity"), len(valid))
    lines += table("By category", count_by("category"), len(valid))
    lines += table(f"Top families (n={args.top})", count_by("malware_family"), len(valid))
    lines += table(f"Top tags (n={args.top})", tag_counter.most_common(args.top), len(valid))

    if invalid:
        lines += ["### Invalid rows", ""]
        for err in invalid[:25]:
            lines.append(f"- {err}")
        if len(invalid) > 25:
            lines.append(f"- … {len(invalid) - 25} more")
        lines.append("")

    md = "\n".join(lines)

    if args.output:
        Path(args.output).write_text(md + "\n", encoding="utf-8")
        eprint(f"wrote {args.output}")
    else:
        sys.stdout.write(md + "\n")

    return 1 if invalid else 0


if __name__ == "__main__":
    raise SystemExit(main())
