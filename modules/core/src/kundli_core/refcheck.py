"""Check a data table against the reference Markdown section it was taken from.

A data table is a TOML document with a ``[meta]`` table and an array of rows::

    [meta]
    source_file = "docs/reference/rasis_signs_llm_ready.md"
    source_section = "2. Names, symbols, spans and lords"   # heading text, without #'s
    kind = "table"          # "table": rows carry verbatim cells; "text": rows carry phrases from the prose
    table_index = 0         # which table in the section (kind = "table")
    key = ["No."]           # md columns that identify a row
    complete = true         # every md row must be covered by some data row
    rows = "rasi"           # name of the array of rows in this file

    [[rasi]]
    ...parsed values...
    src = { "No." = "1", "Sign (English)" = "Aries", Lord = "Mars" }   # verbatim md cells

A row's ``src`` may be a single table of cells or a list of them (one data row built from several md rows).
For ``kind = "text"``, each row has ``src_text``: phrases that must appear verbatim in the section.
``verify`` returns a list of problems; an empty list means the data still matches its source.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from .mdtables import SectionNotFound, read_table, section_text


def verify(table: dict[str, Any], repo_root: Path, name: str = "table") -> list[str]:
    meta = table.get("meta")
    if not isinstance(meta, dict):
        return [f"{name}: missing [meta]"]
    try:
        md_path = repo_root / meta["source_file"]
        section = meta["source_section"]
        rows = table[meta["rows"]]
    except KeyError as exc:
        return [f"{name}: [meta] or rows missing {exc}"]
    where = f"{name} ({meta['source_file']} § {section})"
    if not md_path.is_file():
        return [f"{where}: source file not found"]
    kind = meta.get("kind", "table")
    try:
        if kind == "text":
            return _verify_text(rows, section_text(md_path, section), where)
        if kind == "table":
            md_rows = read_table(md_path, section, meta.get("table_index", 0))
            return _verify_table(rows, md_rows, list(meta["key"]), bool(meta.get("complete", True)), where)
    except SectionNotFound as exc:
        return [f"{where}: {exc}"]
    return [f"{where}: unknown kind {kind!r}"]


def _verify_text(rows: list[dict], text: str, where: str) -> list[str]:
    errors = []
    for i, row in enumerate(rows):
        phrases = row.get("src_text")
        if not phrases:
            errors.append(f"{where}: row {i + 1} has no src_text")
        for p in phrases or []:
            if p not in text:
                errors.append(f"{where}: row {i + 1}: phrase not found in source: {p!r}")
    return errors


def _verify_table(rows: list[dict], md_rows: list[dict[str, str]], key: list[str], complete: bool, where: str) -> list[str]:
    errors = []
    by_key: dict[tuple[str, ...], dict[str, str]] = {}
    for r in md_rows:
        k = tuple(r.get(c, "") for c in key)
        if k in by_key:
            errors.append(f"{where}: key {k} is not unique in the source table")
        by_key[k] = r
    seen: set[tuple[str, ...]] = set()
    for i, row in enumerate(rows):
        src = row.get("src")
        cells_list = src if isinstance(src, list) else [src]
        if not src:
            errors.append(f"{where}: row {i + 1} has no src")
            continue
        for cells in cells_list:
            k = tuple(cells.get(c, "") for c in key)
            md = by_key.get(k)
            if md is None:
                errors.append(f"{where}: row {i + 1}: no source row with {dict(zip(key, k))}")
                continue
            if k in seen:
                errors.append(f"{where}: source row {dict(zip(key, k))} is used twice")
            seen.add(k)
            for col, val in cells.items():
                if col not in md:
                    errors.append(f"{where}: row {i + 1}: source has no column {col!r}")
                elif md[col] != val:
                    errors.append(f"{where}: row {i + 1} {dict(zip(key, k))}: {col!r} is {md[col]!r} in the source, {val!r} here")
    if complete:
        for k in by_key:
            if k not in seen:
                errors.append(f"{where}: source row {dict(zip(key, k))} is not in the data table")
    return errors
