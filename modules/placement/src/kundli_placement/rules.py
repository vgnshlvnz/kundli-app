"""Load the rule tables in ``kundli_placement/rules/*.toml`` into typed, read-only structures.

The TOML files are the rules: an astrologer can correct them without touching code. Each one records the reference
file and section it came from, and the placement tests check it against that section.
"""

from __future__ import annotations

import tomllib
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cache
from importlib.resources import files
from types import MappingProxyType
from typing import Any

from kundli_core import Graha, Rasi

RULE_TABLES = (
    "uccha_neecha", "moolatrikona", "own_signs", "sign_portions", "naisargika_maitri", "combustion",
    "bhava_categories", "dignity_precedence",
)
DIGNITIES = ("UCCHA", "NEECHA", "MOOLATRIKONA", "SWAKSHETRA", "MITRA_KSHETRA", "SAMA_KSHETRA", "SHATRU_KSHETRA")


@cache
def load_rule_table(name: str) -> Mapping[str, Any]:
    if name not in RULE_TABLES:
        raise KeyError(f"no rule table {name!r}")
    return MappingProxyType(tomllib.loads((files("kundli_placement") / "rules" / f"{name}.toml").read_text(encoding="utf-8")))


@dataclass(frozen=True, slots=True)
class Segment:
    from_deg: float
    to_deg: float
    dignity: str


@dataclass(frozen=True)
class Rules:
    uccha: Mapping[Graha, tuple[Rasi, float]]
    neecha: Mapping[Graha, tuple[Rasi, float]]
    moolatrikona: Mapping[Graha, tuple[Rasi, float, float]]
    own_signs: Mapping[Graha, frozenset[Rasi]]
    portions: Mapping[tuple[Graha, Rasi], tuple[Segment, ...]]
    friends: Mapping[Graha, frozenset[Graha]]
    enemies: Mapping[Graha, frozenset[Graha]]
    neutrals: Mapping[Graha, frozenset[Graha]]
    combust_orb: Mapping[Graha, tuple[float, float | None]]
    categories: tuple[tuple[str, frozenset[int]], ...]
    precedence: tuple[str, ...]


def _ro(d: dict) -> Mapping:
    return MappingProxyType(d)


@cache
def rules() -> Rules:
    un = load_rule_table("uccha_neecha")["graha"]
    mt = load_rule_table("moolatrikona")["graha"]
    own = load_rule_table("own_signs")["graha"]
    por = load_rule_table("sign_portions")["graha"]
    nm = load_rule_table("naisargika_maitri")["graha"]
    cb = load_rule_table("combustion")["graha"]
    cat = load_rule_table("bhava_categories")["category"]
    order = tuple(load_rule_table("dignity_precedence")["order"])
    if not set(order) <= set(DIGNITIES[:4]):
        raise ValueError(f"dignity_precedence.toml: unknown dignity in {order}")
    portions = {}
    for r in por:
        segs = tuple(Segment(float(s["from_deg"]), float(s["to_deg"]), s["dignity"]) for s in r["segments"])
        if segs[0].from_deg != 0 or segs[-1].to_deg != 30 or any(a.to_deg != b.from_deg for a, b in zip(segs, segs[1:])):
            raise ValueError(f"sign_portions.toml: {r['id']} segments must cover 0°–30° without gaps")
        if any(s.dignity not in DIGNITIES[:4] for s in segs):
            raise ValueError(f"sign_portions.toml: {r['id']} has an unknown dignity")
        portions[(Graha(r["id"]), Rasi[r["rasi"]])] = segs
    return Rules(
        uccha=_ro({Graha(r["id"]): (Rasi[r["uccha_rasi"]], float(r["uccha_deg"])) for r in un}),
        neecha=_ro({Graha(r["id"]): (Rasi[r["neecha_rasi"]], float(r["neecha_deg"])) for r in un}),
        moolatrikona=_ro({Graha(r["id"]): (Rasi[r["rasi"]], float(r["from_deg"]), float(r["to_deg"])) for r in mt}),
        own_signs=_ro({Graha(r["id"]): frozenset(Rasi[s] for s in r["own"]) for r in own}),
        portions=_ro(portions),
        friends=_ro({Graha(r["id"]): frozenset(map(Graha, r["friends"])) for r in nm}),
        enemies=_ro({Graha(r["id"]): frozenset(map(Graha, r["enemies"])) for r in nm}),
        neutrals=_ro({Graha(r["id"]): frozenset(map(Graha, r["neutrals"])) for r in nm}),
        combust_orb=_ro({Graha(r["id"]): (float(r["orb_deg"]), r.get("retrograde_orb_deg")) for r in cb}),
        categories=tuple((c["id"], frozenset(c["bhavas"])) for c in cat),
        precedence=order,
    )
