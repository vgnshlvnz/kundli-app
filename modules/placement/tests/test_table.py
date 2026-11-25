"""The placement table: lordship worked examples from the reference files, and a full chart."""

import re
from datetime import UTC, datetime
from pathlib import Path

import pytest

from kundli_core import AyanamsaValue, BirthMoment, BodyPosition, ChartPositions, GeoPoint, Graha, Nakshatra, Rasi, rasi_info
from kundli_core.mdtables import read_table
from kundli_placement import build_table, lordships

REPO = Path(__file__).resolve().parents[3]
H1 = REPO / "docs/reference/houses_bhavas_day1_llm_ready.md"
NAMES = {"Sun": Graha.SURYA, "Moon": Graha.CHANDRA, "Mars": Graha.MANGALA, "Mercury": Graha.BUDHA,
         "Jupiter": Graha.GURU, "Venus": Graha.SHUKRA, "Saturn": Graha.SHANI, "Rahu": Graha.RAHU, "Ketu": Graha.KETU}
SIGNS = {rasi_info(r).english: r for r in Rasi}


def chart(lagna: float, signs: dict[Graha, Rasi], degree: float = 15.0, retro=()) -> ChartPositions:
    moment = BirthMoment(datetime(2000, 1, 1), "UTC", datetime(2000, 1, 1, tzinfo=UTC))
    grahas = {g: BodyPosition((r - 1) * 30 + degree, -0.1 if g in retro else 1.0, g in retro) for g, r in signs.items()}
    return ChartPositions(moment, GeoPoint(0, 0), 2451544.5, AyanamsaValue("lahiri", "Lahiri", 23.85), lagna, grahas)


def numbers(text: str) -> list[int]:
    return [int(n) for n in re.findall(r"(\d+)(?:st|nd|rd|th)", text)]


def worked_example(section: str):
    """Build the chart described in the section's 'Chart:' line, e.g. 'Saturn in the 1st (Sagittarius); ...'."""
    from kundli_core.mdtables import section_text

    line = next(l for l in section_text(H1, section).splitlines() if l.startswith("Chart:"))
    signs = {}
    for names, sign in re.findall(r"((?:\w+(?:,| and)? ?)+?) in the \d+(?:st|nd|rd|th) \((\w+)\)", line):
        for name in re.split(r",\s*|\s+and\s+", names.strip()):
            signs[NAMES[name]] = SIGNS[sign]
    assert set(signs) == set(Graha), signs
    lagna_sign = SIGNS[re.search(r"in the 1st \((\w+)\)", line).group(1)]
    return chart((lagna_sign - 1) * 30 + 15, signs)


@pytest.mark.parametrize(
    "section, lords_index, placed_index",
    [("8.1 Worked example — Sagittarius Ascendant", 2, 1), ("8.2 Exercise with answers — Virgo Ascendant", 1, 0)],
)
def test_lordship_worked_examples(section, lords_index, placed_index):
    """houses_bhavas_day1 §8.1 and §8.2: which bhavas each graha rules, and the bhava each house lord is placed in."""
    c = worked_example(section)
    table = build_table(c)
    for row in read_table(H1, section, lords_index):
        assert table.row(NAMES[row["Planet"]]).lord_of == tuple(numbers(row["Lord of"])), row
    for row in read_table(H1, section, placed_index):
        house = numbers(row["House"])[0]
        lord = NAMES[row["Lord"]]
        assert house in table.row(lord).lord_of
        assert table.row(lord).bhava_whole_sign == numbers(row["Lord is placed in"])[0], row


def test_nodes_rule_no_bhava_and_seven_lords_rule_all_twelve():
    lords = lordships(100.0)
    assert lords[Graha.RAHU] == () and lords[Graha.KETU] == ()
    assert sorted(b for v in lords.values() for b in v) == list(range(1, 13))


def test_dispositor_example():
    """houses_bhavas_course_notes §9: Venus in Aries has Mars as its dispositor (Libra Ascendant, 7th house)."""
    signs = dict.fromkeys(Graha, Rasi.MAKARA) | {Graha.SHUKRA: Rasi.MESHA, Graha.MANGALA: Rasi.SIMHA}
    t = build_table(chart((Rasi.TULA - 1) * 30 + 15, signs))
    venus = t.row(Graha.SHUKRA)
    assert venus.dispositor == Graha.MANGALA and venus.bhava_whole_sign == 7
    assert venus.dispositor_bhava_whole_sign == 11  # Mars in Leo, the 11th from Libra
    saturn = t.row(Graha.SHANI)
    assert saturn.dispositor == Graha.SHANI and saturn.kshetra is None  # own sign: its own dispositor (C8)


