"""South Indian SVG chart: layout against the source, placement of Lagna and grahas, centre panel, contrast."""

import os
import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path

import pytest

from kundli_chart import CELL_OF, GRID, ChartInfo, render_south_indian
from kundli_chart.render import CELL, GRID_ORIGIN
from kundli_core import (
    AyanamsaValue,
    BirthMoment,
    BodyPosition,
    ChartPositions,
    GeoPoint,
    Graha,
    Rasi,
    contrast_ratio,
    label,
    palette,
    rasi_info,
)
from kundli_core.mdtables import section_text

REPO = Path(__file__).resolve().parents[3]
GOLDEN = Path(__file__).parent / "golden" / "kuala_lumpur_1992_en.svg"
NS = {"s": "http://www.w3.org/2000/svg"}

# Kuala Lumpur, 1992-03-11 06:14 (UTC+08:00), Lahiri: values from the ephemeris module, fixed here.
KL_LONGITUDES = {
    Graha.SURYA: (326.847, 0.99, False), Graha.CHANDRA: (41.933, 13.1, False), Graha.MANGALA: (292.964, 0.77, False),
    Graha.BUDHA: (344.945, 1.2, False), Graha.GURU: (134.517, -0.09, True), Graha.SHUKRA: (302.455, 1.25, False),
    Graha.SHANI: (290.176, 0.11, False), Graha.RAHU: (252.351, -0.05, True), Graha.KETU: (72.351, -0.05, True),
}


def kl_chart(lagna=307.631):
    moment = BirthMoment(datetime(1992, 3, 11, 6, 14), "Asia/Kuala_Lumpur", datetime(1992, 3, 10, 22, 14, tzinfo=UTC))
    grahas = {g: BodyPosition(lon, speed, retro) for g, (lon, speed, retro) in KL_LONGITUDES.items()}
    return ChartPositions(moment, GeoPoint(3.139, 101.687), 2448692.426, AyanamsaValue("lahiri", "Lahiri", 23.7529), lagna, grahas)


def parse(svg: str) -> ET.Element:
    return ET.fromstring(svg)


def group(root, rasi: Rasi) -> ET.Element:
    return root.find(f".//s:g[@id='rasi-{rasi.name}']", NS)


def test_layout_matches_the_source_table():
    """horoscope_signs_houses §1.3: fixed sign positions, Meena top-left, clockwise, centre empty."""
    text = section_text(REPO / "docs/reference/horoscope_signs_houses_llm_ready.md", "1.3 Chart formats")
    block = text[text.index("South Indian chart layout"):]
    rows = [[c.strip() for c in line.strip().strip("|").split("|")] for line in block.splitlines() if line.startswith("|")]
    rows = [r for r in rows if any(r) and not all(set(c) <= set("-: ") for c in r)]
    assert len(rows) == 4
    ours = [[rasi_info(Rasi[name]).english if name else "" for name in row] for row in GRID]
    assert ours == rows


def test_layout_runs_clockwise_from_meena():
    ring = [(0, 0), (0, 1), (0, 2), (0, 3), (1, 3), (2, 3), (3, 3), (3, 2), (3, 1), (3, 0), (2, 0), (1, 0)]
    assert [CELL_OF[Rasi(((11 + k) % 12) + 1)] for k in range(12)] == ring


def test_every_sign_box_is_in_its_cell():
    root = parse(render_south_indian(kl_chart(), ChartInfo("A", "B")))
    for rasi in Rasi:
        g = group(root, rasi)
        r, c = CELL_OF[rasi]
        assert (g.get("data-row"), g.get("data-col")) == (str(r), str(c))
        rect = g.find("s:rect", NS)
        assert (float(rect.get("x")), float(rect.get("y"))) == (GRID_ORIGIN + c * CELL, GRID_ORIGIN + r * CELL)


