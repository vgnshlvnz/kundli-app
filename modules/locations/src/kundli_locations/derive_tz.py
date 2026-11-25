"""Derive each place's IANA timezone from its coordinates (CONVENTIONS D5).

    uv run --package kundli-locations --extra derive python -m kundli_locations.derive_tz [--check]

Reads ``data/locations.db`` and writes ``data/locations_tz.csv`` (one row per place) plus
``data/locations_tz.meta.toml`` (tool versions and counts). With ``--check`` it writes nothing and exits 1 if the
committed CSV differs from a fresh derivation.

Rules:
- The zone is the one timezonefinder gives for the row's latitude/longitude.
- A country-centroid row (empty ``state``) is unusable when the country has more than one zone in the system's
  ``zone.tab``: its coordinates say nothing about which zone the birth was in. Otherwise it is usable, and the app
  warns that the coordinates are the centre of the country (CONVENTIONS C13).
- The owner's decisions go in ``data/locations_tz_overrides.csv``, which this tool never touches.
"""

from __future__ import annotations

import argparse
import csv
import io
import sqlite3
import sys
from collections import defaultdict
from importlib.metadata import version
from pathlib import Path

from .store import CSV_FIELDS, default_paths

ZONE_TAB = Path("/usr/share/zoneinfo/zone.tab")


def zones_by_country(zone_tab: Path = ZONE_TAB) -> tuple[dict[str, set[str]], dict[str, set[str]]]:
    zone_cc: dict[str, set[str]] = defaultdict(set)
    cc_zones: dict[str, set[str]] = defaultdict(set)
    for line in zone_tab.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        cc, _coords, zone = line.split("\t")[:3]
        zone_cc[zone].add(cc)
        cc_zones[cc].add(zone)
    return zone_cc, cc_zones


def derive(db_path: Path, zone_tab: Path = ZONE_TAB) -> tuple[str, dict]:
    from timezonefinder import TimezoneFinder  # optional dependency: the "derive" extra

    zone_cc, cc_zones = zones_by_country(zone_tab)
    finder = TimezoneFinder()
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    rows = con.execute("SELECT id, country, state, latitude, longitude FROM locations ORDER BY id").fetchall()
    con.close()
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=CSV_FIELDS, lineterminator="\n")
    writer.writeheader()
    counts = {"rows": 0, "usable": 0, "unusable": 0, "centroid_rejected": 0, "centroid_usable": 0}
    for id_, country, state, lat, lon in rows:
        tz = finder.timezone_at(lng=lon, lat=lat) or ""
        centroid = not state
        usable, reason = True, ""
        if not tz:
            usable, reason = False, "no timezone at these coordinates"
        elif centroid:
            n = max((len(cc_zones[c]) for c in zone_cc.get(tz, ())), default=0)
            if n > 1:
                usable, reason = False, f"country centre; {country} has {n} time zones in zone.tab"
            counts["centroid_usable" if usable else "centroid_rejected"] += 1
        writer.writerow({"id": id_, "country": country, "state": state or "", "latitude": lat, "longitude": lon,
                         "tz": tz, "is_centroid": int(centroid), "usable": int(usable), "reason": reason})
        counts["rows"] += 1
        counts["usable" if usable else "unusable"] += 1
    meta = {"timezonefinder": version("timezonefinder"), "timezonefinder_data": version("timezonefinder-data"),
            "zone_tab": str(zone_tab), "zone_tab_version": _tzdata_version(zone_tab), **counts}
    return out.getvalue(), meta


def _tzdata_version(zone_tab: Path) -> str:
    zi = zone_tab.parent / "tzdata.zi"
    if zi.is_file():
        first = zi.read_text(encoding="utf-8").splitlines()[0]
        if first.startswith("# version"):
            return first.split()[-1]
    return "unknown"


def main(argv: list[str] | None = None) -> int:
    db_default, csv_default, _ = default_paths()
    parser = argparse.ArgumentParser(description="Derive data/locations_tz.csv from data/locations.db")
    parser.add_argument("--db", type=Path, default=db_default)
    parser.add_argument("--out", type=Path, default=csv_default)
    parser.add_argument("--check", action="store_true", help="compare with the committed CSV; write nothing")
    args = parser.parse_args(argv)
    text, meta = derive(args.db)
    if args.check:
        same = args.out.is_file() and args.out.read_text(encoding="utf-8") == text
        print("locations_tz.csv is up to date" if same else "locations_tz.csv differs from a fresh derivation")
        return 0 if same else 1
    args.out.write_text(text, encoding="utf-8")
    lines = ["# Written by python -m kundli_locations.derive_tz. Do not edit."]
    lines += [f"{k} = {v!r}".replace("'", '"') for k, v in meta.items()]
    args.out.with_suffix(".meta.toml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {args.out} ({meta['rows']} rows, {meta['unusable']} unusable)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
