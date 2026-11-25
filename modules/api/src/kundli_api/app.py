"""FastAPI service composing the calculation modules. Run with ``uv run uvicorn kundli_api.app:app``.

Nothing here calculates: it validates input, calls the modules in order (locations → ephemeris → placement → chart)
and turns their errors into responses that tell the user what to fix. No time or place is guessed.
"""

from __future__ import annotations

import os
from datetime import date as Date
from datetime import datetime
from datetime import time as Time
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator

from kundli_bhava import CHALIT_NAME
from kundli_chart import ChartInfo, render_south_indian
from kundli_core import LANGUAGES, labels
from kundli_ephemeris import (
    DEFAULT_AYANAMSA,
    EphemerisError,
    EphemerisFilesMissing,
    compute_positions,
    list_ayanamsas,
)
from kundli_locations import (
    AmbiguousLocalTime,
    LocationStore,
    NonexistentLocalTime,
    PlaceNotUsable,
    UnknownPlace,
    default_store,
    make_moment,
)
from kundli_placement import build_table

from . import serialize

Lang = Literal["en", "ta", "sa"]
assert set(LANGUAGES) == {"en", "ta", "sa"}
DEFAULT_WEB_DIR = Path(__file__).resolve().parents[4] / "modules" / "web" / "static"


class ChartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field("", max_length=100)
    date: Date
    time: Time
    place_id: int
    ayanamsa: str = DEFAULT_AYANAMSA
    lang: Lang = "en"
    fold: Literal[0, 1] | None = None

    @field_validator("time")
    @classmethod
    def _naive_time(cls, v: Time) -> Time:
        if v.tzinfo is not None:
            raise ValueError("give the local wall-clock time without a UTC offset")
        return v

    @field_validator("ayanamsa")
    @classmethod
    def _known_ayanamsa(cls, v: str) -> str:
        ids = [o.id for o in list_ayanamsas()]
        if v not in ids:
            raise ValueError(f"unknown ayanamsa {v!r}; expected one of {ids}")
        return v


def _error(status: int, code: str, message: str, **extra: Any) -> HTTPException:
    return HTTPException(status_code=status, detail={"code": code, "message": message, **extra})


def create_app(store: LocationStore | None = None, web_dir: Path | None = None) -> FastAPI:
    app = FastAPI(title="Kundli App", version="0.1.0", docs_url="/api/docs", redoc_url=None,
                  openapi_url="/api/openapi.json")

    def places() -> LocationStore:
        return store if store is not None else default_store()

    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {"status": "ok", "places": len(places()), "ayanamsas": [o.id for o in list_ayanamsas()]}

    @app.get("/api/places")
    def search_places(q: Annotated[str, Query(max_length=100)] = "",
                      limit: Annotated[int, Query(ge=1, le=50)] = 10) -> list[dict[str, Any]]:
        return [serialize.place(p) for p in places().search(q, limit)]

    @app.get("/api/ayanamsas")
    def ayanamsas() -> list[dict[str, Any]]:
        return [{"id": o.id, "name": o.name, "default": o.id == DEFAULT_AYANAMSA} for o in list_ayanamsas()]

    @app.get("/api/labels")
    def get_labels(lang: Lang = "en") -> dict[str, str]:
        return dict(labels(lang))

    @app.post("/api/chart")
    def chart(req: ChartRequest) -> dict[str, Any]:
        try:
            place = places().get(req.place_id)
        except UnknownPlace as exc:
            raise _error(404, "unknown_place", str(exc)) from None
        local = datetime.combine(req.date, req.time)
        try:
            moment = make_moment(local, place, req.fold)
        except PlaceNotUsable as exc:
            raise _error(422, "place_not_usable", str(exc), place=serialize.place(place)) from None
        except NonexistentLocalTime as exc:
            raise _error(400, "nonexistent_time", str(exc), offsets=[serialize.offset_text(exc.offset_before),
                                                                      serialize.offset_text(exc.offset_after)]) from None
        except AmbiguousLocalTime as exc:
            choices = [{"fold": i, "utc_offset": serialize.offset_text(o)} for i, o in enumerate(exc.offsets)]
            raise _error(400, "ambiguous_time", str(exc), choices=choices) from None
        try:
            positions = compute_positions(moment, place.geo, req.ayanamsa)
        except EphemerisFilesMissing as exc:
            raise _error(422, "date_out_of_range", str(exc)) from None
        except EphemerisError as exc:
            raise _error(422, "ephemeris_error", str(exc)) from None
        table = build_table(positions)
        svg = render_south_indian(positions, ChartInfo(req.name, place.label), req.lang)
        return {
            "input": {"name": req.name, "date": req.date.isoformat(), "time": req.time.isoformat(),
                      "place": serialize.place(place), "ayanamsa": req.ayanamsa, "lang": req.lang, "fold": req.fold},
            "birth": {"local": local.isoformat(), "tz": moment.tz, "utc": moment.utc.isoformat(),
                      "utc_offset": serialize.offset_text(moment.utc_offset), "jd_ut": positions.jd_ut},
            "ayanamsa": {"id": positions.ayanamsa.option, "name": positions.ayanamsa.name,
                         "degrees": positions.ayanamsa.degrees, "dms": serialize.ayanamsa_dms(positions.ayanamsa.degrees)},
            "chalit_method": CHALIT_NAME,
            "lagna": serialize.lagna_row(table.lagna),
            "rows": [serialize.placement_row(r) for r in table.rows],
            "warnings": [place.note] if place.note else [],
            "chart_svg": svg,
        }

    @app.get("/theme.css")
    def theme() -> Response:
        return Response(serialize.theme_css(), media_type="text/css")

    static = web_dir if web_dir is not None else Path(os.environ.get("KUNDLI_WEB_DIR", DEFAULT_WEB_DIR))
    if static.is_dir():
        app.mount("/", StaticFiles(directory=static, html=True), name="web")
    return app


app = create_app()
