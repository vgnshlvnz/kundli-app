"""The placement engine: one row per graha stating where it is and what that placement is.

Every rule comes from the rule tables (rules.py); this module only applies them. Output uses language-neutral codes
(Rasi, Nakshatra and Graha enums; dignity and category codes), which the labels in kundli_core translate.
"""

from __future__ import annotations

from dataclasses import dataclass

from kundli_bhava import assign
from kundli_core import (
    DMS,
    SEVEN_GRAHAS,
    ChartPositions,
    Graha,
    Nakshatra,
    Rasi,
    angular_distance,
    position,
    sign_lord,
)

from .rules import Rules, rules


@dataclass(frozen=True, slots=True)
class LagnaRow:
    longitude: float
    rasi: Rasi
    in_rasi: DMS
    nakshatra: Nakshatra
    pada: int
    lord: Graha
    lord_bhava_whole_sign: int
    lord_bhava_chalit: int


@dataclass(frozen=True, slots=True)
class PlacementRow:
    graha: Graha
    longitude: float
    rasi: Rasi
    in_rasi: DMS
    nakshatra: Nakshatra
    pada: int
    retrograde: bool
    combust: bool
    sun_distance: float | None  # degrees from the Sun; None for the Sun, Rahu and Ketu
    bhava_whole_sign: int
    bhava_chalit: int
    bhava_differs: bool
    categories_whole_sign: tuple[str, ...]
    categories_chalit: tuple[str, ...]
    dignity: str
    kshetra: str | None  # the graha's relationship to its sign lord (MITRA/SAMA/SHATRU_KSHETRA); None in its own sign
    lord_of: tuple[int, ...]  # bhavas (whole sign) whose sign this graha rules; empty for Rahu and Ketu
    dispositor: Graha
    dispositor_bhava_whole_sign: int
    dispositor_bhava_chalit: int


@dataclass(frozen=True, slots=True)
class PlacementTable:
    lagna: LagnaRow
    rows: tuple[PlacementRow, ...]

    def row(self, graha: Graha) -> PlacementRow:
        return next(r for r in self.rows if r.graha == graha)


def kshetra(graha: Graha, lord: Graha, r: Rules | None = None) -> str | None:
    """Mitra, sama or shatru kshetra by the natural relationship of ``graha`` to ``lord`` (CONVENTIONS D4)."""
    r = r or rules()
    if graha == lord:
        return None
    if lord in r.friends[graha]:
        return "MITRA_KSHETRA"
    if lord in r.enemies[graha]:
        return "SHATRU_KSHETRA"
    if lord in r.neutrals[graha]:
        return "SAMA_KSHETRA"
    raise ValueError(f"naisargika_maitri.toml gives no relationship of {graha.name} to {lord.name}")


def dignity(graha: Graha, lon: float, r: Rules | None = None) -> str:
    """Uccha, neecha, moolatrikona, swakshetra, or mitra / sama / shatru kshetra (CONVENTIONS C1–C3, D4)."""
    r = r or rules()
    p = position(lon)
    deg = p.in_rasi.degrees + p.in_rasi.minutes / 60 + p.in_rasi.seconds / 3600
    portion = next((s.dignity for s in r.portions.get((graha, p.rasi), ()) if s.from_deg <= deg < s.to_deg), None)
    has_portions = (graha, p.rasi) in r.portions
    for d in r.precedence:
        if d == "UCCHA" and (portion == "UCCHA" or (not has_portions and r.uccha[graha][0] == p.rasi)):
            return d
        if d == "NEECHA" and r.neecha[graha][0] == p.rasi:
            return d
        if d == "MOOLATRIKONA" and portion == "MOOLATRIKONA":
            return d
        if d == "SWAKSHETRA" and (portion == "SWAKSHETRA" or (not has_portions and p.rasi in r.own_signs[graha])):
            return d
    return kshetra(graha, sign_lord(p.rasi), r)


def combustion(graha: Graha, lon: float, retrograde: bool, sun_lon: float, r: Rules | None = None) -> tuple[bool, float | None]:
    """Whether ``graha`` is combust, by angular distance from the Sun only (CONVENTIONS D3, C4)."""
    r = r or rules()
    if graha not in r.combust_orb:
        return False, None
    orb, retro_orb = r.combust_orb[graha]
    if retrograde and retro_orb is not None:
        orb = retro_orb
    distance = angular_distance(lon, sun_lon)
    return distance <= orb, distance


def categories(bhava: int, r: Rules | None = None) -> tuple[str, ...]:
    r = r or rules()
    return tuple(code for code, bhavas in r.categories if bhava in bhavas)


def lordships(lagna: float) -> dict[Graha, tuple[int, ...]]:
    """Bhavas each graha rules from this Lagna, by whole sign (CONVENTIONS C8, D2)."""
    out: dict[Graha, list[int]] = {g: [] for g in Graha}
    lagna_rasi = position(lagna).rasi
    for bhava in range(1, 13):
        rasi = Rasi((lagna_rasi - 1 + bhava - 1) % 12 + 1)
        out[sign_lord(rasi)].append(bhava)
    return {g: tuple(v) for g, v in out.items()}


def build_table(chart: ChartPositions) -> PlacementTable:
    r = rules()
    bhavas = assign(chart)
    lords = lordships(chart.lagna)
    sun = chart.grahas[Graha.SURYA].longitude
    lp = position(chart.lagna)
    lagna_lord = sign_lord(lp.rasi)
    lagna_row = LagnaRow(chart.lagna, lp.rasi, lp.in_rasi, lp.nakshatra, lp.pada, lagna_lord,
                         bhavas[lagna_lord].whole_sign, bhavas[lagna_lord].chalit)
    rows = []
    for graha in Graha:
        body = chart.grahas[graha]
        p = position(body.longitude)
        b = bhavas[graha]
        lord = sign_lord(p.rasi)
        is_combust, distance = combustion(graha, body.longitude, body.retrograde, sun, r)
        rows.append(PlacementRow(
            graha=graha, longitude=body.longitude, rasi=p.rasi, in_rasi=p.in_rasi, nakshatra=p.nakshatra,
            pada=p.pada, retrograde=body.retrograde, combust=is_combust, sun_distance=distance,
            bhava_whole_sign=b.whole_sign, bhava_chalit=b.chalit, bhava_differs=b.differs,
            categories_whole_sign=categories(b.whole_sign, r), categories_chalit=categories(b.chalit, r),
            dignity=dignity(graha, body.longitude, r), kshetra=kshetra(graha, lord, r),
            lord_of=lords[graha] if graha in SEVEN_GRAHAS else (),
            dispositor=lord, dispositor_bhava_whole_sign=bhavas[lord].whole_sign,
            dispositor_bhava_chalit=bhavas[lord].chalit,
        ))
    return PlacementTable(lagna_row, tuple(rows))


__all__ = ["LagnaRow", "PlacementRow", "PlacementTable", "build_table", "categories", "combustion", "dignity",
           "kshetra", "lordships"]
