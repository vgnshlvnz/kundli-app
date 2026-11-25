"""Place search over data/locations.db with the derived timezones (CONVENTIONS D5, C13)."""

from __future__ import annotations

import csv
import os
import re
import sqlite3
import unicodedata
from functools import cache
from pathlib import Path

from kundli_core import GeoPoint, Place

CSV_FIELDS = ["id", "country", "state", "latitude", "longitude", "tz", "is_centroid", "usable", "reason"]
OVERRIDE_FIELDS = ["id", "tz", "usable", "reason", "decided_by"]
_REPO = Path(__file__).resolve().parents[4]
CENTROID_NOTE = "Coordinates are the centre of {country}; the Lagna may be inaccurate."


class UnknownPlace(KeyError):
    pass


class PlaceNotUsable(ValueError):
    pass


def default_paths() -> tuple[Path, Path, Path]:
    """Database, derived timezone CSV and overrides CSV, from the environment or the repository's data/."""
    data = _REPO / "data"
    db = Path(os.environ.get("KUNDLI_LOCATIONS_DB", data / "locations.db"))
    tz = Path(os.environ.get("KUNDLI_LOCATIONS_TZ", db.parent / "locations_tz.csv"))
    overrides = Path(os.environ.get("KUNDLI_LOCATIONS_TZ_OVERRIDES", tz.parent / "locations_tz_overrides.csv"))
    return db, tz, overrides


def _fold(text: str) -> str:
    """Case-, accent- and space-insensitive form used for matching."""
    decomposed = unicodedata.normalize("NFKD", text)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", stripped.casefold()).strip()


def _words(text: str) -> list[str]:
    return [w for w in re.split(r"[^\w]+", _fold(text)) if w]


class LocationStore:
    def __init__(self, db_path: Path, tz_csv: Path, overrides_csv: Path | None = None):
        if not db_path.is_file():
            raise FileNotFoundError(f"locations database not found: {db_path} (set KUNDLI_LOCATIONS_DB)")
        if not tz_csv.is_file():
            raise FileNotFoundError(f"timezone table not found: {tz_csv} (set KUNDLI_LOCATIONS_TZ)")
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        try:
            rows = con.execute("SELECT id, country, state, latitude, longitude FROM locations ORDER BY id").fetchall()
        finally:
            con.close()
        with tz_csv.open(encoding="utf-8", newline="") as f:
            derived = {int(r["id"]): r for r in csv.DictReader(f)}
        overrides: dict[int, dict[str, str]] = {}
        if overrides_csv is not None and overrides_csv.is_file():
            with overrides_csv.open(encoding="utf-8", newline="") as f:
                overrides = {int(r["id"]): r for r in csv.DictReader(f)}
        db_ids = {r[0] for r in rows}
        if set(derived) != db_ids:
            raise ValueError(f"{tz_csv} does not cover the database rows exactly; regenerate it with derive_tz")
        if not set(overrides) <= db_ids:
            raise ValueError(f"{overrides_csv} names ids not in the database: {sorted(set(overrides) - db_ids)}")
        self._places: dict[int, Place] = {}
        self._index: list[tuple[Place, list[str], str]] = []
        for id_, country, state, lat, lon in rows:
            d = derived[id_]
            tz, usable, reason = d["tz"], d["usable"] == "1", d["reason"]
            if id_ in overrides:
                o = overrides[id_]
                tz = o["tz"] or tz
                usable = o["usable"] == "1"
                reason = o["reason"] or reason
            centroid = not state
            note = CENTROID_NOTE.format(country=country) if centroid and usable else (reason or None)
            label = country if centroid else f"{state}, {country}"
            place = Place(id_, label, country, state or None, GeoPoint(lat, lon), tz, centroid, usable, note)
            self._places[id_] = place
            self._index.append((place, _words(label), _fold(label)))

    def get(self, place_id: int) -> Place:
        try:
            return self._places[int(place_id)]
        except (KeyError, ValueError):
            raise UnknownPlace(f"no place with id {place_id!r}") from None

    def __len__(self) -> int:
        return len(self._places)

    def search(self, query: str, limit: int = 10) -> list[Place]:
        """Places whose name words start with every word of ``query``, best matches first."""
        terms = _words(query)
        if not terms or limit <= 0:
            return []
        q = " ".join(terms)
        hits = []
        for place, words, folded in self._index:
            if all(any(w.startswith(t) for w in words) for t in terms):
                # 0: the place itself; 1: a place in the country named exactly; 2: name starts with the query; 3: other.
                name, country = _fold(place.state or place.country), _fold(place.country)
                if folded == q or name == q:
                    rank = 0
                elif country == q:
                    rank = 1
                elif name.startswith(q) or country.startswith(q):
                    rank = 2
                else:
                    rank = 3
                hits.append((rank, place.is_centroid, not place.usable, folded, place))
        hits.sort(key=lambda h: h[:4])
        return [h[-1] for h in hits[:limit]]


@cache
def default_store() -> LocationStore:
    return LocationStore(*default_paths())
