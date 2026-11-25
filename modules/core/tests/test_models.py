from dataclasses import FrozenInstanceError
from datetime import UTC, datetime, timedelta

import pytest

from kundli_core import AyanamsaValue, BirthMoment, BodyPosition, ChartPositions, GeoPoint, Graha


def moment():
    return BirthMoment(datetime(1992, 3, 11, 6, 14), "Asia/Kuala_Lumpur", datetime(1992, 3, 10, 22, 14, tzinfo=UTC))


def test_geopoint_ranges():
    GeoPoint(-90, 180)
    for lat, lon in [(91, 0), (0, -181)]:
        with pytest.raises(ValueError):
            GeoPoint(lat, lon)


def test_birth_moment_offset_and_validation():
    assert moment().utc_offset == timedelta(hours=8)
    with pytest.raises(ValueError):
        BirthMoment(datetime(2000, 1, 1, tzinfo=UTC), "UTC", datetime(2000, 1, 1, tzinfo=UTC))
    with pytest.raises(ValueError):
        BirthMoment(datetime(2000, 1, 1), "UTC", datetime(2000, 1, 1))


def test_chart_positions_require_all_nine_grahas_and_are_read_only():
    pos = {g: BodyPosition(10.0 * i, 1.0, False) for i, g in enumerate(Graha)}
    chart = ChartPositions(moment(), GeoPoint(3.1, 101.7), 2448692.4, AyanamsaValue("lahiri", "Lahiri", 23.7), 5.0, pos)
    with pytest.raises(TypeError):
        chart.grahas[Graha.SURYA] = BodyPosition(0, 0, False)
    with pytest.raises(FrozenInstanceError):
        chart.lagna = 1.0
    del pos[Graha.KETU]
    with pytest.raises(ValueError, match="KETU"):
        ChartPositions(moment(), GeoPoint(0, 0), 0.0, AyanamsaValue("x", "x", 0), 0.0, pos)
