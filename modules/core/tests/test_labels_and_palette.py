"""Labels exist in all three languages and scripts; every declared text colour pair meets its contrast minimum."""

import re

import pytest

from kundli_core import LANGUAGES, Graha, Nakshatra, Rasi, contrast_ratio, graha_info, label, labels, load_table, palette

# Letters of each script plus the punctuation the labels use.
SCRIPT = {
    "ta": re.compile(r"[஀-௿ ()'’.,-]+"),
    "sa": re.compile(r"[ऀ-ॿ ()'’.,-]+"),
    "en": re.compile(r"[A-Za-z ()'’.,-]+"),
}


def test_every_label_has_all_languages_in_the_right_script():
    for group, entries in load_table("labels").items():
        for code, texts in entries.items():
            assert set(texts) == set(LANGUAGES), f"{group}.{code}"
            for lang in LANGUAGES:
                assert texts[lang].strip() == texts[lang] and texts[lang], f"{group}.{code}.{lang}"
                assert SCRIPT[lang].fullmatch(texts[lang]), f"{group}.{code}.{lang} = {texts[lang]!r}"


@pytest.mark.parametrize("group, codes", [("rasi", Rasi), ("graha", Graha), ("graha_short", Graha), ("nakshatra", Nakshatra)])
def test_every_enum_member_has_a_label(group, codes):
    for lang in LANGUAGES:
        for c in codes:
            assert label(f"{group}.{c.name}", lang)


def test_english_labels_follow_the_reference_names():
    for g in Graha:
        assert label(f"graha.{g.name}", "en") == graha_info(g).english
        assert label(f"graha_short.{g.name}", "en") == graha_info(g).abbrev
    assert label("ui.RETROGRADE_MARK", "en") == "R"


def test_unknown_language():
    with pytest.raises(KeyError):
        labels("fr")


def test_contrast_formula():
    assert contrast_ratio("#000000", "#FFFFFF") == pytest.approx(21.0)
    assert contrast_ratio("#777777", "#777777") == pytest.approx(1.0)


def test_every_text_pair_meets_its_minimum():
    p = palette()
    for pair in p.text_pairs:
        ratio = contrast_ratio(p.hex(pair.fg), p.hex(pair.bg))
        assert ratio >= pair.min_ratio, f"{pair.fg} on {pair.bg} ({pair.use}): {ratio:.2f} < {pair.min_ratio}"


def test_palette_is_well_formed():
    p = palette()
    for name, value in p.colours.items():
        assert re.fullmatch(r"#[0-9A-F]{6}", value), name
    for pair in p.text_pairs:
        assert pair.fg in p.colours and pair.bg in p.colours
        assert pair.min_ratio >= 3.0
        assert pair.fg not in p.decorative and pair.bg not in p.decorative, f"decorative colour carries text: {pair}"
    assert set(p.decorative) <= set(p.colours)
