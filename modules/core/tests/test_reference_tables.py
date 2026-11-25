"""The core data tables still match the reference files, and the core functions reproduce the files' examples."""

import copy
import re
from pathlib import Path

import pytest

from kundli_core import (
    Graha,
    Nakshatra,
    Rasi,
    graha_info,
    load_table,
    nakshatra_info,
    nakshatra_pada,
    rasi_info,
    rasi_of,
    retrograde_mark,
    sign_lord,
)
from kundli_core.mdtables import read_table
from kundli_core.refcheck import verify

REPO = Path(__file__).resolve().parents[3]
REF = REPO / "docs" / "reference"
MD_SOURCED = ["rasis", "nakshatras", "grahas", "graha_abbreviations"]
ENGLISH_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius",
                 "Capricorn", "Aquarius", "Pisces"]


def eng(g: Graha) -> str:
    return graha_info(g).english


def parse_dm(text: str) -> float:
    m = re.fullmatch(r"(\d+)°(\d+)'", text.strip())
    assert m, text
    return int(m.group(1)) + int(m.group(2)) / 60


@pytest.mark.parametrize("name", MD_SOURCED)
def test_table_matches_its_source_section(name):
    assert verify(dict(load_table(name)), REPO, name) == []


def test_verify_detects_a_changed_cell_and_a_missing_row():
    table = copy.deepcopy(dict(load_table("rasis")))
    table["rasi"][0]["src"]["Lord"] = "Venus"
    errors = verify(table, REPO, "rasis")
    assert any("'Lord' is 'Mars' in the source, 'Venus' here" in e for e in errors), errors
    table = copy.deepcopy(dict(load_table("rasis")))
    del table["rasi"][11]
    assert any("is not in the data table" in e for e in verify(table, REPO, "rasis"))


def test_verify_detects_changed_prose():
    table = copy.deepcopy(dict(load_table("grahas")))
    table["graha"][0]["src_text"] = ["Sun (Suryan)"]
    assert any("phrase not found" in e for e in verify(table, REPO, "grahas"))


def test_rasi_values_agree_with_their_source_cells():
    for row in load_table("rasis")["rasi"]:
        info = rasi_info(Rasi(row["number"]))
        src = row["src"]
        assert (info.english, info.sanskrit, info.tamil_translit) == (src["Sign (English)"], src["Sanskrit"], src["Tamil"])
        assert eng(info.lord) == src["Lord"]
        assert (eng(info.co_lord) if info.co_lord else "—") == src["Co-lord"]
        lo, hi = src["Span (from 0° Aries)"].rstrip("°").split("°–")
        assert (int(lo), int(hi)) == (30 * (row["number"] - 1), 30 * row["number"])


def test_sign_lords_are_the_seven_classical_grahas_and_co_lords_are_the_nodes():
    assert {sign_lord(r) for r in Rasi} == set(list(Graha)[:7])
    assert {r: rasi_info(r).co_lord for r in Rasi if rasi_info(r).co_lord} == {
        Rasi.VRISCHIKA: Graha.KETU,
        Rasi.KUMBHA: Graha.RAHU,
    }


def test_nakshatra_values_agree_with_their_source_segments():
    for row in load_table("nakshatras")["nakshatra"]:
        n = Nakshatra(row["number"])
        info = nakshatra_info(n)
        start = end = None
        for seg in row["src"]:
            sign = ENGLISH_SIGNS.index(seg["Sign"].split(" (")[0])
            lo, hi = seg["Degrees in sign"].split("–")
            seg_lo, seg_hi = 30 * sign + parse_dm(lo), 30 * sign + parse_dm(hi)
            assert end is None or seg_lo == pytest.approx(end % 360), row["name"]
            start = seg_lo if start is None else start
            end = seg_hi
            assert eng(info.lord) == seg["Nakshatra lord"]
            assert seg["Nakshatra (padas)"].startswith(info.name + " (")
        assert start == pytest.approx(info.start)
        assert end == pytest.approx(info.start + 40 / 3)


