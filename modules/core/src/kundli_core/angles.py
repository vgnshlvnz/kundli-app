"""Longitude arithmetic: rasi, nakshatra, pada and degree display.

Every lookup works on one quantised value: the longitude in arc-seconds. A value within 1e-6″ of a whole
arc-second is snapped to it, so a longitude built as ``10 + 0/60`` is exactly the start of Ashwini pada 4 and
not, through float error, the end of pada 3. All ranges are half-open, [start, end) (CONVENTIONS C5), and the
same quantised value feeds both the lookups and the display, so a graha shown in a rasi can never be displayed
as 30°00′ of it. Display truncates; it never rounds up.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .enums import Nakshatra, Rasi

ARCSEC_PER_DEGREE = 3600
CIRCLE_ARCSEC = 360 * ARCSEC_PER_DEGREE
RASI_ARCSEC = 30 * ARCSEC_PER_DEGREE  # 30°00′
NAKSHATRA_ARCSEC = 48_000  # 13°20′ (nakshatras_navatara_navamsa §1)
PADA_ARCSEC = 12_000  # 3°20′
_SNAP = 1e-6  # arc-seconds


def norm360(deg: float) -> float:
    """Normalise to [0, 360)."""
    x = math.fmod(deg, 360.0)
    if x < 0:
        x += 360.0
    return 0.0 if x >= 360.0 else x + 0.0  # + 0.0 turns -0.0 into 0.0


def _snap(arcsec: float) -> float:
    near = round(arcsec)
    return float(near) if abs(arcsec - near) < _SNAP else arcsec


def to_arcsec(lon: float) -> float:
    """Longitude in arc-seconds, in [0, 1 296 000), snapped to whole seconds within 1e-6″."""
    return _snap(norm360(lon) * ARCSEC_PER_DEGREE) % CIRCLE_ARCSEC


def rasi_of(lon: float) -> Rasi:
    return Rasi(int(to_arcsec(lon) // RASI_ARCSEC) + 1)


def deg_in_rasi(lon: float) -> float:
    """Degrees within the rasi, in [0, 30)."""
    a = to_arcsec(lon)
    return (a - (int(a // RASI_ARCSEC)) * RASI_ARCSEC) / ARCSEC_PER_DEGREE


def nakshatra_pada(lon: float) -> tuple[Nakshatra, int]:
    """Nakshatra and pada (1–4)."""
    a = to_arcsec(lon)
    n = int(a // NAKSHATRA_ARCSEC)
    pada = int((a - n * NAKSHATRA_ARCSEC) // PADA_ARCSEC) + 1
    return Nakshatra(n + 1), pada


def count_from(start: Rasi, target: Rasi) -> int:
    """Position of ``target`` counted from ``start``, inclusively (``start`` itself is 1st)."""
    return (int(target) - int(start)) % 12 + 1


@dataclass(frozen=True, slots=True)
class DMS:
    negative: bool
    degrees: int
    minutes: int
    seconds: int

    def format(self, seconds: bool = True) -> str:
        sign = "-" if self.negative else ""
        if seconds:
            return f"{sign}{self.degrees}°{self.minutes:02d}′{self.seconds:02d}″"
        return f"{sign}{self.degrees}°{self.minutes:02d}′"


def to_dms(deg: float) -> DMS:
    """Split an angle into degrees, minutes and whole seconds, truncating (never rounding up)."""
    total = _snap(abs(deg) * ARCSEC_PER_DEGREE)
    secs = math.floor(total)
    d, rem = divmod(secs, ARCSEC_PER_DEGREE)
    m, s = divmod(rem, 60)
    return DMS(deg < 0 and secs > 0, int(d), int(m), int(s))


@dataclass(frozen=True, slots=True)
class RasiPosition:
    """Where a longitude falls: rasi, degrees within it (truncated DMS), nakshatra and pada."""

    longitude: float
    rasi: Rasi
    in_rasi: DMS
    nakshatra: Nakshatra
    pada: int


def position(lon: float) -> RasiPosition:
    a = to_arcsec(lon)
    r = int(a // RASI_ARCSEC)
    n = int(a // NAKSHATRA_ARCSEC)
    pada = int((a - n * NAKSHATRA_ARCSEC) // PADA_ARCSEC) + 1
    secs = math.floor(a - r * RASI_ARCSEC)
    d, rem = divmod(secs, ARCSEC_PER_DEGREE)
    m, s = divmod(rem, 60)
    return RasiPosition(norm360(lon), Rasi(r + 1), DMS(False, int(d), int(m), int(s)), Nakshatra(n + 1), pada)


def angular_distance(a: float, b: float) -> float:
    """Shortest separation between two longitudes, in [0, 180]."""
    d = abs(norm360(a) - norm360(b))
    return 360.0 - d if d > 180.0 else d
