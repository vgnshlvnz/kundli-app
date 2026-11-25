"""Read tables and text from the reference Markdown files.

A section is found by its heading text (without the leading #'s), e.g. ``"2. Names, symbols, spans and lords"``,
and runs until the next heading of the same or a higher level. Cells are returned exactly as written,
only trimmed of surrounding spaces.
"""

from __future__ import annotations

import re
from pathlib import Path

_HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*$")


class SectionNotFound(LookupError):
    pass


def section_lines(path: Path | str, heading: str) -> list[str]:
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    for i, line in enumerate(lines):
        m = _HEADING.match(line)
        if m and m.group(2) == heading:
            level = len(m.group(1))
            out = []
            for nxt in lines[i + 1 :]:
                h = _HEADING.match(nxt)
                if h and len(h.group(1)) <= level:
                    break
                out.append(nxt)
            return out
    raise SectionNotFound(f"{Path(path).name}: no heading {heading!r}")


def section_text(path: Path | str, heading: str) -> str:
    return "\n".join(section_lines(path, heading))


def _cells(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def read_tables(path: Path | str, heading: str) -> list[list[dict[str, str]]]:
    """All tables in the section, each a list of rows keyed by the header cells."""
    tables: list[list[dict[str, str]]] = []
    header: list[str] | None = None
    rows: list[dict[str, str]] = []
    for line in section_lines(path, heading) + [""]:
        if line.lstrip().startswith("|"):
            cells = _cells(line)
            if header is None:
                header = cells
            elif all(re.fullmatch(r":?-+:?", c) for c in cells):
                continue
            else:
                if len(cells) != len(header):
                    raise ValueError(f"{Path(path).name} § {heading}: row has {len(cells)} cells, header {len(header)}")
                rows.append(dict(zip(header, cells)))
        elif header is not None:
            tables.append(rows)
            header, rows = None, []
    return tables


def read_table(path: Path | str, heading: str, index: int = 0) -> list[dict[str, str]]:
    tables = read_tables(path, heading)
    if index >= len(tables):
        raise SectionNotFound(f"{Path(path).name} § {heading}: no table #{index} (found {len(tables)})")
    return tables[index]
