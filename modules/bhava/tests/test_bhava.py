"""Whole-sign and chalit bhavas, the reference file's worked example, and sandhi boundaries (D1, C5, C6)."""

import re
from datetime import UTC, datetime
from pathlib import Path

import pytest

from kundli_bhava import METHODS, assign, chalit, chalit_madhyas, chalit_sandhis, placement, whole_sign
from kundli_core import AyanamsaValue, BirthMoment, BodyPosition, ChartPositions, GeoPoint, Graha
from kundli_core.mdtables import read_table, section_text

REPO = Path(__file__).resolve().parents[3]


def dms(d, m=0, s=0):
    return d + m / 60 + s / 3600


@pytest.mark.parametrize("method", ["whole_sign", "chalit"])
def test_method_definitions_still_match_their_sources(method):
    spec = METHODS[method]
    text = section_text(REPO / spec["source_file"], spec["source_section"])
    for phrase in spec["src_text"]:
        assert phrase in text, phrase


def test_worked_example_in_horoscope_signs_houses():
    """§3.3: Lagna 5° Aries; Sun 28° (rasi bhava 1, chalit 2); Moon 355° (rasi 12, chalit 1)."""
    rows = read_table(REPO / "docs/reference/horoscope_signs_houses_llm_ready.md", "3.3 Bhava Chalit chart")
    lagna = float(rows[0]["Longitude"].rstrip("°"))
    assert rows[0]["Point"] == "Lagna"
    for row in rows:
        lon = float(row["Longitude"].rstrip("°"))
        assert whole_sign(lagna, lon) == int(row["House in Rasi chart"]), row
        assert chalit(lagna, lon) == int(row["House in Bhava chart"]), row
    text = section_text(REPO / "docs/reference/horoscope_signs_houses_llm_ready.md", "3.3 Bhava Chalit chart")
    lo, hi = map(int, re.search(r"1st bhava spans (\d+)° to (\d+)°", text).groups())
    assert chalit_sandhis(lagna)[0] == lo and chalit_sandhis(lagna)[1] == hi


def test_sandhi_belongs_to_the_later_bhava():
    lagna = 5.0  # bhava 1 = [350°, 20°)
    assert chalit(lagna, 20.0) == 2
    assert chalit(lagna, dms(19, 59, 59)) == 1
    assert chalit(lagna, 350.0) == 1
    assert chalit(lagna, dms(349, 59, 59)) == 12
    for k, s in enumerate(chalit_sandhis(lagna)):
        assert chalit(lagna, s) == k + 1


def test_madhyas_and_sandhis():
    lagna = dms(123, 45, 6)
    m, s = chalit_madhyas(lagna), chalit_sandhis(lagna)
    assert m[0] == pytest.approx(lagna) and m[6] == pytest.approx(lagna + 180)
    for k in range(12):
        assert (m[k] - s[k]) % 360 == pytest.approx(15)
        assert chalit(lagna, m[k]) == k + 1


def test_lagna_at_mid_sign_makes_chalit_equal_whole_sign():
    """§3.3: with the Lagna at the middle of its sign the two charts are identical."""
    for lagna in (15.0, 165.0, 345.0):
        for k in range(3600):
            lon = k * 0.1
            assert chalit(lagna, lon) == whole_sign(lagna, lon), (lagna, lon)


def test_lagna_near_a_sign_edge_shifts_half_the_zodiac():
    lagna = dms(29, 59)  # end of Mesha: chalit bhava 1 is 14°59′ Mesha to 14°59′ Vrishabha
    p = placement(lagna, dms(40, 0))  # 10° Vrishabha
    assert (p.whole_sign, p.chalit, p.differs) == (2, 1, True)
    early = placement(dms(0, 1), dms(350, 0))  # Lagna 0°01′ Mesha, point 20° Meena
    assert (early.whole_sign, early.chalit) == (12, 1)


def test_chalit_is_never_more_than_one_bhava_from_whole_sign():
    for lagna in (0.0, 7.3, 14.99, 15.01, 22.0, 29.999):
        for k in range(720):
            p = placement(lagna, k * 0.5)
            assert (p.chalit - p.whole_sign) % 12 in (0, 1, 11)


def test_assign_covers_all_grahas():
    moment = BirthMoment(datetime(2000, 1, 1), "UTC", datetime(2000, 1, 1, tzinfo=UTC))
    longitudes = [28.0, 355.0, 100.0, 200.0, 5.0, 19.0, 21.0, 300.0, 120.0]
    grahas = {g: BodyPosition(lon, 1.0, False) for g, lon in zip(Graha, longitudes)}
    chart = ChartPositions(moment, GeoPoint(0, 0), 2451544.5, AyanamsaValue("lahiri", "Lahiri", 23.85), 5.0, grahas)
    result = assign(chart)
    assert set(result) == set(Graha)
    assert result[Graha.SURYA].whole_sign == 1 and result[Graha.SURYA].chalit == 2 and result[Graha.SURYA].differs
    assert result[Graha.CHANDRA].whole_sign == 12 and result[Graha.CHANDRA].chalit == 1
    assert not result[Graha.GURU].differs
