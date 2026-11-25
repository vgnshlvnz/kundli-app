"""Kundli App bhava: the bhava of a point by whole sign and by bhava chalit (CONVENTIONS D1, C6).

- Whole sign: the Lagna's rasi is bhava 1, the next rasi bhava 2, and so on.
- Bhava chalit, as the reference files define it: equal 30° bhavas with the Lagna degree as the madhya (middle) of
  bhava 1, so bhava n spans [Lagna + 30°(n−1) − 15°, Lagna + 30°(n−1) + 15°). A point exactly on a sandhi belongs to
  the later bhava. This is not the quadrant-trisection Sripati of most software.

Both use the quantised arc-second arithmetic of kundli_core, so boundaries behave as in every other module.
"""

from __future__ import annotations

import tomllib
from collections.abc import Mapping
from dataclasses import dataclass
from importlib.resources import files
from types import MappingProxyType

from kundli_core import ChartPositions, Graha, count_from, norm360, rasi_of, to_arcsec

METHODS = MappingProxyType(tomllib.loads((files("kundli_bhava") / "methods.toml").read_text(encoding="utf-8")))
_SPAN = float(METHODS["chalit"]["bhava_span_deg"])
_OFFSET = float(METHODS["chalit"]["madhya_offset_deg"])
if _SPAN * 12 != 360.0:
    raise ValueError("methods.toml: chalit bhava_span_deg must divide the circle into 12")
_SPAN_ARCSEC = round(_SPAN * 3600)
CHALIT_NAME: str = METHODS["chalit"]["name"]


def whole_sign(lagna: float, lon: float) -> int:
    """Bhava 1–12 counted from the Lagna's rasi."""
    return count_from(rasi_of(lagna), rasi_of(lon))


def chalit(lagna: float, lon: float) -> int:
    """Bhava 1–12 with equal bhavas and the Lagna degree as the madhya of bhava 1."""
    return int(to_arcsec(lon - lagna + _OFFSET) // _SPAN_ARCSEC) + 1


def chalit_madhyas(lagna: float) -> tuple[float, ...]:
    """Middle of bhavas 1–12."""
    return tuple(norm360(lagna + _SPAN * k) for k in range(12))


def chalit_sandhis(lagna: float) -> tuple[float, ...]:
    """Start (sandhi) of bhavas 1–12; bhava n runs from sandhi n up to sandhi n+1."""
    return tuple(norm360(lagna - _OFFSET + _SPAN * k) for k in range(12))


@dataclass(frozen=True, slots=True)
class BhavaPlacement:
    whole_sign: int
    chalit: int

    @property
    def differs(self) -> bool:
        return self.whole_sign != self.chalit


def placement(lagna: float, lon: float) -> BhavaPlacement:
    return BhavaPlacement(whole_sign(lagna, lon), chalit(lagna, lon))


def assign(chart: ChartPositions) -> Mapping[Graha, BhavaPlacement]:
    """Both bhava numbers for each of the nine grahas."""
    return MappingProxyType({g: placement(chart.lagna, p.longitude) for g, p in chart.grahas.items()})


__all__ = ["CHALIT_NAME", "METHODS", "BhavaPlacement", "assign", "chalit", "chalit_madhyas", "chalit_sandhis",
           "placement", "whole_sign"]
