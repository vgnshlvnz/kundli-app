"""Local wall-clock time to UTC with the IANA rules, including history before 1970 (CONVENTIONS C11).

zoneinfo reads the operating system's tzdata first (/usr/share/zoneinfo). Nothing is guessed: a local time that
does not exist (clocks jumped forward) or that occurs twice (clocks went back) raises an error that says which
choice the user must make.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from kundli_core import BirthMoment, Place

from .store import PlaceNotUsable


class LocalTimeError(ValueError):
    pass


class UnknownTimezone(LocalTimeError):
    pass


class NonexistentLocalTime(LocalTimeError):
    """The local time falls in a gap (e.g. a DST change or a change of standard time)."""

    def __init__(self, local: datetime, tz: str, before: timedelta, after: timedelta):
        self.local, self.tz, self.offset_before, self.offset_after = local, tz, before, after
        super().__init__(
            f"{local:%Y-%m-%d %H:%M:%S} does not exist in {tz}: clocks moved from UTC{_fmt(before)} to "
            f"UTC{_fmt(after)}. Please check the birth time."
        )


class AmbiguousLocalTime(LocalTimeError):
    """The local time occurs twice; ``fold=0`` picks the first (earlier offset), ``fold=1`` the second."""

    def __init__(self, local: datetime, tz: str, first: timedelta, second: timedelta):
        self.local, self.tz, self.offsets = local, tz, (first, second)
        super().__init__(
            f"{local:%Y-%m-%d %H:%M:%S} occurs twice in {tz}: first at UTC{_fmt(first)}, then at "
            f"UTC{_fmt(second)}. Choose which one (fold 0 or 1)."
        )


def _fmt(offset: timedelta) -> str:
    total = int(offset.total_seconds())
    sign = "+" if total >= 0 else "-"
    h, rem = divmod(abs(total), 3600)
    m, s = divmod(rem, 60)
    return f"{sign}{h:02d}:{m:02d}" + (f":{s:02d}" if s else "")


def zone(tz: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise UnknownTimezone(f"unknown timezone {tz!r}") from exc


def to_utc(local: datetime, tz: str, fold: int | None = None) -> datetime:
    """Convert a naive local wall-clock time in ``tz`` to an aware UTC datetime."""
    if local.tzinfo is not None:
        raise ValueError("local must be a naive wall-clock datetime")
    if fold not in (None, 0, 1):
        raise ValueError("fold must be 0, 1 or None")
    z = zone(tz)
    first, second = local.replace(tzinfo=z, fold=0), local.replace(tzinfo=z, fold=1)
    off0, off1 = first.utcoffset(), second.utcoffset()
    exists0 = first.astimezone(UTC).astimezone(z).replace(tzinfo=None) == local
    exists1 = second.astimezone(UTC).astimezone(z).replace(tzinfo=None) == local
    if not exists0 and not exists1:
        raise NonexistentLocalTime(local, tz, off0, off1)
    if exists0 and exists1 and off0 != off1:
        if fold is None:
            raise AmbiguousLocalTime(local, tz, off0, off1)
        return (first if fold == 0 else second).astimezone(UTC)
    return (first if exists0 else second).astimezone(UTC)


def utc_offset(local: datetime, tz: str, fold: int | None = None) -> timedelta:
    return local - to_utc(local, tz, fold).replace(tzinfo=None)


def make_moment(local: datetime, place: Place, fold: int | None = None) -> BirthMoment:
    """The birth moment at a place; refuses places marked unusable (CONVENTIONS D5)."""
    if not place.usable:
        raise PlaceNotUsable(f"{place.label}: {place.note or 'not usable for a birth chart'}")
    return BirthMoment(local, place.tz, to_utc(local, place.tz, fold))
