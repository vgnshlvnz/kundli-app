"""South Indian rasi chart as a self-contained SVG.

Layout: a fixed 4 × 4 grid of signs (layout.toml) inside a kolam border with lotus motifs at the corners. The four
centre boxes form one panel with the name, date, time, place and ayanamsa. The Lagna's box is filled turmeric and
marked with the traditional diagonal stroke and the Lagna degree; grahas are written in their sign boxes with
degree and minute (truncated) and the retrograde mark.

Colours come only from the core palette, and every <text> carries ``data-bg`` naming the palette colour behind it,
so the tests can check each text against the declared contrast pairs. The output depends only on the input: the
same chart always gives the same SVG.
"""

from __future__ import annotations

import math
import tomllib
from dataclasses import dataclass
from datetime import timedelta
from importlib.resources import files
from xml.sax.saxutils import escape, quoteattr

from kundli_core import ChartPositions, Rasi, label, palette, position, to_dms

_LAYOUT = tomllib.loads((files("kundli_chart") / "layout.toml").read_text(encoding="utf-8"))
GRID: tuple[tuple[str, ...], ...] = tuple(tuple(row) for row in _LAYOUT["grid"])
CELL_OF: dict[Rasi, tuple[int, int]] = {Rasi[name]: (r, c) for r, row in enumerate(GRID) for c, name in enumerate(row) if name}

SIZE = 760
GRID_ORIGIN = 60
CELL = 160
MAX_SINGLE_COLUMN = 5  # more entries than this in one box are written in two columns
COLUMN_GAP = 75
FONT_STACK = "'Noto Serif', 'Noto Serif Tamil', 'Noto Serif Devanagari', serif"
_P = palette()


@dataclass(frozen=True, slots=True)
class ChartInfo:
    """What the centre panel shows besides the ayanamsa (which comes from the chart)."""

    name: str
    place: str


def _n(x: float) -> str:
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


def _c(name: str) -> str:
    return _P.hex(name)


def _text(x, y, content, *, fg, bg, size, anchor="start", weight=None, attrs="", style_extra=""):
    w = f' font-weight="{weight}"' if weight else ""
    return (
        f'<text x="{_n(x)}" y="{_n(y)}" font-size="{_n(size)}" fill="{_c(fg)}" text-anchor="{anchor}"{w} '
        f'data-fg="{fg}" data-bg="{bg}"{attrs}{style_extra}>{content}</text>'
    )


def _offset(td: timedelta) -> str:
    total = int(td.total_seconds())
    sign = "+" if total >= 0 else "−"
    h, rem = divmod(abs(total), 3600)
    m, s = divmod(rem, 60)
    return f"UTC{sign}{h:02d}:{m:02d}" + (f":{s:02d}" if s else "")