def test_nakshatra_lords_follow_the_vimshottari_order():
    order = [Graha.KETU, Graha.SHUKRA, Graha.SURYA, Graha.CHANDRA, Graha.MANGALA, Graha.RAHU, Graha.GURU,
             Graha.SHANI, Graha.BUDHA]
    assert [nakshatra_info(n).lord for n in Nakshatra] == [order[i % 9] for i in range(27)]


def test_graha_names_and_abbreviations():
    assert [eng(g) for g in Graha] == ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
    assert [graha_info(g).abbrev for g in Graha] == ["SU", "MO", "MA", "ME", "JU", "VE", "SA", "RA", "KE"]
    assert retrograde_mark() == "R"


def test_108_pada_table_agrees_with_core_lookups():
    """nakshatra_table §1: rasi, rasi lord, nakshatra, pada and nakshatra lord of every pada."""
    rows = read_table(REF / "nakshatra_table_llm_ready.md", "1. The 108 nakshatra padas")
    assert len(rows) == 108
    for k, row in enumerate(rows):
        mid = k * 10 / 3 + 5 / 3
        nak, pada = nakshatra_pada(mid)
        r = rasi_of(mid)
        assert row["Pada no."] == str(k + 1)
        assert row["Nakshatra pada"] == f"{nakshatra_info(nak).name} {pada}"
        assert row["Rasi"] == rasi_info(r).english
        assert row["Rasi lord"] == eng(sign_lord(r))
        assert row["Nakshatra lord"] == eng(nakshatra_info(nak).lord)


def test_rasis_signs_practice_chart_2():
    """rasis_signs §14: 0°–360° longitudes with the source's nakshatra and lord answers."""
    rows = read_table(REF / "rasis_signs_llm_ready.md", "14. Practice chart 2 — positions given as 0°–360° longitude")
    assert len(rows) == 10
    for row in rows:
        lon = parse_dm(row["Longitude"])
        nak, _ = nakshatra_pada(lon)
        assert nakshatra_info(nak).name == row["Nakshatra"], row
        assert eng(nakshatra_info(nak).lord) == row["Nakshatra lord"], row
        sign, deg = row["Sign and degree (derived)"].rsplit(" ", 1)
        assert rasi_info(rasi_of(lon)).english == sign
        assert lon - 30 * (rasi_of(lon) - 1) == pytest.approx(parse_dm(deg))


def test_rasis_signs_three_lagnas_example():
    """rasis_signs §12: rasi, rasi lord, nakshatra and nakshatra lord of three points."""
    rows = read_table(REF / "rasis_signs_llm_ready.md", "12. Worked example — three lagnas from one chart")
    for row in rows:
        m = re.fullmatch(r"\w+ (\d+°\d+') (\w+)", row["Reference point"])
        lon = 30 * ENGLISH_SIGNS.index(m.group(2)) + parse_dm(m.group(1))
        nak, _ = nakshatra_pada(lon)
        assert rasi_info(rasi_of(lon)).english == row["Rasi"]
        assert eng(sign_lord(rasi_of(lon))) == row["Rasi lord"]
        assert nakshatra_info(nak).name == row["Nakshatra"]
        assert eng(nakshatra_info(nak).lord) == row["Nakshatra lord"]


@pytest.mark.parametrize("heading", ["6.2 Worked example", "6.3 Exercise with answers"])
def test_navamsa_examples_nakshatra_and_pada(heading):
    """nakshatras_navatara_navamsa §6.2 and §6.3: nakshatra and pada of each body."""
    rows = read_table(REF / "nakshatras_navatara_navamsa_llm_ready.md", heading)
    assert len(rows) == 10
    for row in rows:
        deg, sign = row["Longitude"].split(" ")
        lon = 30 * ENGLISH_SIGNS.index(sign) + parse_dm(deg)
        nak, pada = nakshatra_pada(lon)
        assert (nakshatra_info(nak).name, str(pada)) == (row["Nakshatra"], row["Pada"]), row
