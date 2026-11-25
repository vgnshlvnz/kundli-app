"""Every rule table still matches its reference section, and its parsed values agree with its source cells."""

import re
from pathlib import Path

import pytest

from kundli_core import SEVEN_GRAHAS, Graha, Rasi, graha_info, rasi_info, sign_lord
from kundli_core.mdtables import read_table
from kundli_core.refcheck import verify
from kundli_placement import RULE_TABLES, categories, load_rule_table, rules

REPO = Path(__file__).resolve().parents[3]
P2 = REPO / "docs/reference/planets_day2_strengths_llm_ready.md"


def eng(g: str) -> str:
    return graha_info(Graha(g)).english


def sign(name: str) -> str:
    return rasi_info(Rasi[name]).english


def deg(text: str) -> int:
    return int(re.fullmatch(r"(\d+)°", text).group(1))


@pytest.mark.parametrize("name", RULE_TABLES)
def test_rule_table_matches_its_source(name):
    assert verify(dict(load_rule_table(name)), REPO, name) == []


@pytest.mark.parametrize("name", RULE_TABLES)
def test_rule_table_records_its_conventions(name):
    meta = load_rule_table(name)["meta"]
    assert meta["source_file"].startswith("docs/reference/") and meta["source_section"]
    assert meta["conventions"], "each rule table names the CONVENTIONS entries it applies"
    conventions = (REPO / "docs/CONVENTIONS.md").read_text(encoding="utf-8")
    for c in meta["conventions"]:
        assert f"| {c} |" in conventions, c


def test_uccha_neecha_values_agree_with_source_cells():
    for r in load_rule_table("uccha_neecha")["graha"]:
        s = r["src"]
        assert eng(r["id"]) == s["Planet"]
        assert (sign(r["uccha_rasi"]), r["uccha_deg"]) == (s["Exaltation sign"], deg(s["Deep exaltation degree"]))
        assert (sign(r["neecha_rasi"]), r["neecha_deg"]) == (s["Debilitation sign"], deg(s["Deep debilitation degree"]))
        assert (Rasi[r["neecha_rasi"]] - Rasi[r["uccha_rasi"]]) % 12 == 6


def test_moolatrikona_values_agree_with_source_cells_and_with_the_portions():
    portions = rules().portions
    assert {Graha(r["id"]) for r in load_rule_table("moolatrikona")["graha"]} == set(SEVEN_GRAHAS)
    for r in load_rule_table("moolatrikona")["graha"]:
        s = r["src"]
        assert (eng(r["id"]), sign(r["rasi"])) == (s["Planet"], s["Moolatrikona sign"])
        assert s["Moolatrikona degrees"] == f"{r['from_deg']}°–{r['to_deg']}°"
        mt = [seg for seg in portions[(Graha(r["id"]), Rasi[r["rasi"]])] if seg.dignity == "MOOLATRIKONA"]
        assert [(seg.from_deg, seg.to_deg) for seg in mt] == [(r["from_deg"], r["to_deg"])], "§3 and §4.1 disagree"


def test_own_signs_agree_with_source_cells_and_sign_lords():
    for r in load_rule_table("own_signs")["graha"]:
        s = r["src"]
        assert eng(r["id"]) == s["Planet"]
        assert [sign(x) for x in r["own"]] == [c for c in (s["Positive sign"], s["Negative sign"]) if c != "—"]
        g = Graha(r["id"])
        if g in SEVEN_GRAHAS:
            assert {Rasi[x] for x in r["own"]} == {x for x in Rasi if sign_lord(x) == g}
        else:  # Rahu and Ketu own their co-lord signs (rasis_signs §2)
            assert {Rasi[x] for x in r["own"]} == {x for x in Rasi if rasi_info(x).co_lord == g}


