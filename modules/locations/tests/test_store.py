"""locations.db, the derived timezone table and place search (CONVENTIONS D5, C13)."""

import csv
import shutil
import sqlite3
import tomllib
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from kundli_locations import LocationStore, UnknownPlace, default_paths, default_store
from kundli_locations.store import _fold

DATA = Path(__file__).resolve().parents[3] / "data"


def by_name(country, state=None):
    hits = [p for p in default_store()._places.values() if p.country == country and p.state == state]
    assert len(hits) == 1, (country, state, hits)
    return hits[0]


def test_database_schema_is_the_documented_one():
    con = sqlite3.connect(f"file:{DATA / 'locations.db'}?mode=ro", uri=True)
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert "locations" in tables
    cols = [r[1] for r in con.execute("PRAGMA table_info(locations)")]
    assert cols == ["id", "country", "state", "latitude", "longitude"]
    assert con.execute("SELECT count(*) FROM locations").fetchone()[0] == 722


def test_timezone_table_covers_every_row_with_the_same_coordinates():
    con = sqlite3.connect(f"file:{DATA / 'locations.db'}?mode=ro", uri=True)
    db = {r[0]: r[1:] for r in con.execute("SELECT id, country, state, latitude, longitude FROM locations")}
    with (DATA / "locations_tz.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    assert sorted(int(r["id"]) for r in rows) == sorted(db)
    for r in rows:
        country, state, lat, lon = db[int(r["id"])]
        assert (r["country"], r["state"], float(r["latitude"]), float(r["longitude"])) == (country, state or "", lat, lon)
        assert r["is_centroid"] == ("1" if not state else "0")
        ZoneInfo(r["tz"])  # every zone exists in this machine's tzdata
        assert (r["usable"] == "1") == (r["reason"] == ""), r


def test_counts_match_the_meta_file():
    meta = tomllib.loads((DATA / "locations_tz.meta.toml").read_text())
    store = default_store()
    places = [store.get(i) for i in store._places]
    assert meta["rows"] == len(places) == 722
    assert meta["unusable"] == sum(not p.usable for p in places)
    assert meta["centroid_usable"] + meta["centroid_rejected"] == sum(p.is_centroid for p in places) == 115


@pytest.mark.parametrize(
    "country, state, tz",
    [
        ("India", "Chennai", "Asia/Kolkata"),
        ("India", "Tamil Nadu", "Asia/Kolkata"),
        ("Malaysia", "Kuala Lumpur", "Asia/Kuala_Lumpur"),
        ("Malaysia", "Sabah", "Asia/Kuching"),
        ("Sri Lanka", "Colombo", "Asia/Colombo"),
        ("USA", "California", "America/Los_Angeles"),
        ("USA", "Arizona", "America/Phoenix"),
    ],
)
def test_known_places(country, state, tz):
    p = by_name(country, state)
    assert p.tz == tz and p.usable and not p.is_centroid and p.note is None
    assert p.label == f"{state}, {country}"


def test_single_zone_country_centre_is_usable_with_a_warning():
    india = by_name("India")
    assert india.usable and india.is_centroid and india.tz == "Asia/Kolkata"
    assert "centre of India" in india.note


@pytest.mark.parametrize("country", ["Malaysia", "Australia", "Brazil", "Canada", "Russia", "Mexico", "Mongolia"])
def test_multi_zone_country_centres_are_rejected(country):
    p = by_name(country)
    assert not p.usable
    assert "time zones in zone.tab" in p.note


def test_search_ranking_and_matching():
    assert default_store().search("chennai")[0].label == "Chennai, India"
    assert default_store().search("CHENN")[0].label == "Chennai, India"
    assert [p.label for p in default_store().search("chen")][:2] == ["Chengdu, China", "Chennai, India"]
    assert default_store().search("tamil nadu")[0].label == "Tamil Nadu, India"
    assert default_store().search("  kuala   lum ")[0].label == "Kuala Lumpur, Malaysia"
    assert default_store().search("colombo sri")[0].label == "Colombo, Sri Lanka"
    india = default_store().search("india", limit=30)
    # The country itself, then every place in it, then other prefix matches (Indiana).
    assert india[0].label == "India"
    assert all(p.country == "India" for p in india[:22]) and india[22].label == "Indiana, USA"
    assert len(default_store().search("india", limit=3)) == 3
    assert default_store().search("") == [] and default_store().search("zzzz") == []


def test_folding_ignores_case_accents_and_spacing():
    assert _fold("  Île-de-FRANCE ") == "ile-de-france"
    assert _fold("São   Paulo") == "sao paulo"


def test_get_and_unknown_ids():
    p = by_name("India", "Chennai")
    assert default_store().get(p.id) == p
    assert default_store().get(str(p.id)) == p
    with pytest.raises(UnknownPlace):
        default_store().get(999999)


def test_owner_overrides_are_applied(tmp_path):
    germany = by_name("Germany")
    assert not germany.usable
    overrides = tmp_path / "overrides.csv"
    overrides.write_text(f"id,tz,usable,reason,decided_by\n{germany.id},,1,,owner 2026-11-26\n", encoding="utf-8")
    db, tz, _ = default_paths()
    store = LocationStore(db, tz, overrides)
    g = store.get(germany.id)
    assert g.usable and g.tz == "Europe/Berlin" and "centre of Germany" in g.note
    overrides.write_text("id,tz,usable,reason,decided_by\n999999,,1,,x\n", encoding="utf-8")
    with pytest.raises(ValueError, match="999999"):
        LocationStore(db, tz, overrides)


def test_timezone_table_must_cover_the_database(tmp_path):
    db, tz, _ = default_paths()
    short = tmp_path / "tz.csv"
    short.write_text("\n".join(tz.read_text(encoding="utf-8").splitlines()[:-1]) + "\n", encoding="utf-8")
    with pytest.raises(ValueError, match="regenerate"):
        LocationStore(db, short)


def test_paths_come_from_the_environment(tmp_path, monkeypatch):
    shutil.copy(DATA / "locations.db", tmp_path / "x.db")
    monkeypatch.setenv("KUNDLI_LOCATIONS_DB", str(tmp_path / "x.db"))
    db, tz, overrides = default_paths()
    assert db == tmp_path / "x.db" and tz == tmp_path / "locations_tz.csv"
    assert overrides == tmp_path / "locations_tz_overrides.csv"
    with pytest.raises(FileNotFoundError, match="KUNDLI_LOCATIONS_TZ"):
        LocationStore(db, tz)
