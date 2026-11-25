"""Load the reference data tables shipped in ``kundli_core/data``."""

from __future__ import annotations

import tomllib
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cache
from importlib.resources import files
from types import MappingProxyType
from typing import Any

from .enums import Graha, Nakshatra, Rasi

LANGUAGES: tuple[str, ...] = ("en", "ta", "sa")
TABLES: tuple[str, ...] = ("rasis", "nakshatras", "grahas", "graha_abbreviations", "labels", "palette")


@cache
def load_table(name: str) -> Mapping[str, Any]:
    """The raw TOML of a data table, e.g. ``load_table("rasis")``."""
    if name not in TABLES:
        raise KeyError(f"no data table {name!r}")
    return MappingProxyType(tomllib.loads((files("kundli_core") / "data" / f"{name}.toml").read_text(encoding="utf-8")))


@dataclass(frozen=True, slots=True)
class RasiInfo:
    rasi: Rasi
    english: str
    sanskrit: str
    tamil_translit: str
    lord: Graha
    co_lord: Graha | None


@dataclass(frozen=True, slots=True)
class NakshatraInfo:
    nakshatra: Nakshatra
    name: str
    lord: Graha
    start: float  # degrees from 0° Mesha


@dataclass(frozen=True, slots=True)
class GrahaInfo:
    graha: Graha
    english: str
    sanskrit: str
    abbrev: str


@cache
def _rasis() -> dict[Rasi, RasiInfo]:
    out = {}
    for r in load_table("rasis")["rasi"]:
        rasi = Rasi(r["number"])
        assert rasi.name == r["id"], r
        co = r.get("co_lord")
        out[rasi] = RasiInfo(rasi, r["english"], r["sanskrit"], r["tamil_translit"], Graha(r["lord"]), Graha(co) if co else None)
    return out


@cache
def _nakshatras() -> dict[Nakshatra, NakshatraInfo]:
    out = {}
    for r in load_table("nakshatras")["nakshatra"]:
        n = Nakshatra(r["number"])
        assert n.name == r["id"], r
        out[n] = NakshatraInfo(n, r["name"], Graha(r["lord"]), (n - 1) * 40 / 3)
    return out


@cache
def _grahas() -> dict[Graha, GrahaInfo]:
    abbrev = {a["id"]: a["abbrev"] for a in load_table("graha_abbreviations")["abbreviation"]}
    return {
        Graha(g["id"]): GrahaInfo(Graha(g["id"]), g["english"], g["sanskrit"], abbrev[g["id"]])
        for g in load_table("grahas")["graha"]
    }


def rasi_info(rasi: Rasi) -> RasiInfo:
    return _rasis()[Rasi(rasi)]


def sign_lord(rasi: Rasi) -> Graha:
    """The classical lord of a rasi (seven grahas only; CONVENTIONS D2)."""
    return _rasis()[Rasi(rasi)].lord


def nakshatra_info(nakshatra: Nakshatra) -> NakshatraInfo:
    return _nakshatras()[Nakshatra(nakshatra)]


def graha_info(graha: Graha) -> GrahaInfo:
    return _grahas()[Graha(graha)]


def retrograde_mark() -> str:
    return next(a["abbrev"] for a in load_table("graha_abbreviations")["abbreviation"] if a["id"] == "RETROGRADE")


@cache
def labels(lang: str) -> Mapping[str, str]:
    """All display labels for a language, keyed ``"<group>.<CODE>"`` (e.g. ``"rasi.MESHA"``)."""
    if lang not in LANGUAGES:
        raise KeyError(f"unknown language {lang!r}; expected one of {LANGUAGES}")
    out = {}
    for group, entries in load_table("labels").items():
        for code, texts in entries.items():
            out[f"{group}.{code}"] = texts[lang]
    return MappingProxyType(out)


def label(key: str, lang: str) -> str:
    return labels(lang)[key]


@dataclass(frozen=True, slots=True)
class TextPair:
    fg: str
    bg: str
    use: str
    min_ratio: float


@dataclass(frozen=True, slots=True)
class Palette:
    colours: Mapping[str, str]
    decorative: tuple[str, ...]
    text_pairs: tuple[TextPair, ...]

    def hex(self, name: str) -> str:
        return self.colours[name]


@cache
def palette() -> Palette:
    t = load_table("palette")
    pairs = tuple(TextPair(p["fg"], p["bg"], p["use"], float(p["min_ratio"])) for p in t["text_pair"])
    return Palette(MappingProxyType(dict(t["colour"])), tuple(t["decorative"]["colours"]), pairs)
