"""Grahas, rasis and nakshatras.

Order follows the reference files: grahas Sun … Saturn, Rahu, Ketu (planets_day1_navagrahas, "Conventions");
rasis 1–12 from Mesha; nakshatras 1–27 from Ashwini.
"""

from enum import IntEnum, StrEnum


class Graha(StrEnum):
    SURYA = "SURYA"
    CHANDRA = "CHANDRA"
    MANGALA = "MANGALA"
    BUDHA = "BUDHA"
    GURU = "GURU"
    SHUKRA = "SHUKRA"
    SHANI = "SHANI"
    RAHU = "RAHU"
    KETU = "KETU"


SEVEN_GRAHAS: tuple[Graha, ...] = tuple(Graha)[:7]
"""The seven classical grahas: the only sign lords (CONVENTIONS D2)."""

NODES: tuple[Graha, ...] = (Graha.RAHU, Graha.KETU)


class Rasi(IntEnum):
    MESHA = 1
    VRISHABHA = 2
    MITHUNA = 3
    KARKA = 4
    SIMHA = 5
    KANYA = 6
    TULA = 7
    VRISCHIKA = 8
    DHANUS = 9
    MAKARA = 10
    KUMBHA = 11
    MEENA = 12


class Nakshatra(IntEnum):
    ASHWINI = 1
    BHARANI = 2
    KRITTIKA = 3
    ROHINI = 4
    MRIGASHIRA = 5
    ARDRA = 6
    PUNARVASU = 7
    PUSHYA = 8
    ASHLESHA = 9
    MAGHA = 10
    PURVA_PHALGUNI = 11
    UTTARA_PHALGUNI = 12
    HASTA = 13
    CHITRA = 14
    SWATI = 15
    VISHAKHA = 16
    ANURADHA = 17
    JYESHTHA = 18
    MOOLA = 19
    PURVA_ASHADHA = 20
    UTTARA_ASHADHA = 21
    SHRAVANA = 22
    DHANISHTHA = 23
    SHATABHISHA = 24
    PURVA_BHADRAPADA = 25
    UTTARA_BHADRAPADA = 26
    REVATI = 27
