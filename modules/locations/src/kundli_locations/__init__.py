"""Kundli App locations: place search in data/locations.db, timezones, local time to UTC."""

from .store import LocationStore, PlaceNotUsable, UnknownPlace, default_paths, default_store
from .timezones import (
    AmbiguousLocalTime,
    LocalTimeError,
    NonexistentLocalTime,
    UnknownTimezone,
    make_moment,
    to_utc,
    utc_offset,
)


def search(query: str, limit: int = 10):
    """Search the default store (data/locations.db, or KUNDLI_LOCATIONS_DB)."""
    return default_store().search(query, limit)


def get(place_id: int):
    return default_store().get(place_id)


__all__ = [
    "AmbiguousLocalTime", "LocalTimeError", "LocationStore", "NonexistentLocalTime", "PlaceNotUsable",
    "UnknownPlace", "UnknownTimezone", "default_paths", "default_store", "get", "make_moment", "search", "to_utc",
    "utc_offset",
]
