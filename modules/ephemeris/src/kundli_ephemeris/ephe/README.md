# Swiss Ephemeris data files

| File | Contents | Range | Size (bytes) | Git blob in aloistr/swisseph | SHA-256 |
|---|---|---|---|---|---|
| `sepl_18.se1` | Planets | 1800–2399 CE | 864591 | `7a804636f93bd9d8bb78816eb07c68f87262e754` | `9f057b316b1890a7f9340d0bf92db96edbab4939dbcc54762b62f6a70a059eb0` |
| `semo_18.se1` | Moon | 1800–2399 CE | 1304771 | `5427d9f885fd6cb9489584ade37e52c6abb4d407` | `1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7` |

Source: <https://github.com/aloistr/swisseph/tree/master/ephe> (Astrodienst AG), downloaded 2026-11-26.
The mean lunar node (Rahu) needs no data file.

These files are part of the Swiss Ephemeris, © Astrodienst AG, dual-licensed under the GNU AGPL v3 or the Swiss
Ephemeris Professional Licence. They are used here under the AGPL. A birth outside 1800–2399 CE raises
`EphemerisFilesMissing` instead of silently falling back to the less precise Moshier model (CONVENTIONS C9).
