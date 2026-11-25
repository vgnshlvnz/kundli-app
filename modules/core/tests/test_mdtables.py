import pytest

from kundli_core.mdtables import SectionNotFound, read_table, read_tables, section_text

DOC = """# Title

## 1. First

Intro.

| A | B |
|---|---|
| 1 | x |
| 2 | y |

Between.

| C |
|---|
| z |

### 1.1 Sub

| D | E |
|:--|--:|
| d | e |

## 2. Second

| A | B |
|---|---|
| 9 | q |
"""


@pytest.fixture
def doc(tmp_path):
    p = tmp_path / "doc.md"
    p.write_text(DOC, encoding="utf-8")
    return p


def test_tables_in_a_section_include_subsections_and_stop_at_the_next_peer(doc):
    tables = read_tables(doc, "1. First")
    assert tables == [
        [{"A": "1", "B": "x"}, {"A": "2", "B": "y"}],
        [{"C": "z"}],
        [{"D": "d", "E": "e"}],
    ]
    assert read_table(doc, "2. Second") == [{"A": "9", "B": "q"}]
    assert read_table(doc, "1.1 Sub") == [{"D": "d", "E": "e"}]


def test_section_text(doc):
    text = section_text(doc, "1. First")
    assert "Between." in text and "Second" not in text


def test_missing_section_or_table(doc):
    with pytest.raises(SectionNotFound):
        read_table(doc, "3. Third")
    with pytest.raises(SectionNotFound):
        read_table(doc, "2. Second", index=1)


def test_ragged_row_is_an_error(tmp_path):
    p = tmp_path / "bad.md"
    p.write_text("## S\n\n| A | B |\n|---|---|\n| 1 |\n", encoding="utf-8")
    with pytest.raises(ValueError):
        read_table(p, "S")
