"""Local time to UTC with historical rules, gaps and overlaps (CONVENTIONS C11)."""

from datetime import UTC, datetime, timedelta

import pytest

from kundli_core import GeoPoint, Place
from kundli_locations import (
    AmbiguousLocalTime,
    NonexistentLocalTime,
    PlaceNotUsable,
    UnknownTimezone,
    make_moment,
    to_utc,
    utc_offset,
)


def hm(h, m=0, s=0):
    return timedelta(hours=h, minutes=m, seconds=s)


@pytest.mark.parametrize(
    "tz, local, offset",
    [
        # India: Madras time before 1906, IST after, war time +06:30 in 1941–42 and 1942–45.
        ("Asia/Kolkata", datetime(1900, 6, 1, 12), hm(5, 21, 10)),
        ("Asia/Kolkata", datetime(1942, 6, 1, 12), hm(5, 30)),
        ("Asia/Kolkata", datetime(1943, 6, 1, 12), hm(6, 30)),
        ("Asia/Kolkata", datetime(1960, 6, 1, 12), hm(5, 30)),
        # Peninsular Malaysia: +07:20, Japanese occupation +09:00, +07:30, then +08:00 from 1982.
        ("Asia/Kuala_Lumpur", datetime(1935, 6, 1, 12), hm(7, 20)),
        ("Asia/Kuala_Lumpur", datetime(1943, 6, 1, 12), hm(9)),
        ("Asia/Kuala_Lumpur", datetime(1950, 6, 1, 12), hm(7, 30)),
        ("Asia/Kuala_Lumpur", datetime(1981, 12, 31, 23, 15), hm(7, 30)),
        ("Asia/Kuala_Lumpur", datetime(1982, 1, 1, 0, 15), hm(8)),
        ("Asia/Kuala_Lumpur", datetime(1992, 3, 11, 6, 14), hm(8)),
        # Southern-hemisphere summer time.
        ("Australia/Sydney", datetime(2023, 1, 15, 12), hm(11)),
        ("Australia/Sydney", datetime(2023, 7, 15, 12), hm(10)),
    ],
)
def test_historical_offsets(tz, local, offset):
    assert utc_offset(local, tz) == offset
    assert to_utc(local, tz) == (local - offset).replace(tzinfo=UTC)


def test_os_tzdata_keeps_pre_1970_history():
    # Norway kept summer time in 1959–65. A tzdata build without "backzone" links Oslo to Berlin, which had none,
    # and would give +01:00 here. Old births need the full history (CONVENTIONS C11).
    assert utc_offset(datetime(1960, 7, 1, 12), "Europe/Oslo") == hm(2), "OS tzdata lacks pre-1970 history"


def test_change_of_standard_time_leaves_a_gap():
    # 1982-01-01: Malaysia moved from +07:30 to +08:00 at local midnight, so 23:30–23:59 on 31 Dec never happened.
    with pytest.raises(NonexistentLocalTime) as exc:
        to_utc(datetime(1981, 12, 31, 23, 45), "Asia/Kuala_Lumpur")
    assert exc.value.offset_before == hm(7, 30) and exc.value.offset_after == hm(8)
    assert "does not exist" in str(exc.value)


def test_dst_gap_is_not_guessed():
    with pytest.raises(NonexistentLocalTime, match="UTC-05:00 to UTC-04:00"):
        to_utc(datetime(2021, 3, 14, 2, 30), "America/New_York")


def test_dst_overlap_needs_a_choice():
    local = datetime(2021, 11, 7, 1, 30)
    with pytest.raises(AmbiguousLocalTime) as exc:
        to_utc(local, "America/New_York")
    assert exc.value.offsets == (hm(-4), hm(-5))
    assert to_utc(local, "America/New_York", fold=0) == datetime(2021, 11, 7, 5, 30, tzinfo=UTC)
    assert to_utc(local, "America/New_York", fold=1) == datetime(2021, 11, 7, 6, 30, tzinfo=UTC)


def test_fold_is_ignored_when_the_time_is_unambiguous():
    local = datetime(2021, 7, 1, 12)
    assert to_utc(local, "America/New_York", fold=1) == to_utc(local, "America/New_York")


def test_invalid_input():
    with pytest.raises(ValueError):
        to_utc(datetime(2000, 1, 1, tzinfo=UTC), "UTC")
    with pytest.raises(ValueError):
        to_utc(datetime(2000, 1, 1), "UTC", fold=2)
    with pytest.raises(UnknownTimezone):
        to_utc(datetime(2000, 1, 1), "Mars/Olympus_Mons")


def test_make_moment():
    place = Place(1, "Kuala Lumpur, Malaysia", "Malaysia", "Kuala Lumpur", GeoPoint(3.139, 101.687), "Asia/Kuala_Lumpur", False)
    m = make_moment(datetime(1992, 3, 11, 6, 14), place)
    assert m.utc == datetime(1992, 3, 10, 22, 14, tzinfo=UTC) and m.tz == "Asia/Kuala_Lumpur"
    assert m.utc_offset == hm(8)
    rejected = Place(2, "Malaysia", "Malaysia", None, GeoPoint(4.2, 102.0), "Asia/Kuala_Lumpur", True, False, "country centre")
    with pytest.raises(PlaceNotUsable, match="country centre"):
        make_moment(datetime(1992, 3, 11, 6, 14), rejected)
