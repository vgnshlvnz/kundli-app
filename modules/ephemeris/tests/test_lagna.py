"""The Lagna is the ecliptic point rising on the eastern horizon (horoscope_signs_houses §3.1), at any latitude.

The check is physical: add the ayanamsa back to get the tropical point, convert it to horizon coordinates, and
require it to be on the horizon, in the eastern half and rising. Inside the polar circles this is where the
textbook formula can return the setting point instead; Swiss Ephemeris returns the rising point.
"""

from datetime import UTC, datetime, timedelta

import pytest
import swisseph as swe

from kundli_core import BirthMoment, GeoPoint, norm360
from kundli_ephemeris import compute_positions

LATITUDES = [-60.0, -34.6037, -33.8688, -10.0, 0.0, 13.0827, 28.6139, 51.5074, 65.0, 66.5, 69.6492, 75.0, 80.0]


def horizon(jd, geo, ecl_lon):
    az, alt, _ = swe.azalt(jd, swe.ECL2HOR, (geo.lon, geo.lat, 0.0), 0.0, 10.0, (ecl_lon, 0.0, 1.0))
    return az, alt  # azimuth from south through west; 180–360 is the eastern half


@pytest.mark.parametrize("lat", LATITUDES)
def test_lagna_rises_on_the_eastern_horizon(lat):
    geo = GeoPoint(lat, 18.96)
    start = datetime(2026, 3, 14, tzinfo=UTC)
    for k in range(48):
        utc = start + timedelta(minutes=30 * k)
        chart = compute_positions(BirthMoment(utc.replace(tzinfo=None), "UTC", utc), geo, "lahiri")
        tropical = norm360(chart.lagna + chart.ayanamsa.degrees)
        az, alt = horizon(chart.jd_ut, geo, tropical)
        _, alt_later = horizon(chart.jd_ut + 1 / 1440, geo, tropical)
        assert abs(alt) < 1e-4, (lat, utc, alt)
        assert 180.0 <= az <= 360.0, (lat, utc, az)
        assert alt_later > alt, (lat, utc, "setting, not rising")


@pytest.mark.parametrize("option", ["lahiri", "raman", "kp_old", "kp_new"])
def test_lagna_uses_the_same_ayanamsa_as_the_grahas(option):
    utc = datetime(1987, 11, 2, 23, 40, tzinfo=UTC)
    geo = GeoPoint(-33.8688, 151.2093)
    chart = compute_positions(BirthMoment(utc.replace(tzinfo=None), "UTC", utc), geo, option)
    _, ascmc = swe.houses_ex(chart.jd_ut, geo.lat, geo.lon, b"E", 0)
    assert abs((ascmc[0] - chart.lagna) % 360 - chart.ayanamsa.degrees) * 3600 < 0.001
