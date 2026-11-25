"""Graha positions, nodes, retrograde flags, sign-edge moments and missing data (CONVENTIONS C9)."""

from datetime import UTC, datetime, timedelta

import pytest

from kundli_core import BirthMoment, GeoPoint, Graha, Rasi, norm360, position
from kundli_ephemeris import EphemerisError, EphemerisFilesMissing, compute_positions, configure, jd_from_utc

CHENNAI = GeoPoint(13.08268, 80.270718)


def at(utc: datetime, geo=CHENNAI, option="lahiri"):
    return compute_positions(BirthMoment(utc.replace(tzinfo=None), "UTC", utc), geo, option)


def test_all_nine_grahas_in_range():
    chart = at(datetime(1990, 1, 15, 5, 0, tzinfo=UTC))
    assert set(chart.grahas) == set(Graha)
    for g, p in chart.grahas.items():
        assert 0.0 <= p.longitude < 360.0, g
    assert 0.0 <= chart.lagna < 360.0
    assert chart.ayanamsa.option == "lahiri"


def test_nodes_are_mean_opposite_and_always_retrograde():
    for year in (1905, 1962, 2001, 2044):
        chart = at(datetime(year, 3, 1, tzinfo=UTC))
        rahu, ketu = chart.grahas[Graha.RAHU], chart.grahas[Graha.KETU]
        assert ketu.longitude == pytest.approx(norm360(rahu.longitude + 180.0), abs=1e-12)
        assert rahu.retrograde and ketu.retrograde
        assert rahu.speed < 0  # the mean node always moves backwards (about −0.053°/day)
        assert rahu.speed == pytest.approx(-0.0530, abs=0.0005)


@pytest.mark.parametrize(
    "graha, date, retro",
    [
        (Graha.BUDHA, (2023, 5, 1), True),
        (Graha.BUDHA, (2023, 6, 1), False),
        (Graha.SHUKRA, (2023, 8, 10), True),
        (Graha.MANGALA, (2022, 12, 1), True),
        (Graha.GURU, (2023, 10, 15), True),
        (Graha.SHANI, (2023, 8, 1), True),
        (Graha.SHANI, (2024, 1, 15), False),
    ],
)
def test_known_retrograde_periods(graha, date, retro):
    p = at(datetime(*date, tzinfo=UTC)).grahas[graha]
    assert p.retrograde is retro
    assert (p.speed < 0) is retro


def test_sun_and_moon_are_never_retrograde():
    for day in range(0, 365, 7):
        chart = at(datetime(2025, 1, 1, tzinfo=UTC) + timedelta(days=day))
        assert not chart.grahas[Graha.SURYA].retrograde
        assert not chart.grahas[Graha.CHANDRA].retrograde


def _crossing(start: datetime, value, hours: float = 72.0) -> datetime:
    """First moment after ``start`` when ``value(chart)`` (a longitude) enters a new rasi, to within 1 ms."""
    def rasi(t):
        return position(value(at(t))).rasi
    step = timedelta(minutes=20)
    t, r0 = start, rasi(start)
    while rasi(t + step) == r0:
        t += step
        assert t < start + timedelta(hours=hours), "no crossing found"
    lo, hi = t, t + step
    while hi - lo > timedelta(milliseconds=1):
        mid = lo + (hi - lo) / 2
        lo, hi = (mid, hi) if rasi(mid) == r0 else (lo, mid)
    return hi


def test_moon_at_29_59_and_0_00_of_a_sign():
    edge = _crossing(datetime(2024, 2, 1, tzinfo=UTC), lambda c: c.grahas[Graha.CHANDRA].longitude)
    before = position(at(edge - timedelta(seconds=1)).grahas[Graha.CHANDRA].longitude)
    after = position(at(edge + timedelta(seconds=1)).grahas[Graha.CHANDRA].longitude)
    assert after.rasi == Rasi(before.rasi % 12 + 1)
    assert before.in_rasi.format(seconds=False) == "29°59′"
    assert after.in_rasi.format(seconds=False) == "0°00′"


def test_lagna_at_a_sign_edge():
    edge = _crossing(datetime(2000, 1, 1, tzinfo=UTC), lambda c: c.lagna, hours=4)
    before, after = position(at(edge - timedelta(seconds=1)).lagna), position(at(edge + timedelta(seconds=1)).lagna)
    assert after.rasi == Rasi(before.rasi % 12 + 1)
    assert before.in_rasi.format(seconds=False) == "29°59′"
    assert after.in_rasi.format(seconds=False) == "0°00′"


def test_dates_outside_the_bundled_files_fail_loudly():
    with pytest.raises(EphemerisFilesMissing, match="1800–2399"):
        at(datetime(1750, 1, 1, tzinfo=UTC))


def test_missing_data_files_fail_instead_of_falling_back(tmp_path):
    try:
        configure(tmp_path)
        with pytest.raises(EphemerisFilesMissing):
            at(datetime(2000, 1, 1, tzinfo=UTC))
    finally:
        configure()
    at(datetime(2000, 1, 1, tzinfo=UTC))


def test_julian_day():
    # Swiss Ephemeris returns UT1, which differs from UTC by less than 0.9 s; on 2000-01-01 by about +0.355 s.
    jd = jd_from_utc(datetime(2000, 1, 1, 12, tzinfo=UTC))
    assert (jd - 2451545.0) * 86400 == pytest.approx(0.355, abs=0.05)
    assert abs(jd_from_utc(datetime(1975, 6, 1, tzinfo=UTC)) - 2442564.5) * 86400 < 0.9
    with pytest.raises(ValueError):
        jd_from_utc(datetime(2000, 1, 1, 12))
    with pytest.raises(ValueError):
        jd_from_utc(datetime(2000, 1, 1, 12, tzinfo=UTC).astimezone(__import__("zoneinfo").ZoneInfo("Asia/Kolkata")))


def test_bad_options_and_errors_are_reported():
    with pytest.raises(KeyError):
        at(datetime(2000, 1, 1, tzinfo=UTC), option="nope")
    assert issubclass(EphemerisFilesMissing, EphemerisError)


def test_positions_in_another_thread_use_the_data_files():
    """Swiss Ephemeris keeps its settings per thread, and a web server calls from worker threads."""
    import threading

    utc = datetime(1992, 3, 10, 22, 14, tzinfo=UTC)
    main = at(utc)
    results = {}

    def work(name):
        try:
            results[name] = at(utc, option="kp_new"), at(utc)
        except Exception as exc:  # noqa: BLE001 - reported below
            results[name] = exc

    threads = [threading.Thread(target=work, args=(i,)) for i in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    for name, r in results.items():
        assert not isinstance(r, Exception), f"thread {name}: {r!r}"
        kp, lahiri = r
        assert lahiri.grahas == main.grahas and lahiri.lagna == main.lagna
        assert kp.ayanamsa.option == "kp_new"