def test_lagna_box_is_marked_and_shows_the_degree():
    root = parse(render_south_indian(kl_chart(), ChartInfo("A", "B")))
    lagna_boxes = [r for r in Rasi if group(root, r).get("data-lagna") == "true"]
    assert lagna_boxes == [Rasi.KUMBHA]
    assert len(root.findall(".//s:line[@class='lagna-mark']", NS)) == 1
    assert group(root, Rasi.KUMBHA).find("s:line[@class='lagna-mark']", NS) is not None
    lagna_text = group(root, Rasi.KUMBHA).find("s:text[@data-graha='LAGNA']", NS)
    assert "".join(lagna_text.itertext()) == "La 7°37′"


def test_grahas_are_in_their_signs_with_truncated_degrees_and_retrograde_marks():
    root = parse(render_south_indian(kl_chart(), ChartInfo("A", "B")))
    expected = {
        Graha.SURYA: (Rasi.KUMBHA, "SU 26°50′"), Graha.CHANDRA: (Rasi.VRISHABHA, "MO 11°55′"),
        Graha.MANGALA: (Rasi.MAKARA, "MA 22°57′"), Graha.BUDHA: (Rasi.MEENA, "ME 14°56′"),
        Graha.GURU: (Rasi.SIMHA, "JU 14°31′R"), Graha.SHUKRA: (Rasi.KUMBHA, "VE 2°27′"),
        Graha.SHANI: (Rasi.MAKARA, "SA 20°10′"), Graha.RAHU: (Rasi.DHANUS, "RA 12°21′R"),
        Graha.KETU: (Rasi.MITHUNA, "KE 12°21′R"),
    }
    for graha, (rasi, text) in expected.items():
        el = group(root, rasi).find(f"s:text[@data-graha='{graha.name}']", NS)
        assert el is not None, graha
        assert "".join(el.itertext()) == text
        assert (el.find("s:tspan", NS) is not None) == KL_LONGITUDES[graha][2]
    # entries are in longitude order within a box: Venus 2°, Lagna 7°, Sun 26° in Kumbha
    order = [t.get("data-graha") for t in group(root, Rasi.KUMBHA).findall("s:text[@data-graha]", NS)]
    assert order == ["SHUKRA", "LAGNA", "SURYA"]


def test_sign_edges_display_29_59_and_0_00():
    chart = kl_chart()
    grahas = dict(chart.grahas)
    grahas[Graha.SURYA] = BodyPosition(330 - 0.4 / 3600, 1.0, False)  # 29°59′59.6″ Kumbha
    grahas[Graha.CHANDRA] = BodyPosition(330.0, 13.0, False)  # 0°00′00″ Meena
    edge = ChartPositions(chart.moment, chart.geo, chart.jd_ut, chart.ayanamsa, chart.lagna, grahas)
    root = parse(render_south_indian(edge, ChartInfo("A", "B")))
    assert "".join(group(root, Rasi.KUMBHA).find("s:text[@data-graha='SURYA']", NS).itertext()) == "SU 29°59′"
    assert "".join(group(root, Rasi.MEENA).find("s:text[@data-graha='CHANDRA']", NS).itertext()) == "MO 0°00′"


def test_centre_panel():
    svg = render_south_indian(kl_chart(), ChartInfo("Test Native", "Kuala Lumpur, Malaysia"))
    centre = parse(svg).find(".//s:g[@id='centre']", NS)
    texts = {t.get("data-role"): "".join(t.itertext()) for t in centre.findall("s:text", NS)}
    assert texts == {
        "title": "Rasi",
        "name": "Test Native",
        "date": "Date: 11-03-1992",
        "time": "Time: 06:14:00 (UTC+08:00)",
        "place": "Place: Kuala Lumpur, Malaysia",
        "ayanamsa": "Ayanamsa: Lahiri 23°45′10″",
    }