def test_sign_portions_agree_with_source_cells():
    for r in load_rule_table("sign_portions")["graha"]:
        s = r["src"]
        assert (eng(r["id"]), sign(r["rasi"])) == (s["Planet"], s["Sign"])
        cells = {seg["dignity"]: seg for seg in r["segments"]}
        for col, code in (("Exalted", "UCCHA"), ("Moolatrikona", "MOOLATRIKONA"), ("Swakshetra", "SWAKSHETRA")):
            if s[col] == "—":
                assert code not in cells
            elif s[col] == "remainder":  # CONVENTIONS C2
                assert cells[code]["to_deg"] == 30
            else:
                assert s[col] == f"{cells[code]['from_deg']}°–{cells[code]['to_deg']}°"


def test_friendship_rows_agree_with_source_cells_and_cover_the_seven_lords():
    for r in load_rule_table("naisargika_maitri")["graha"]:
        s = r["src"]
        for key, col in (("friends", "Friends (Mitra)"), ("enemies", "Enemies (Shatru)"), ("neutrals", "Neutrals (Sama)")):
            assert (", ".join(eng(g) for g in r[key]) or "—") == s[col]
        listed = r["friends"] + r["enemies"] + r["neutrals"]
        assert len(listed) == len(set(listed))
        assert {Graha(g) for g in listed if Graha(g) in SEVEN_GRAHAS} == set(SEVEN_GRAHAS) - {Graha(r["id"])}


def test_friendship_table_follows_the_classical_rule():
    """C14: lords of the 2,4,5,8,9,12th from the moolatrikona sign, or of the exaltation sign, are friends;
    lords of the 3,6,7,10,11th are enemies; a graha that is both is neutral."""
    r = rules()
    for p in SEVEN_GRAHAS:
        base = r.moolatrikona[p][0]
        for q in SEVEN_GRAHAS:
            if q == p:
                continue
            friend = enemy = False
            for s in (x for x in Rasi if sign_lord(x) == q):
                n = (s - base) % 12 + 1
                friend |= n in (2, 4, 5, 8, 9, 12)
                enemy |= n in (3, 6, 7, 10, 11)
            friend |= sign_lord(r.uccha[p][0]) == q
            expected = "neutral" if friend and enemy else "friend" if friend else "enemy"
            actual = "friend" if q in r.friends[p] else "enemy" if q in r.enemies[p] else "neutral"
            assert actual == expected, (p, q)


def test_combustion_values_agree_with_source_cells():
    for r in load_rule_table("combustion")["graha"]:
        s = r["src"]
        assert eng(r["id"]) == s["Planet"]
        assert r["orb_deg"] == deg(s["Combust within (degrees from the Sun)"])
        assert r.get("retrograde_orb_deg") == (None if s["When retrograde"] == "—" else deg(s["When retrograde"]))
    assert set(rules().combust_orb) == set(SEVEN_GRAHAS) - {Graha.SURYA}


def test_categories_agree_with_source_cells_and_the_summary_by_house():
    for c in load_rule_table("bhava_categories")["category"]:
        assert c["id"] == c["src"]["Classification"].upper()
        assert ", ".join(map(str, c["bhavas"])) == c["src"]["Houses"]
    summary = read_table(REPO / "docs/reference/houses_bhavas_day1_llm_ready.md", "7.8 Summary by house")
    for row in summary:
        listed = {row["Kendra / Panapara / Apoklima"].upper()}
        listed |= {x.strip().upper() for x in row["Other classifications"].split(",") if x.strip() != "—"}
        assert set(categories(int(row["House"]))) == listed, row


def test_prompt_categories_are_unchanged_by_the_source():
    expected = {"KENDRA": {1, 4, 7, 10}, "TRIKONA": {1, 5, 9}, "DUSTHANA": {6, 8, 12}, "UPACHAYA": {3, 6, 10, 11}, "MARAKA": {2, 7}}
    got = dict(rules().categories)
    for code, bhavas in expected.items():
        assert got[code] == bhavas


def test_unknown_rule_table():
    with pytest.raises(KeyError):
        load_rule_table("yogas")
