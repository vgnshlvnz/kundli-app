"""Longitude arithmetic, boundaries (CONVENTIONS C5) and degree display."""

import math

import pytest

from kundli_core import (
    Nakshatra,
    Rasi,
    angular_distance,
    count_from,
    deg_in_rasi,
    nakshatra_pada,
    norm360,
    position,
    rasi_of,
    to_dms,
)


def dm(d, m=0, s=0.0):
    return d + m / 60 + s / 3600


@pytest.mark.parametrize(
    "x, want",
    [(0.0, 0.0), (360.0, 0.0), (-0.0, 0.0), (-30.0, 330.0), (725.5, 5.5), (-1e-13, 360.0 - 1e-13), (359.999, 359.999)],
)
def test_norm360(x, want):
    got = norm360(x)
    assert 0.0 <= got < 360.0
    assert got == pytest.approx(want, abs=1e-12)
    assert math.copysign(1.0, got) == 1.0


def test_every_rasi_boundary_belongs_to_the_new_rasi():
    for k in range(12):
        assert rasi_of(30 * k) == Rasi(k + 1)
        assert deg_in_rasi(30 * k) == 0.0
        assert rasi_of(30 * k - dm(0, 0, 1)) == Rasi((k - 1) % 12 + 1)


def test_29_59_59_stays_in_the_rasi_and_displays_truncated():
    lon = 30 + dm(29, 59, 59.6)  # Taurus 29°59′59.6″
    p = position(lon)
    assert p.rasi is Rasi.VRISHABHA
    assert p.in_rasi.format(seconds=False) == "29°59′"
    assert p.in_rasi.format() == "29°59′59″"


def test_value_a_hair_below_a_boundary_snaps_to_it():
    # A longitude within 1e-6″ of a boundary is treated as the boundary: never shown as 30°00′ of the old sign.
    lon = 60 - 1e-12
    assert rasi_of(lon) is Rasi.MITHUNA
    assert position(lon).in_rasi.format() == "0°00′00″"


def test_end_of_zodiac_wraps_to_mesha():
    assert rasi_of(360 - 1e-12) is Rasi.MESHA
    assert nakshatra_pada(360 - 1e-12) == (Nakshatra.ASHWINI, 1)
    assert rasi_of(dm(359, 59, 59)) is Rasi.MEENA
    assert nakshatra_pada(dm(359, 59, 59)) == (Nakshatra.REVATI, 4)


def test_every_pada_boundary():
    # Pada k (0-based) starts at k × 3°20′; build each start from degrees and minutes as a user would.
    for k in range(108):
        total_min = k * 200
        lon = dm(total_min // 60, total_min % 60)
        assert nakshatra_pada(lon) == (Nakshatra(k // 4 + 1), k % 4 + 1), (k, lon)
        before = lon - dm(0, 0, 1) if k else 360 - dm(0, 0, 1)
        prev = (k - 1) % 108
        assert nakshatra_pada(before) == (Nakshatra(prev // 4 + 1), prev % 4 + 1), (k, before)


def test_ten_degrees_is_ashwini_pada_4_not_3():
    # 10.0 / (10/3) is 2.9999999999999996 in floating point; the arc-second arithmetic must not fall for it.
    assert nakshatra_pada(10.0) == (Nakshatra.ASHWINI, 4)
    assert nakshatra_pada(dm(26, 40)) == (Nakshatra.KRITTIKA, 1)


@pytest.mark.parametrize(
    "deg, text",
    [
        (2.3, "2°18′00″"),  # 2.3 × 3600 is 8279.999999999999 in floating point
        (dm(23, 51, 11.53), "23°51′11″"),
        (dm(0, 0, 59.999), "0°00′59″"),
        (-dm(1, 2, 3), "-1°02′03″"),
        (0.0, "0°00′00″"),
    ],
)
def test_to_dms_truncates(deg, text):
    assert to_dms(deg).format() == text


def test_position_matches_individual_lookups():
    for k in range(0, 3600):
        lon = k * 0.1 + 0.00001
        p = position(lon)
        assert p.rasi == rasi_of(lon)
        assert (p.nakshatra, p.pada) == nakshatra_pada(lon)
        assert p.in_rasi.degrees == int(deg_in_rasi(lon))


@pytest.mark.parametrize(
    "start, target, n",
    [(Rasi.MESHA, Rasi.MESHA, 1), (Rasi.MESHA, Rasi.TULA, 7), (Rasi.SIMHA, Rasi.KANYA, 2), (Rasi.SIMHA, Rasi.KARKA, 12)],
)
def test_count_from(start, target, n):
    assert count_from(start, target) == n


@pytest.mark.parametrize("a, b, d", [(10, 20, 10), (355, 5, 10), (0, 180, 180), (90, 270, 180), (359.5, 0.5, 1.0)])
def test_angular_distance(a, b, d):
    assert angular_distance(a, b) == pytest.approx(d)
    assert angular_distance(b, a) == pytest.approx(d)