def _fit(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


# --- kolam border -------------------------------------------------------------------------------------------------

def _kolam_side(x0: float, x1: float, y: float, step: float = 20.0) -> str:
    """A chain of loops weaving above and below a row of dots (pulli kolam), drawn along y from x0 to x1."""
    n = int((x1 - x0) // step)
    start = x0 + ((x1 - x0) - n * step) / 2
    r = step / 2

    def chain(first_sweep: int) -> str:
        d = [f"M{_n(start)} {_n(y)}"]
        for k in range(n):
            d.append(f"A{_n(r)} {_n(r)} 0 0 {(k + first_sweep) % 2} {_n(start + (k + 1) * step)} {_n(y)}")
        return " ".join(d)

    upper, lower = chain(0), chain(1)  # the two chains cross at every dot gap, enclosing each dot in a loop
    dots = "".join(
        f'<circle cx="{_n(start + (k + 0.5) * step)}" cy="{_n(y)}" r="2.2" fill="{_c("kumkum_bright")}"/>'
        for k in range(n)
    )
    stroke = f'fill="none" stroke="{_c("saffron")}" stroke-width="1.6" stroke-linecap="round"'
    return f'<path d="{upper}" {stroke}/><path d="{lower}" {stroke}/>{dots}'


def _lotus(cx: float, cy: float) -> str:
    """Corner motif: an eight-petalled lotus in a ring."""
    petals = "".join(
        f'<ellipse cx="{_n(cx)}" cy="{_n(cy - 9)}" rx="4.2" ry="9" transform="rotate({k * 45} {_n(cx)} {_n(cy)})" '
        f'fill="{_c("turmeric")}" stroke="{_c("kumkum")}" stroke-width="0.9"/>'
        for k in range(8)
    )
    return (
        f'<g class="corner-motif"><circle cx="{_n(cx)}" cy="{_n(cy)}" r="19" fill="none" stroke="{_c("gold")}" '
        f'stroke-width="1.4"/>{petals}<circle cx="{_n(cx)}" cy="{_n(cy)}" r="4.5" fill="{_c("kumkum_bright")}"/>'
        f'<circle cx="{_n(cx)}" cy="{_n(cy)}" r="1.8" fill="{_c("gold_light")}"/></g>'
    )


def _border() -> str:
    lo, hi, mid = 8.0, SIZE - 8.0, 30.0
    parts = [
        f'<rect x="{_n(lo)}" y="{_n(lo)}" width="{_n(hi - lo)}" height="{_n(hi - lo)}" rx="10" fill="{_c("sandal")}" '
        f'stroke="{_c("gold")}" stroke-width="2"/>',
        f'<rect x="52" y="52" width="{SIZE - 104}" height="{SIZE - 104}" fill="none" stroke="{_c("gold")}" stroke-width="1.5"/>',
    ]
    side = _kolam_side(60, SIZE - 60, mid)
    centre = SIZE / 2
    for angle in (0, 90, 180, 270):
        parts.append(f'<g class="kolam-band" transform="rotate({angle} {_n(centre)} {_n(centre)})">{side}</g>')
    for cx, cy in ((mid, mid), (SIZE - mid, mid), (mid, SIZE - mid), (SIZE - mid, SIZE - mid)):
        parts.append(_lotus(cx, cy))
    return "".join(parts)


# --- sign boxes ---------------------------------------------------------------------------------------------------

def _cell_xy(rasi: Rasi) -> tuple[float, float]:
    r, c = CELL_OF[rasi]
    return GRID_ORIGIN + c * CELL, GRID_ORIGIN + r * CELL


def _entries(chart: ChartPositions, lang: str) -> dict[Rasi, list[tuple[float, str, bool, str]]]:
    """Per rasi: (longitude, text, retrograde, data-graha) sorted by longitude, Lagna included."""
    cells: dict[Rasi, list[tuple[float, str, bool, str]]] = {r: [] for r in Rasi}
    lp = position(chart.lagna)
    cells[lp.rasi].append((chart.lagna, f"{label('ui.LAGNA_SHORT', lang)} {lp.in_rasi.format(seconds=False)}", False, "LAGNA"))
    for graha, body in chart.grahas.items():
        p = position(body.longitude)
        text = f"{label(f'graha_short.{graha.name}', lang)} {p.in_rasi.format(seconds=False)}"
        cells[p.rasi].append((body.longitude, text, body.retrograde, graha.name))
    for entries in cells.values():
        entries.sort(key=lambda e: e[0])
    return cells


def _sign_box(rasi: Rasi, entries, lagna_rasi: Rasi, lang: str) -> str:
    x, y = _cell_xy(rasi)
    is_lagna = rasi == lagna_rasi
    bg = "turmeric_soft" if is_lagna else "ivory"
    out = [
        f'<g id="rasi-{rasi.name}" data-row="{CELL_OF[rasi][0]}" data-col="{CELL_OF[rasi][1]}"'
        f'{" data-lagna=" + quoteattr("true") if is_lagna else ""}>',
        f'<rect x="{_n(x)}" y="{_n(y)}" width="{CELL}" height="{CELL}" fill="{_c(bg)}" stroke="{_c("gold")}" stroke-width="1.5"/>',
        _text(x + CELL - 8, y + 18, escape(label(f"rasi.{rasi.name}", lang)), fg="kumkum", bg=bg, size=12, anchor="end"),
    ]
    if is_lagna:
        out.append(f'<line class="lagna-mark" x1="{_n(x)}" y1="{_n(y + 30)}" x2="{_n(x + 30)}" y2="{_n(y)}" '
                   f'stroke="{_c("kumkum")}" stroke-width="2"/>')
    two_columns = len(entries) > MAX_SINGLE_COLUMN
    size, step, left = (11.5, 17.0, 7.0) if two_columns else (14.0, 20.0, 10.0)
    per_column = math.ceil(len(entries) / 2) if two_columns else len(entries)
    for i, (_, text, retro, code) in enumerate(entries):
        col, row = divmod(i, per_column)
        tx = x + left + col * COLUMN_GAP
        ty = y + 44 + row * step
        is_lagna_entry = code == "LAGNA"
        content = escape(text)
        if retro:
            mark = escape(label("ui.RETROGRADE_MARK", lang))
            content += f'<tspan fill="{_c("kumkum")}" font-size="{_n(size - 3)}" dy="-4" data-fg="kumkum">{mark}</tspan>'
        out.append(_text(tx, ty, content, fg="kumkum" if is_lagna_entry else "maroon", bg=bg, size=size,
                         weight="bold" if is_lagna_entry else None, attrs=f' data-graha="{code}"'))
    out.append("</g>")
    return "".join(out)


# --- centre panel -------------------------------------------------------------------------------------------------

def _centre(chart: ChartPositions, info: ChartInfo, lang: str) -> str:
    x0, y0, w = GRID_ORIGIN + CELL, GRID_ORIGIN + CELL, 2 * CELL
    cx = x0 + w / 2
    local = chart.moment.local
    lines = [
        _text(cx, y0 + 52, escape(label("ui.RASI", lang)), fg="kumkum_bright", bg="sandal", size=28, anchor="middle",
              weight="bold", attrs=' data-role="title"'),
    ]
    y = y0 + 92
    if info.name.strip():
        lines.append(_text(cx, y, escape(_fit(info.name.strip(), 30)), fg="maroon", bg="sandal", size=18,
                           anchor="middle", weight="bold", attrs=' data-role="name"'))
        y += 32
    rows = [
        ("date", f"{label('ui.DATE', lang)}: {local:%d-%m-%Y}"),
        ("time", f"{label('ui.TIME', lang)}: {local:%H:%M:%S} ({_offset(chart.moment.utc_offset)})"),
        ("place", f"{label('ui.PLACE', lang)}: {_fit(info.place, 32)}"),
    ]
    for role, text in rows:
        lines.append(_text(cx, y, escape(text), fg="maroon", bg="sandal", size=14, anchor="middle",
                           attrs=f' data-role="{role}"'))
        y += 26
    ayan = f"{label('ui.AYANAMSA', lang)}: {chart.ayanamsa.name} {to_dms(chart.ayanamsa.degrees).format()}"
    lines.append(_text(cx, y + 10, escape(ayan), fg="kumkum", bg="sandal", size=14, anchor="middle",
                       attrs=' data-role="ayanamsa"'))
    frame = (
        f'<rect x="{_n(x0)}" y="{_n(y0)}" width="{w}" height="{w}" fill="{_c("sandal")}" stroke="{_c("gold")}" stroke-width="1.5"/>'
        f'<rect x="{_n(x0 + 10)}" y="{_n(y0 + 10)}" width="{w - 20}" height="{w - 20}" fill="none" '
        f'stroke="{_c("kumkum")}" stroke-width="0.8" stroke-dasharray="2 4"/>'
        + _lotus(cx, y0 + w - 34)
    )
    return f'<g id="centre">{frame}{"".join(lines)}</g>'


def render_south_indian(chart: ChartPositions, info: ChartInfo, lang: str = "en") -> str:
    """The South Indian rasi chart for ``chart`` as an SVG document (string)."""
    label("ui.LAGNA", lang)  # raises KeyError for an unknown language
    lagna_rasi = position(chart.lagna).rasi
    cells = _entries(chart, lang)
    title = f"{label('ui.RASI', lang)} — {info.name}".strip(" —")
    body = [
        _border(),
        f'<rect x="{GRID_ORIGIN}" y="{GRID_ORIGIN}" width="{4 * CELL}" height="{4 * CELL}" fill="none" '
        f'stroke="{_c("kumkum")}" stroke-width="3"/>',
        *(_sign_box(r, cells[r], lagna_rasi, lang) for r in Rasi),
        _centre(chart, info, lang),
    ]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}" '
        f'role="img" aria-label={quoteattr(title)} lang="{lang}" font-family="{FONT_STACK}">'
        f"<title>{escape(title)}</title>{''.join(body)}</svg>"
    )
