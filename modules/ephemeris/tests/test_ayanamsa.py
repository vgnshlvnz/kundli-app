"""Ayanamsa options and pinned values (CONVENTIONS section B, C10)."""

import re
from datetime import UTC, datetime
from pathlib import Path

import pytest
import swisseph as swe

from kundli_core.mdtables import read_table
from kundli_ephemeris import DEFAULT_AYANAMSA, UnknownAyanamsa, ayanamsa, get_option, jd_from_utc, list_ayanamsas

REPO = Path(__file__).resolve().parents[3]
COLUMNS = {"lahiri": "Lahiri (1)", "raman": "Raman (3)", "kp_old": "KP Old (5)", "kp_new": "KP New (45)"}


def parse_dms(text: str) -> float:
    m = re.fullmatch(r"(\d+)°(\d+)′(\d+(?:\.\d+)?)″", text.strip("* +"))
    assert m, text
    return int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600


def pinned_values():
    """The 4 options × 5 dates table in docs/CONVENTIONS.md §B (values to 0.01″)."""
    rows = read_table(REPO / "docs" / "CONVENTIONS.md", "B. Ayanamsa", index=1)
    out = []
    for row in rows:
        y, m, d = map(int, row["Date"].strip("*").split("-"))
        for option, col in COLUMNS.items():
            out.append(((y, m, d), option, parse_dms(row[col])))
    return out


def test_options_are_the_four_decided_ones():
    assert DEFAULT_AYANAMSA == "lahiri"
    assert [(o.id, o.name, o.swe_mode_name) for o in list_ayanamsas()] == [
        ("lahiri", "Lahiri", "SIDM_LAHIRI"),
        ("raman", "Raman", "SIDM_RAMAN"),
        ("kp_old", "KP Old", "SIDM_KRISHNAMURTI"),
        ("kp_new", "KP New", "SIDM_KRISHNAMURTI_VP291"),
    ]
    assert get_option("kp_new").swe_mode == swe.SIDM_KRISHNAMURTI_VP291
    with pytest.raises(UnknownAyanamsa):
        get_option("fagan")


def test_pins_cover_five_dates_between_1900_and_2050():
    dates = sorted({d for d, _, _ in pinned_values()})
    assert len(dates) >= 5 and dates[0][0] >= 1900 and dates[-1][0] <= 2050


@pytest.mark.parametrize("date, option, pinned", pinned_values())
def test_pinned_value(date, option, pinned):
    jd = jd_from_utc(datetime(*date, tzinfo=UTC))
    value = ayanamsa(jd, option)
    assert value.option == option
    assert abs(value.degrees - pinned) * 3600 < 0.1, f"{option} {date}: {value.degrees} vs pinned {pinned}"


@pytest.mark.parametrize("option", list(COLUMNS))
def test_value_is_what_the_positions_subtract(option):
    """C10: tropical minus sidereal longitude equals the displayed ayanamsa."""
    for year in (1901, 1947, 1984, 2026, 2049):
        jd = jd_from_utc(datetime(year, 7, 1, 6, tzinfo=UTC))
        shown = ayanamsa(jd, option).degrees
        swe.set_sid_mode(get_option(option).swe_mode, 0, 0)
        for body in (swe.SUN, swe.MOON, swe.SATURN):
            trop = swe.calc_ut(jd, body, swe.FLG_SWIEPH)[0][0]
            sid = swe.calc_ut(jd, body, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)[0][0]
            assert abs((trop - sid) % 360 - shown) * 3600 < 0.001


def test_kp_new_is_a_constant_offset_from_kp_old():
    for year in (1900, 1975, 2050):
        jd = jd_from_utc(datetime(year, 1, 1, tzinfo=UTC))
        diff = (ayanamsa(jd, "kp_new").degrees - ayanamsa(jd, "kp_old").degrees) * 3600
        assert 72.3 < diff < 72.6  # 1′12.4″
