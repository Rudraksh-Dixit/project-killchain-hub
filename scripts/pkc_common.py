"""Shared helpers for the Project KillChain Hub Python tooling.

Stdlib only. Validation rules intentionally mirror the API's
apps/api/src/utils/ioc.ts so the scripts and the server agree on what a
valid indicator looks like before anything is imported.
"""

from __future__ import annotations

import csv
import ipaddress
import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable, Iterator

IOC_TYPES = ("ip", "domain", "url", "hash")
SEVERITIES = ("critical", "high", "medium", "low", "info")
CONFIDENCE = ("high", "medium", "low")
CATEGORIES = ("stealer", "loader", "phishing", "network")

CSV_COLUMNS = [
    "type",
    "value",
    "malware_family",
    "category",
    "severity",
    "confidence",
    "first_seen",
    "last_seen",
    "tags",
    "source",
    "description",
]

DOMAIN_RE = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$", re.I)
URL_RE = re.compile(r"^https?://[^\s\"<>]+$", re.I)
HASH_RE = re.compile(r"^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64}|[a-f0-9]{128})$", re.I)

DEFAULTS = {
    "malware_family": "Unknown",
    "category": "network",
    "severity": "medium",
    "confidence": "medium",
    "tags": "",
    "source": "",
    "description": "",
}

ALIASES = {
    "malware_family": ("malware_family", "malwarefamily", "family", "malware"),
    "value": ("value", "indicator", "ioc"),
    "first_seen": ("first_seen", "firstseen", "first_seen_date", "firstseen_date"),
    "last_seen": ("last_seen", "lastseen", "last_seen_date", "lastseen_date"),
    "tags": ("tags", "tag"),
    "source": ("source", "reference"),
    "description": ("description", "notes"),
    "type": ("type",),
    "category": ("category",),
    "severity": ("severity",),
    "confidence": ("confidence",),
}

TYPE_ALIASES = {"ipv4": "ip", "ipv6": "ip", "sha1": "hash", "sha256": "hash", "md5": "hash"}


def normalize_key(key: str) -> str:
    return re.sub(r"[\s\-]+", "_", key.strip().lower())


def coerce_record(raw: dict[str, Any]) -> dict[str, str]:
    """Map loose CSV/JSON keys onto the canonical import shape."""
    rec = {normalize_key(str(k)): v for k, v in raw.items()}

    def pick(*names: str, default: str = "") -> str:
        for name in names:
            value = rec.get(name)
            if value is not None and str(value).strip():
                return str(value).strip()
        return default

    out: dict[str, str] = {}
    for field, names in ALIASES.items():
        out[field] = pick(*names, default=DEFAULTS.get(field, ""))
    return out


def validate(type_: str, value: str) -> str | None:
    """Return an error message, or None when the indicator is valid."""
    if type_ not in IOC_TYPES:
        return f'unknown type "{type_ or "empty"}"'
    if not value:
        return "empty value"
    if type_ == "ip":
        try:
            ipaddress.ip_address(value)
            return None
        except ValueError:
            return f'invalid ip "{value}"'
    if type_ == "domain":
        if " " in value or not DOMAIN_RE.match(value):
            return f'invalid domain "{value}"'
        return None
    if type_ == "url":
        if not URL_RE.match(value):
            return f'invalid url "{value}"'
        return None
    if not HASH_RE.match(value):
        return f'invalid hash "{value}"'
    return None


def normalize_value(type_: str, value: str) -> str:
    value = value.strip()
    if type_ == "domain":
        return value.lower().rstrip(".")
    if type_ == "hash":
        return value.lower()
    if type_ == "ip":
        try:
            return str(ipaddress.ip_address(value))
        except ValueError:
            return value
    if type_ == "url":
        return value
    return value


def normalize_record(raw: dict[str, Any]) -> tuple[dict[str, str] | None, str | None]:
    """Return (record, error). Exactly one of the two is None."""
    rec = coerce_record(raw)
    type_ = rec["type"].lower()
    type_ = TYPE_ALIASES.get(type_, type_)
    value = normalize_value(type_, rec["value"]) if type_ in IOC_TYPES else rec["value"]
    err = validate(type_, value)
    if err:
        return None, err

    rec["type"] = type_
    rec["value"] = value
    rec["category"] = rec["category"].lower()
    if rec["category"] not in CATEGORIES:
        rec["category"] = "network"
    rec["severity"] = rec["severity"].lower()
    if rec["severity"] not in SEVERITIES:
        rec["severity"] = "medium"
    rec["confidence"] = rec["confidence"].lower()
    if rec["confidence"] not in CONFIDENCE:
        rec["confidence"] = "medium"
    if not rec["malware_family"]:
        rec["malware_family"] = "Unknown"
    return rec, None


def read_records(path: Path, fmt: str | None = None) -> list[dict[str, Any]]:
    """Read a CSV or JSON file of indicators (format auto-detected by suffix)."""
    if fmt is None:
        fmt = "json" if path.suffix.lower() in {".json", ".stix", ".bundle"} else "csv"
    text = path.read_text(encoding="utf-8-sig")
    if fmt == "json":
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("items") or data.get("iocs") or data.get("objects") or []
        if not isinstance(data, list):
            raise SystemExit(f"{path}: expected a JSON array of records")
        return [r for r in data if isinstance(r, dict)]
    return list(csv.DictReader(text.splitlines()))


def write_csv(rows: Iterable[dict[str, str]], out) -> int:
    writer = csv.DictWriter(out, fieldnames=CSV_COLUMNS, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    count = 0
    for row in rows:
        writer.writerow(row)
        count += 1
    return count


def iter_deduped(records: Iterable[dict[str, Any]]) -> Iterator[dict[str, str]]:
    seen: set[tuple[str, str]] = set()
    for raw in records:
        rec, _err = normalize_record(raw)
        if rec is None:
            continue
        key = (rec["type"], rec["value"])
        if key in seen:
            continue
        seen.add(key)
        yield rec


def eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)
