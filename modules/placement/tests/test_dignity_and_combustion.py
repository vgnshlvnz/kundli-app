"""Dignity (CONVENTIONS C1–C3, D4) and combustion (D3, C4)."""

import pytest

from kundli_core import Graha, Rasi
from kundli_placement import combustion, dignity, kshetra

G = Graha


def lon(rasi: Rasi, d: float, m: float = 0, s: float = 0) -> float:
    return (rasi - 1) * 30 + d + m / 60 + s / 3600


@pytest.mark.parametrize(
    "graha, rasi, deg, expected",
    [
        (G.SURYA, Rasi.MESHA, 10, "UCCHA"),
        (G.SURYA, Rasi.MESHA, 29.9, "UCCHA"),  # the whole exaltation sign (C1)
        (G.SURYA, Rasi.TULA, 10, "NEECHA"),
        (G.SURYA, Rasi.SIMHA, 0, "MOOLATRIKONA"),
        (G.SURYA, Rasi.SIMHA, 25, "SWAKSHETRA"),
        (G.SURYA, Rasi.KUMBHA, 5, "SHATRU_KSHETRA"),  # Saturn is the Sun's enemy
        (G.SURYA, Rasi.KANYA, 5, "SAMA_KSHETRA"),  # Mercury is neutral to the Sun
        (G.CHANDRA, Rasi.VRISHABHA, 2, "UCCHA"),
        (G.CHANDRA, Rasi.VRISHABHA, 3, "MOOLATRIKONA"),
        (G.CHANDRA, Rasi.KARKA, 20, "SWAKSHETRA"),
        (G.CHANDRA, Rasi.VRISCHIKA, 3, "NEECHA"),
        (G.CHANDRA, Rasi.MITHUNA, 5, "MITRA_KSHETRA"),
        (G.CHANDRA, Rasi.MESHA, 5, "SAMA_KSHETRA"),
        (G.MANGALA, Rasi.MAKARA, 28, "UCCHA"),
        (G.MANGALA, Rasi.KARKA, 1, "NEECHA"),  # neecha, though in a friend's sign
        (G.MANGALA, Rasi.MESHA, 11.99, "MOOLATRIKONA"),
        (G.MANGALA, Rasi.MESHA, 12, "SWAKSHETRA"),
        (G.MANGALA, Rasi.VRISCHIKA, 1, "SWAKSHETRA"),
        (G.MANGALA, Rasi.MITHUNA, 1, "SHATRU_KSHETRA"),
        (G.BUDHA, Rasi.KANYA, 10, "UCCHA"),
        (G.BUDHA, Rasi.KANYA, 17, "MOOLATRIKONA"),
        (G.BUDHA, Rasi.KANYA, 25, "SWAKSHETRA"),
        (G.BUDHA, Rasi.MITHUNA, 10, "SWAKSHETRA"),
        (G.BUDHA, Rasi.MEENA, 15, "NEECHA"),
        (G.BUDHA, Rasi.KARKA, 15, "SHATRU_KSHETRA"),
        (G.GURU, Rasi.KARKA, 5, "UCCHA"),
        (G.GURU, Rasi.DHANUS, 5, "MOOLATRIKONA"),
        (G.GURU, Rasi.DHANUS, 12, "SWAKSHETRA"),  # C2: §4.1 "remainder", not §4's 5°–30°
        (G.GURU, Rasi.MEENA, 1, "SWAKSHETRA"),
        (G.GURU, Rasi.MAKARA, 5, "NEECHA"),
        (G.SHUKRA, Rasi.MEENA, 27, "UCCHA"),
        (G.SHUKRA, Rasi.TULA, 14.99, "MOOLATRIKONA"),
        (G.SHUKRA, Rasi.TULA, 17, "SWAKSHETRA"),  # C2: §4 prints 20°–30°, leaving 15°–20° undefined
        (G.SHUKRA, Rasi.VRISHABHA, 1, "SWAKSHETRA"),
        (G.SHUKRA, Rasi.KANYA, 27, "NEECHA"),
        (G.SHANI, Rasi.TULA, 20, "UCCHA"),
        (G.SHANI, Rasi.MESHA, 20, "NEECHA"),
        (G.SHANI, Rasi.KUMBHA, 19, "MOOLATRIKONA"),
        (G.SHANI, Rasi.KUMBHA, 21, "SWAKSHETRA"),
        (G.SHANI, Rasi.MAKARA, 1, "SWAKSHETRA"),
        (G.RAHU, Rasi.VRISHABHA, 20, "UCCHA"),
        (G.RAHU, Rasi.VRISCHIKA, 20, "NEECHA"),
        (G.RAHU, Rasi.KUMBHA, 5, "SWAKSHETRA"),  # co-lord (D2), dignity only
        (G.RAHU, Rasi.SIMHA, 5, "SHATRU_KSHETRA"),
        (G.RAHU, Rasi.MEENA, 5, "MITRA_KSHETRA"),
        (G.RAHU, Rasi.MITHUNA, 5, "SAMA_KSHETRA"),
        (G.KETU, Rasi.VRISCHIKA, 5, "UCCHA"),  # exalted and own: uccha (C3)
        (G.KETU, Rasi.VRISHABHA, 5, "NEECHA"),
        (G.KETU, Rasi.MITHUNA, 5, "SAMA_KSHETRA"),
        (G.KETU, Rasi.SIMHA, 5, "SHATRU_KSHETRA"),
    ],
)
def test_dignity(graha, rasi, deg, expected):
    assert dignity(graha, lon(rasi, deg)) == expected


