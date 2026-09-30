# KillChain scripts

Small, stdlib-only Python tools for working with indicator lists outside the
web UI. Every tool reads **CSV or JSON** (auto-detected by suffix) and speaks
the same validation rules as the API (`apps/api/src/utils/ioc.ts`).

Requires Python 3.10+. No third-party packages.

| Script | Purpose |
| --- | --- |
| `normalize_iocs.py` | Validate, normalize, dedupe → import-ready CSV |
| `to_stix.py` | CSV/JSON → STIX 2.1 bundle |
| `stix_to_ioc.py` | STIX 2.1 bundle → import-ready CSV |
| `ioc_stats.py` | Markdown summary/report for a feed |
| `pkc_common.py` | Shared validation & coercion (import as a module) |

## Examples

```bash
# Clean a messy feed (writes canonical CSV on stdout by default)
python scripts/normalize_iocs.py raw.csv -o clean.csv --strict

# Pipe it straight into the UI import (or POST /api/iocs/import)
cat feed.json | python scripts/normalize_iocs.py - -o clean.csv

# Round-trip through STIX 2.1
python scripts/to_stix.py clean.csv -o bundle.json
python scripts/stix_to_ioc.py bundle.json -o back-to-import.csv

# Review a bulk import before opening a PR
python scripts/ioc_stats.py clean.csv --top 15 -o report.md
```

## Notes

- Output CSV columns match what `POST /api/iocs/import` expects:
  `type,value,malware_family,category,severity,confidence,first_seen,last_seen,tags,source,description`
- Accepted types: `ip`, `domain`, `url`, `hash` (32/40/64/128 hex chars).
  `ipv4`/`ipv6`/`md5`/`sha1`/`sha256` aliases are mapped automatically.
- Invalid rows are reported on **stderr** and skipped; `--strict` turns them
  into a non-zero exit code for CI use.
- The tooling is part of the synthetic-data demo — always validate feeds
  against your own policy before operational use.
