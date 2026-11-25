"""Worked examples in the reference files, computed with Lahiri and the mean node.

These are not confirmed reference charts (those come from the owner during testing). The source app's settings
are not stated. Its graha positions agree with Lahiri + mean node to within about 1′. Its Lagna, both in the
planets_day2 example and in the rasis_signs Lagna timetable for the same day, runs about 1 minute of time ahead
of ours (about 17′ of Lagna at 19:00), consistent with slightly different coordinates or clock. The tolerances
below allow for that and no more.
"""

import re
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from kundli_core import BirthMoment, GeoPoint, Graha, angular_distance, rasi_of
from kundli_core.mdtables import read_table
from kundli_ephemeris import compute_positions

REF = Path(__file__).resolve().parents[3] / "docs" / "reference"
KUALA_LUMPUR = GeoPoint(3.139003, 101.686855)  # the Kuala Lumpur row of data/locations.db
MYT = timedelta(hours=8)
SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn",
         "Aquarius", "Pisces"]
NAMES = {"Sun": Graha.SURYA, "Moon": Graha.CHANDRA, "Mars": Graha.MANGALA, "Mercury": Graha.BUDHA,
         "Jupiter": Graha.GURU, "Venus": Graha.SHUKRA, "Saturn": Graha.SHANI, "Rahu": Graha.RAHU, "Ketu": Graha.KETU}


def chart_at_myt(local: datetime):
    utc = (local - MYT).replace(tzinfo=UTC)
    return compute_positions(BirthMoment(local, "Asia/Kuala_Lumpur", utc), KUALA_LUMPUR, "lahiri")


def test_planets_day2_kuala_lumpur_chart():
    """planets_day2_strengths §9.3: 14 March 2026, 7:00 PM, Kuala Lumpur."""
    rows = read_table(REF / "planets_day2_strengths_llm_ready.md", "9.3 Conjunction (Yuti)", index=1)
    chart = chart_at_myt(datetime(2026, 3, 14, 19, 0))
    assert len(rows) == 10
    for row in rows:
        m = re.fullmatch(r"(\d+)°(\d+)' (\w+)", row["Position"])
        expected = 30 * SIGNS.index(m.group(3)) + int(m.group(1)) + int(m.group(2)) / 60
        point = row["Point"]
        if point.startswith("Lagna"):
            ours, tolerance = chart.lagna, 20 / 60
        else:
            ours, tolerance = chart.grahas[NAMES[point]].longitude, 2 / 60
        assert rasi_of(ours) == rasi_of(expected), point
        assert angular_distance(ours, expected) <= tolerance, (point, ours, expected)


def test_rasis_signs_lagna_timetable():
    """rasis_signs §7.2: the Lagna signs on 14 March 2026 (place not stated; Kuala Lumpur assumed)."""
    rows = read_table(REF / "rasis_signs_llm_ready.md", "7.2 Sankranti, Tamil solar months and the lagna at sunrise", 1)
    starts = []
    for row in rows:
        start = datetime.strptime(row["Time"].split(" – ")[0], "%I:%M %p").time()
        day = 14 if start.hour >= 5 else 15
        starts.append((row["Lagna"].split(" (")[1].rstrip(")"), datetime(2026, 3, day, start.hour, start.minute)))
    assert len(starts) == 12
    for sign, start in starts:
        expected = SIGNS.index(sign) + 1
        # The Lagna must be in this sign from 2 minutes after the listed start time ...
        assert rasi_of(chart_at_myt(start + timedelta(minutes=2)).lagna) == expected, (sign, start)
        # ... and in the previous sign 2 minutes before it.
        assert rasi_of(chart_at_myt(start - timedelta(minutes=2)).lagna) == (expected - 2) % 12 + 1, (sign, start)


@pytest.mark.parametrize("hours", [0, 6, 12, 18])
def test_kuala_lumpur_lagna_is_stable_under_the_lock(hours):
    # Repeated calls with different ayanamsas must not leak the sidereal mode between calls.
    local = datetime(2026, 3, 14, hours)
    a = chart_at_myt(local).lagna
    utc = (local - MYT).replace(tzinfo=UTC)
    compute_positions(BirthMoment(local, "Asia/Kuala_Lumpur", utc), KUALA_LUMPUR, "raman")
    assert chart_at_myt(local).lagna == a