def test_portion_boundaries_are_half_open():
    assert dignity(G.SURYA, lon(Rasi.SIMHA, 19, 59, 59.6)) == "MOOLATRIKONA"  # displayed 19°59′59″
    assert dignity(G.SURYA, lon(Rasi.SIMHA, 20)) == "SWAKSHETRA"
    assert dignity(G.CHANDRA, lon(Rasi.VRISHABHA, 2, 59, 59)) == "UCCHA"
    assert dignity(G.CHANDRA, lon(Rasi.VRISHABHA, 3)) == "MOOLATRIKONA"
    assert dignity(G.SURYA, lon(Rasi.MESHA, 0)) == "UCCHA"
    assert dignity(G.SURYA, lon(Rasi.MESHA, 0) - 1 / 3600) == "MITRA_KSHETRA"  # 29°59′59″ Meena: Jupiter is a friend


def test_kshetra_relationship():
    assert kshetra(G.MANGALA, G.CHANDRA) == "MITRA_KSHETRA"
    assert kshetra(G.SURYA, G.SHANI) == "SHATRU_KSHETRA"
    assert kshetra(G.SHANI, G.SHANI) is None
    with pytest.raises(ValueError):
        kshetra(G.SURYA, G.RAHU)  # never a sign lord (D2), so the table has no such cell


def test_combustion_uses_distance_not_sign():
    # D3: Mercury at 29° Leo with the Sun at 2° Virgo is combust though in another sign.
    combust, distance = combustion(G.BUDHA, lon(Rasi.SIMHA, 29), False, lon(Rasi.KANYA, 2))
    assert combust and distance == pytest.approx(3)


@pytest.mark.parametrize(
    "graha, distance, retro, expected",
    [
        (G.CHANDRA, 12.0, False, True),
        (G.CHANDRA, 12.01, False, False),
        (G.MANGALA, 17.0, False, True),
        (G.BUDHA, 14.0, False, True),
        (G.BUDHA, 13.0, True, False),  # retrograde orb 12°
        (G.BUDHA, 12.0, True, True),
        (G.GURU, 11.0, False, True),
        (G.SHUKRA, 10.0, False, True),
        (G.SHUKRA, 9.0, True, False),  # retrograde orb 8°
        (G.SHUKRA, 8.0, True, True),
        (G.SHANI, 15.0, False, True),
        (G.SHANI, 15.5, False, False),
    ],
)
def test_combustion_orbs(graha, distance, retro, expected):
    sun = 100.0
    assert combustion(graha, sun + distance, retro, sun)[0] is expected
    assert combustion(graha, sun - distance, retro, sun)[0] is expected


@pytest.mark.parametrize("graha", [G.SURYA, G.RAHU, G.KETU])
def test_sun_and_nodes_are_never_combust(graha):
    assert combustion(graha, 100.0, True, 100.0) == (False, None)
