"""Data passed between modules. All immutable."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from types import MappingProxyType

from .enums import Graha


@dataclass(frozen=True, slots=True)
class GeoPoint:
    """Geographic latitude (north +) and longitude (east +), in degrees."""

    lat: float
    lon: float

    def __post_init__(self) -> None:
        if not -90.0 <= self.lat <= 90.0:
            raise ValueError(f"latitude {self.lat} is outside -90..90")
        if not -180.0 <= self.lon <= 180.0:
            raise ValueError(f"longitude {self.lon} is outside -180..180")


@dataclass(frozen=True, slots=True)
class Place:
    id: int
    label: str
    country: str
    state: str | None
    geo: GeoPoint
    tz: str
    is_centroid: bool
    usable: bool = True
    note: str | None = None


@dataclass(frozen=True, slots=True)
class BirthMoment:
    """The birth time as entered (naive local wall-clock time in ``tz``) and as UTC."""

    local: datetime
    tz: str
    utc: datetime

    def __post_init__(self) -> None:
        if self.local.tzinfo is not None:
            raise ValueError("local must be a naive wall-clock datetime")
        if self.utc.utcoffset() != timedelta(0):
            raise ValueError("utc must be an aware datetime in UTC")

    @property
    def utc_offset(self) -> timedelta:
        return self.local - self.utc.replace(tzinfo=None)


@dataclass(frozen=True, slots=True)
class AyanamsaValue:
    option: str
    name: str
    degrees: float


@dataclass(frozen=True, slots=True)
class BodyPosition:
    """Sidereal longitude in degrees [0, 360), speed in degrees/day, and the retrograde flag shown."""

    longitude: float
    speed: float
    retrograde: bool


@dataclass(frozen=True)
class ChartPositions:
    moment: BirthMoment
    geo: GeoPoint
    jd_ut: float
    ayanamsa: AyanamsaValue
    lagna: float
    grahas: Mapping[Graha, BodyPosition] = field(default_factory=dict)

    def __post_init__(self) -> None:
        missing = [g for g in Graha if g not in self.grahas]
        if missing:
            raise ValueError(f"positions missing for {', '.join(missing)}")
        object.__setattr__(self, "grahas", MappingProxyType(dict(self.grahas)))