def kuala_lumpur():
    """Kuala Lumpur, 1992-03-11 06:14 (UTC+08:00), Lahiri, from the ephemeris module."""
    moment = BirthMoment(datetime(1992, 3, 11, 6, 14), "Asia/Kuala_Lumpur", datetime(1992, 3, 10, 22, 14, tzinfo=UTC))
    pos = {
        Graha.SURYA: (326.847, 1.0, False), Graha.CHANDRA: (41.933, 13.1, False), Graha.MANGALA: (292.964, 0.77, False),
        Graha.BUDHA: (344.945, 1.2, False), Graha.GURU: (134.517, -0.09, True), Graha.SHUKRA: (302.455, 1.25, False),
        Graha.SHANI: (290.176, 0.11, False), Graha.RAHU: (252.351, -0.05, True), Graha.KETU: (72.351, -0.05, True),
    }
    grahas = {g: BodyPosition(*v) for g, v in pos.items()}
    return ChartPositions(moment, GeoPoint(3.139, 101.687), 2448692.426, AyanamsaValue("lahiri", "Lahiri", 23.75), 307.631, grahas)


def test_full_chart():
    t = build_table(kuala_lumpur())
    assert [r.graha for r in t.rows] == list(Graha)
    lg = t.lagna
    assert (lg.rasi, lg.in_rasi.format(seconds=False), lg.lord) == (Rasi.KUMBHA, "7°37′", Graha.SHANI)
    assert (lg.nakshatra, lg.pada) == (Nakshatra.SHATABHISHA, 1)
    assert (lg.lord_bhava_whole_sign, lg.lord_bhava_chalit) == (12, 12)
    expected = {  # graha: (rasi, dignity, ws, chalit, lord_of)
        Graha.SURYA: (Rasi.KUMBHA, "SHATRU_KSHETRA", 1, 2, (7,)),
        Graha.CHANDRA: (Rasi.VRISHABHA, "MOOLATRIKONA", 4, 4, (6,)),
        Graha.MANGALA: (Rasi.MAKARA, "UCCHA", 12, 1, (3, 10)),  # chalit 1 starts at Makara 22°37′
        Graha.BUDHA: (Rasi.MEENA, "NEECHA", 2, 2, (5, 8)),
        Graha.GURU: (Rasi.SIMHA, "MITRA_KSHETRA", 7, 7, (2, 11)),
        Graha.SHUKRA: (Rasi.KUMBHA, "MITRA_KSHETRA", 1, 1, (4, 9)),
        Graha.SHANI: (Rasi.MAKARA, "SWAKSHETRA", 12, 12, (1, 12)),
        Graha.RAHU: (Rasi.DHANUS, "MITRA_KSHETRA", 11, 11, ()),
        Graha.KETU: (Rasi.MITHUNA, "SAMA_KSHETRA", 5, 5, ()),
    }
    for graha, (rasi, dig, ws, ch, lords) in expected.items():
        r = t.row(graha)
        assert (r.rasi, r.dignity, r.bhava_whole_sign, r.bhava_chalit, r.lord_of) == (rasi, dig, ws, ch, lords), graha
        assert r.bhava_differs is (ws != ch)
    sun = t.row(Graha.SURYA)
    assert sun.categories_whole_sign == ("KENDRA", "TRIKONA") and sun.categories_chalit == ("PANAPARA", "MARAKA")
    assert sun.dispositor == Graha.SHANI and sun.dispositor_bhava_whole_sign == 12
    assert sun.sun_distance is None and not sun.combust
    assert t.row(Graha.BUDHA).sun_distance == pytest.approx(18.098) and not t.row(Graha.BUDHA).combust
    assert t.row(Graha.GURU).retrograde and t.row(Graha.RAHU).retrograde
    assert t.row(Graha.BUDHA).kshetra == "SAMA_KSHETRA"  # neecha in Pisces; Jupiter is neutral to Mercury
