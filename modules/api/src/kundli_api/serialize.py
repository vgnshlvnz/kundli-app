"""JSON forms of the calculation results. Codes stay language-neutral; the web page maps them to labels."""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from kundli_core import Place, palette, to_dms
from kundli_placement import LagnaRow, PlacementRow


def offset_text(td: timedelta) -> str:
    total = int(td.total_seconds())
    sign = "+" if total >= 0 else "-"
    h, rem = divmod(abs(total), 3600)
    m, s = divmod(rem, 60)
    return f"{sign}{h:02d}:{m:02d}" + (f":{s:02d}" if s else "")


def place(p: Place) -> dict[str, Any]:
    return {
        "id": p.id, "label": p.label, "country": p.country, "state": p.state, "latitude": p.geo.lat,
        "longitude": p.geo.lon, "tz": p.tz, "is_centroid": p.is_centroid, "usable": p.usable, "note": p.note,
    }


def lagna_row(r: LagnaRow) -> dict[str, Any]:
    return {
        "longitude": round(r.longitude, 6), "rasi": r.rasi.name, "degree": r.in_rasi.format(seconds=False),
        "degree_dms": r.in_rasi.format(), "nakshatra": r.nakshatra.name, "pada": r.pada, "lord": r.lord.name,
        "lord_bhava_whole_sign": r.lord_bhava_whole_sign, "lord_bhava_chalit": r.lord_bhava_chalit,
    }


def placement_row(r: PlacementRow) -> dict[str, Any]:
    return {
        "graha": r.graha.name, "longitude": round(r.longitude, 6), "rasi": r.rasi.name,
        "degree": r.in_rasi.format(seconds=False), "degree_dms": r.in_rasi.format(), "nakshatra": r.nakshatra.name,
        "pada": r.pada, "retrograde": r.retrograde, "combust": r.combust,
        "sun_distance": None if r.sun_distance is None else round(r.sun_distance, 4),
        "bhava_whole_sign": r.bhava_whole_sign, "bhava_chalit": r.bhava_chalit, "bhava_differs": r.bhava_differs,
        "categories_whole_sign": list(r.categories_whole_sign), "categories_chalit": list(r.categories_chalit),
        "dignity": r.dignity, "kshetra": r.kshetra, "lord_of": list(r.lord_of), "dispositor": r.dispositor.name,
        "dispositor_bhava_whole_sign": r.dispositor_bhava_whole_sign,
        "dispositor_bhava_chalit": r.dispositor_bhava_chalit,
    }


def ayanamsa_dms(degrees: float) -> str:
    return to_dms(degrees).format()


def theme_css() -> str:
    """The palette as CSS custom properties, so the page and the chart use the same colours."""
    p = palette()
    props = "\n".join(f"  --{name.replace('_', '-')}: {hex_};" for name, hex_ in p.colours.items())
    return f"/* Generated from kundli_core/data/palette.toml. */\n:root {{\n{props}\n}}\n"