def test_labels_follow_the_language():
    root = parse(render_south_indian(kl_chart(), ChartInfo("A", "B"), "ta"))
    assert root.get("lang") == "ta"
    meena_label = [t for t in group(root, Rasi.MEENA).findall("s:text", NS) if not t.get("data-graha")][0]
    assert meena_label.text == label("rasi.MEENA", "ta")
    ketu = group(root, Rasi.MITHUNA).find("s:text[@data-graha='KETU']", NS)
    assert "".join(ketu.itertext()) == f"{label('graha_short.KETU', 'ta')} 12°21′{label('ui.RETROGRADE_MARK', 'ta')}"
    with pytest.raises(KeyError):
        render_south_indian(kl_chart(), ChartInfo("A", "B"), "fr")


def test_crowded_box_uses_two_columns_inside_the_box():
    chart = kl_chart(lagna=269.5)
    grahas = {g: BodyPosition(241.0 + 3 * i, 1.0, i % 2 == 0) for i, g in enumerate(Graha)}
    crowded = ChartPositions(chart.moment, chart.geo, chart.jd_ut, chart.ayanamsa, chart.lagna, grahas)
    for lang in ("en", "ta", "sa"):
        g = group(parse(render_south_indian(crowded, ChartInfo("A", "B"), lang)), Rasi.DHANUS)
        texts = g.findall("s:text[@data-graha]", NS)
        assert len(texts) == 10
        x0, y0 = GRID_ORIGIN, GRID_ORIGIN + 3 * CELL
        xs = sorted({float(t.get("x")) for t in texts})
        assert len(xs) == 2 and xs[1] - xs[0] >= 75
        for t in texts:
            assert x0 < float(t.get("x")) < x0 + CELL / 2 + 10
            assert y0 + 30 < float(t.get("y")) < y0 + CELL - 10


def test_every_text_uses_a_declared_colour_pair():
    p = palette()
    pairs = {(t.fg, t.bg): t.min_ratio for t in p.text_pairs}
    for lang in ("en", "ta", "sa"):
        root = parse(render_south_indian(kl_chart(), ChartInfo("Test Native", "Kuala Lumpur, Malaysia"), lang))
        for el in root.iter():
            tag = el.tag.split("}")[1]
            if tag not in ("text", "tspan"):
                continue
            fg = el.get("data-fg")
            bg = el.get("data-bg") or next(e for e in root.iter() if el in list(e)).get("data-bg")
            assert (fg, bg) in pairs, (tag, fg, bg, "".join(el.itertext()))
            assert el.get("fill") == p.hex(fg)
            assert contrast_ratio(p.hex(fg), p.hex(bg)) >= pairs[(fg, bg)]
            if pairs[(fg, bg)] < 4.5:  # a large-text-only pair
                assert float(el.get("font-size")) >= 24, "".join(el.itertext())


def test_only_palette_colours_and_no_external_references():
    svg = render_south_indian(kl_chart(), ChartInfo("A", "B"))
    colours = set(re.findall(r'(?:fill|stroke)="(#[0-9A-Fa-f]{6})"', svg))
    assert colours <= set(palette().colours.values())
    assert "href" not in svg and "url(" not in svg and "http://" not in svg.replace("http://www.w3.org/2000/svg", "")


def test_names_are_escaped_and_long_text_is_shortened():
    svg = render_south_indian(kl_chart(), ChartInfo("<Ravi & Co> " + "x" * 60, "Somewhere"))
    root = parse(svg)  # valid XML despite < and &
    name = root.find(".//s:text[@data-role='name']", NS)
    assert name.text.startswith("<Ravi & Co>") and name.text.endswith("…") and len(name.text) == 30
    assert root.find("s:title", NS).text.startswith("Rasi — <Ravi & Co>")


def test_output_is_deterministic_and_matches_the_golden_file():
    svg = render_south_indian(kl_chart(), ChartInfo("Test Native", "Kuala Lumpur, Malaysia"))
    assert svg == render_south_indian(kl_chart(), ChartInfo("Test Native", "Kuala Lumpur, Malaysia"))
    if os.environ.get("UPDATE_GOLDEN"):
        GOLDEN.write_text(svg, encoding="utf-8")
    assert svg == GOLDEN.read_text(encoding="utf-8"), "chart changed; inspect it, then rerun with UPDATE_GOLDEN=1"
