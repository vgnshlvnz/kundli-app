# Location data

| File | What it is | Edited by |
|---|---|---|
| `locations.db` | SQLite: `locations(id, country, state, latitude, longitude)`, 722 places. `state` holds a state or a city; an empty `state` is the centre of the country. | Supplied by the owner; not modified by the app. |
| `locations_tz.csv` | One row per place: the IANA timezone derived from its coordinates, and whether the place may be used for a chart (`usable`, `reason`). | Generated; do not edit. Regenerate with `uv run --package kundli-locations --extra derive python -m kundli_locations.derive_tz`; `--check` verifies it. |
| `locations_tz.meta.toml` | Versions of timezonefinder, its data and tzdata used for the CSV, and counts. | Generated. |
| `locations_tz_overrides.csv` | The owner's decisions that change a derived row: `id,tz,usable,reason,decided_by`. An empty `tz` keeps the derived zone. | The owner. |

Rules (docs/CONVENTIONS.md D5, C13): the zone is the one at the row's coordinates. A country-centre row is unusable
when the country has more than one zone in the system's `zone.tab`, because its coordinates do not say which zone a
birth was in. Other country-centre rows are usable, with a warning that the coordinates are approximate.

To use other files, set `KUNDLI_LOCATIONS_DB`, `KUNDLI_LOCATIONS_TZ` and `KUNDLI_LOCATIONS_TZ_OVERRIDES`.
