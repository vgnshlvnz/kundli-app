# Kundli App

A Vedic astrology chart app. You enter a birth date, time and place; the app draws a South Indian rasi chart and,
directly below it, a placement table: where each graha is and what that placement is (rasi, nakshatra and pada,
bhava by whole-sign and by bhava chalit, bhava categories, dignity, combustion, lordship and dispositor).

All output is deterministic, rule-based calculation. **No LLM is used anywhere in the app.**

> Status: under construction. The modules are being built one pull request at a time; see [MODULES.md](MODULES.md).
> The earlier JavaScript app is preserved unchanged on the [`archive`](../../tree/archive) branch.

## How the rules are kept honest

- Astronomy comes from the Swiss Ephemeris (via pyswisseph): sidereal longitudes, the Lagna and the ayanamsa.
- Jyotisha rules live in data tables, not in code, so an astrologer can review and correct them. Each table records
  the reference file and section it came from in [`docs/reference/`](docs/reference/), and a test fails if a
  table no longer matches its source. [`docs/REFERENCE_INDEX.md`](docs/REFERENCE_INDEX.md) maps every rule to its source.
- Every convention, and every place where the reference files are silent or inconsistent, is recorded in
  [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) with the owner's decision.

## Requirements

- [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 from `.python-version` if needed).
- A C compiler (gcc or clang). pyswisseph publishes wheels only up to Python 3.11, so uv builds it from source.
- The IANA timezone database from the operating system (`/usr/share/zoneinfo`, the `tzdata` package on
  Debian/Ubuntu). Its history before 1970 is used for old birth dates.

## Setup and tests

```sh
uv sync --all-packages                    # create .venv with every module and the dev tools
uv run python tools/check_modules.py      # the module dependency rule (also run in CI)
uv run pytest                             # all tests
```

## Running the app

```sh
uv run uvicorn kundli_api.app:app      # then open http://127.0.0.1:8000/  (API docs at /api/docs)
```

## Location data

`data/locations.db` (SQLite, 114 KB) holds the places: table `locations(id, country, state, latitude,
longitude)`, 722 rows. It is small, so it is committed. It has no timezone column; each place's IANA timezone is
derived once from its coordinates and kept, for review, in `data/locations_tz.csv` (see CONVENTIONS D5).
To use a different database, set `KUNDLI_LOCATIONS_DB` to its path.

## Licence

This repository is licensed under the **GNU Affero General Public License v3.0 or later**
(SPDX `AGPL-3.0-or-later`); see [LICENSE](LICENSE).

The app depends on the **Swiss Ephemeris** by Astrodienst AG, which is dual-licensed under the
**GNU AGPL v3** or the Swiss Ephemeris Professional Licence, and on **pyswisseph**, its Python binding, which is
licensed under the **GNU AGPL v3**. Because the API serves Swiss Ephemeris results over a network, anyone who runs
a modified version of this app as a service must offer its source code to the service's users under the AGPL.

The reference files in `docs/reference/` are course notes supplied by the project owner and are not covered by the
AGPL licence of the code.
