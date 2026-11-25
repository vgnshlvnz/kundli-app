"""Sidereal positions, Lagna and ayanamsa from the Swiss Ephemeris (CONVENTIONS B, C9, C10).

pyswisseph keeps the sidereal mode and the data path as global state, so every call that sets them runs under
one lock. ``ayanamsa`` is the single place where an ayanamsa option is applied; ``compute_positions`` uses it.
"""

from __future__ import annotations

import threading
import tomllib
from dataclasses import dataclass
from datetime import datetime, timedelta
from importlib.resources import files
from pathlib import Path

import swisseph as swe

from kundli_core import AyanamsaValue, BirthMoment, BodyPosition, ChartPositions, GeoPoint, Graha, norm360


class EphemerisError(RuntimeError):
    pass


class EphemerisFilesMissing(EphemerisError):
    """The Swiss Ephemeris data files for the requested date are not available (no Moshier fallback)."""


class UnknownAyanamsa(KeyError):
    pass


@dataclass(frozen=True, slots=True)
class AyanamsaOption:
    id: str
    name: str
    swe_mode_name: str
    swe_mode: int
    t0: float | None = None
    ayan_t0: float | None = None


def _load_options() -> tuple[str, dict[str, AyanamsaOption]]:
    data = tomllib.loads((files("kundli_ephemeris") / "ayanamsas.toml").read_text(encoding="utf-8"))
    options: dict[str, AyanamsaOption] = {}
    for o in data["option"]:
        mode = getattr(swe, o["swe_mode"], None)
        if not isinstance(mode, int):
            raise ValueError(f"ayanamsas.toml: {o['id']}: unknown Swiss Ephemeris mode {o['swe_mode']!r}")
        if o["swe_mode"] == "SIDM_USER" and ("t0" not in o or "ayan_t0" not in o):
            raise ValueError(f"ayanamsas.toml: {o['id']}: SIDM_USER needs t0 and ayan_t0")
        if o["id"] in options:
            raise ValueError(f"ayanamsas.toml: duplicate id {o['id']!r}")
        options[o["id"]] = AyanamsaOption(o["id"], o["name"], o["swe_mode"], mode, o.get("t0"), o.get("ayan_t0"))
    if data["default"] not in options:
        raise ValueError("ayanamsas.toml: default is not one of the options")
    return data["default"], options


DEFAULT_AYANAMSA, _OPTIONS = _load_options()
BUNDLED_EPHE = Path(str(files("kundli_ephemeris") / "ephe"))

_LOCK = threading.RLock()
_ephe_path: Path | None = None

# Apparent geocentric positions from the data files, with speed (CONVENTIONS C9).
POSITION_FLAGS = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL
_PLANETS = (
    (Graha.SURYA, swe.SUN),
    (Graha.CHANDRA, swe.MOON),
    (Graha.MANGALA, swe.MARS),
    (Graha.BUDHA, swe.MERCURY),
    (Graha.GURU, swe.JUPITER),
    (Graha.SHUKRA, swe.VENUS),
    (Graha.SHANI, swe.SATURN),
)
_NEVER_RETROGRADE = (Graha.SURYA, Graha.CHANDRA)


def configure(ephe_path: Path | str | None = None) -> None:
    """Use the .se1 files in ``ephe_path`` (default: the files bundled with this module)."""
    global _ephe_path
    with _LOCK:
        _ephe_path = Path(ephe_path) if ephe_path is not None else BUNDLED_EPHE
        swe.set_ephe_path(str(_ephe_path))


def list_ayanamsas() -> tuple[AyanamsaOption, ...]:
    return tuple(_OPTIONS.values())


def get_option(option_id: str) -> AyanamsaOption:
    try:
        return _OPTIONS[option_id]
    except KeyError:
        raise UnknownAyanamsa(f"unknown ayanamsa {option_id!r}; expected one of {sorted(_OPTIONS)}") from None


def _apply(option: AyanamsaOption) -> None:
    if _ephe_path is None:
        configure()
    swe.set_sid_mode(option.swe_mode, option.t0 or 0.0, option.ayan_t0 or 0.0)


def ayanamsa(jd_ut: float, option_id: str = DEFAULT_AYANAMSA) -> AyanamsaValue:
    """The ayanamsa at ``jd_ut``, including nutation: the value subtracted from the positions (CONVENTIONS C10)."""
    option = get_option(option_id)
    with _LOCK:
        _apply(option)
        _, value = swe.get_ayanamsa_ex_ut(jd_ut, swe.FLG_SWIEPH)
    return AyanamsaValue(option.id, option.name, value)


def jd_from_utc(utc: datetime) -> float:
    """Julian day (UT) for an aware UTC datetime; leap seconds and ΔT are handled by Swiss Ephemeris."""
    if utc.utcoffset() != timedelta(0):
        raise ValueError("jd_from_utc needs an aware datetime in UTC")
    seconds = utc.second + utc.microsecond / 1e6
    try:
        _, jd_ut = swe.utc_to_jd(utc.year, utc.month, utc.day, utc.hour, utc.minute, seconds, swe.GREG_CAL)
    except swe.Error as exc:
        raise EphemerisError(str(exc)) from exc
    return jd_ut


def compute_positions(moment: BirthMoment, geo: GeoPoint, option_id: str = DEFAULT_AYANAMSA) -> ChartPositions:
    """Sidereal Lagna and the nine grahas at ``moment`` for an observer at ``geo``."""
    option = get_option(option_id)
    jd = jd_from_utc(moment.utc)
    grahas: dict[Graha, BodyPosition] = {}
    with _LOCK:
        _apply(option)
        try:
            for graha, body in _PLANETS:
                xx, ret = swe.calc_ut(jd, body, POSITION_FLAGS)
                if not ret & swe.FLG_SWIEPH:
                    raise EphemerisFilesMissing(
                        f"no Swiss Ephemeris data for {moment.utc:%Y-%m-%d} in {_ephe_path} "
                        "(the bundled files cover 1800–2399 CE)"
                    )
                speed = xx[3]
                grahas[graha] = BodyPosition(norm360(xx[0]), speed, speed < 0 and graha not in _NEVER_RETROGRADE)
            xx, _ = swe.calc_ut(jd, swe.MEAN_NODE, POSITION_FLAGS)
            rahu = norm360(xx[0])
            grahas[Graha.RAHU] = BodyPosition(rahu, xx[3], True)
            grahas[Graha.KETU] = BodyPosition(norm360(rahu + 180.0), xx[3], True)
            # The house system is irrelevant here; only the ascendant (the rising point) is used.
            _, ascmc = swe.houses_ex(jd, geo.lat, geo.lon, b"E", swe.FLG_SIDEREAL)
            _, ayan = swe.get_ayanamsa_ex_ut(jd, swe.FLG_SWIEPH)
        except swe.Error as exc:
            raise EphemerisError(str(exc)) from exc
    return ChartPositions(moment, geo, jd, AyanamsaValue(option.id, option.name, ayan), norm360(ascmc[0]), grahas)
