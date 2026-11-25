# Conventions

This file records every jyotisha and calculation convention the app uses: who decided it, what the reference
files say, and what the app does. Nothing is chosen silently. If a rule is not here, the code must not
assume it.

Status:
- **DECIDED**: chosen by the project owner (date given).
- **CONFIRM**: a default proposed where the reference files are silent or inconsistent. It needs the owner's
  confirmation before the module that uses it is merged.
- **OPEN**: not yet decided. The feature that needs it is blocked.

Sources are cited as in [REFERENCE_INDEX.md](REFERENCE_INDEX.md): file name without `_llm_ready.md`, then `§section`.

---

## A. Decided

| ID | Topic | Decision (2026-11-26) | Source and effect |
|---|---|---|---|
| D1 | Bhava chalit method | **Equal 30° bhavas with the Lagna degree as bhava madhya.** Bhava 1 runs from Lagna − 15° to Lagna + 15°, then 30° steps. | horoscope_signs_houses §3.3 defines this and calls it "Sripati Bhava chart". houses_bhavas_course_notes §3 calls the same method "Porphyry". It is **not** the classical Sripati Paddhati (unequal bhavas from quadrant trisection), so reference charts must come from software set to equal bhavas with the Lagna as madhya. The UI labels it "Bhava chalit (equal, Lagna as madhya)". |
| D2 | Rahu/Ketu lordship | **Seven classical lords only** for the Lordship and Dispositor columns. Rahu's co-lordship of Aquarius and Ketu's of Scorpio count only toward **swakshetra dignity**. | rasis_signs §2 and planets_day2_strengths §4 give the co-lordship. The lordship tables in houses_bhavas_day1 §8 and houses_bhavas_course_notes §8 use seven lords. So Rahu and Ketu rule no bhava and are nobody's dispositor; a graha in Aquarius has Saturn as its only dispositor. |
| D3 | Combustion | **Angular distance from the Sun only.** | Orbs come from planets_day2_strengths §9.4. That section also says a graha is combust only "while occupying the same sign as the Sun"; **this condition is deliberately not applied** (owner's decision). Example: Mercury at 29° Leo with the Sun at 2° Virgo (3° apart) is combust. |
| D4 | Mitra / sama / shatru kshetra | **Natural (naisargika), three-fold**, from the planets_day2_strengths §6.1 table, including its Rahu and Ketu rows. | The compound five-fold relationship (§6.3) is not used. |
| D5 | Timezones | Each place's IANA timezone is **derived once, offline, from its latitude/longitude** with `timezonefinder` (MIT), and written to `data/locations_tz.csv` for review. Historical offsets come from the IANA tzdata installed with the OS. Country-centroid rows of countries that span more than one zone are **rejected**. | `locations.db` has no timezone column (see section E). The owner reviews the CSV; any row can be corrected or marked usable by hand. |
| D6 | Licence | **AGPL-3.0-or-later.** | pyswisseph is AGPL-3.0 and Swiss Ephemeris is AGPL-3.0 (or an Astrodienst professional licence). The README states this. |
| D7 | Git flow | `archive` holds the earlier work. Each module is built in its own worktree and branch and reaches `master` through **one pull request per module**, merged after CI passes. | Not a jyotisha rule; recorded because the owner chose it. |
| D8 | Reference files | Committed publicly under `docs/reference/`. | |

## B. Ayanamsa

| Option | Swiss Ephemeris mode | Status |
|---|---|---|
| 1. Lahiri (default) | `SIDM_LAHIRI` (1) | DECIDED (prompt) |
| 2. Raman | `SIDM_RAMAN` (3) | DECIDED (prompt) |
| 3. KP Old | `SIDM_KRISHNAMURTI` (5) | DECIDED (prompt) |
| 4. KP New | candidate `SIDM_KRISHNAMURTI_VP291` (45) | **OPEN**: needs comparison with your guru's software |

Swiss Ephemeris (pyswisseph 2.10.03) has exactly two Krishnamurti modes: mode 5 "Krishnamurti" and mode 45,
which it names **"Krishnamurti-Senthilathiban"** (`SIDM_KRISHNAMURTI_VP291`). If your guru's software matches
neither, option 4 is defined with `SIDM_USER` and a reference epoch `t0` and value `ayan_t0` read from that software.

Values at 00:00 UT, including nutation (the value actually subtracted from the positions, see C10):

| Date | Lahiri (1) | Raman (3) | KP Old (5) | KP New candidate (45) | 45 − 5 |
|---|---|---|---|---|---|
| 1900-01-01 | 22°27′55.34″ | 21°01′08.66″ | 22°22′06.67″ | 22°23′19.14″ | +1′12.47″ |
| 1950-01-01 | 23°09′28.11″ | 21°42′41.42″ | 23°03′39.44″ | 23°04′51.90″ | +1′12.46″ |
| **2000-01-01** | **23°51′11.53″** | **22°24′24.85″** | **23°45′22.86″** | **23°46′35.31″** | **+1′12.45″** |
| 2025-01-01 | 24°12′23.03″ | 22°45′36.35″ | 24°06′34.37″ | 24°07′46.81″ | +1′12.44″ |
| 2050-01-01 | 24°33′35.38″ | 23°06′48.69″ | 24°27′46.71″ | 24°28′59.15″ | +1′12.44″ |

Without nutation ("mean") the 2000-01-01 values are: Lahiri 23°51′25.46″, Raman 22°24′38.78″,
KP Old 23°45′36.80″, KP New candidate 23°46′49.25″. Some software prints the mean value, which differs from the
value above by up to about 17″. When you compare, please note which one your software shows.

These values are pinned in the ephemeris tests to 0.1″. The table will gain the values at your reference-chart
moments once you send the charts.

## C. Defaults to confirm

| ID | Topic | What the files say | Proposed default (CONFIRM) |
|---|---|---|---|
| C1 | When is a graha uccha, moolatrikona or swakshetra in the same sign? | planets_day2_strengths §2 gives the exaltation sign and deep degree; §4.1 splits two signs: Moon in Taurus (exalted 0–3°, MT 3–30°), Mercury in Virgo (exalted 0–15°, MT 15–20°, own 20–30°). §7 ranks exaltation > MT > own > friendly > neutral > debilitated > enemy. | Uccha and neecha apply to the **whole** sign, except for the two §4.1 splits. Precedence: uccha / neecha first, then moolatrikona, then swakshetra, then mitra / sama / shatru kshetra by the graha's natural relationship (D4) to the sign lord. A neecha graha shows "neecha"; its relationship to the sign lord is shown beside it as supporting detail. |
| C2 | Own-sign portion for Jupiter and Venus | §4 prints Jupiter "Sagittarius 5°–30° (as printed)" and Venus "Libra 20°–30° (as printed)", which overlap or leave gaps against their moolatrikona (Sag 0–10°, Libra 0–15°). §4.1 says "remainder" for both, and the file's own source note flags §4. | Follow §4.1: **Jupiter Sagittarius 10–30°, Venus Libra 15–30°** are swakshetra. Other portions as printed: Sun Leo 20–30°, Mars Aries 12–30°, Mercury Virgo 20–30°, Saturn Aquarius 20–30°. The whole sign is swakshetra for the Moon's Cancer and for each graha's other own sign: Mars Scorpio, Mercury Gemini, Jupiter Pisces, Venus Taurus, Saturn Capricorn. |
| C3 | Rahu and Ketu dignities | §2: Rahu uccha Taurus, neecha Scorpio; Ketu uccha Scorpio, neecha Taurus. §4: Rahu owns Aquarius, Ketu owns Scorpio. §3 gives no moolatrikona for either. | Use §2 and §4 as printed. **No moolatrikona** for Rahu or Ketu (the files are silent). Ketu in Scorpio is both exalted and own; by C1 it shows **uccha**. |
| C4 | Combustion details | §9.4 gives orbs for Moon, Mars, Mercury, Jupiter, Venus, Saturn and retrograde orbs for Mercury and Venus. | The **Sun, Rahu and Ketu are never combust.** "Within N°" means angular distance **≤ N°**. The retrograde orb applies when the graha is retrograde at the birth moment. The table shows the distance from the Sun. |
| C5 | Boundaries and display | Not stated. | Sign, nakshatra, pada and bhava ranges are half-open, **[start, end)**: a graha at exactly 0°00′00″ Taurus is in Taurus, Krittika pada 2. Degrees are **truncated, not rounded**, for display, so 29°59′59.6″ shows as 29°59′ and never as 30°00′. Calculations always use the full value. |
| C6 | Chalit sandhi | horoscope_signs_houses §3.3: bhava 1 is Lagna ± 15°. | Bhava *n* = [Lagna + 30°(n−1) − 15°, Lagna + 30°(n−1) + 15°). A graha exactly on a sandhi belongs to the **later** bhava (consistent with C5). |
| C7 | Bhava categories | houses_bhavas_day1 §7 and houses_bhavas_course_notes §7 define seven: Kendra 1,4,7,10; Panapara 2,5,8,11; Apoklima 3,6,9,12; Trikona 1,5,9; Upachaya 3,6,10,11; Dusthana 6,8,12; Maraka 2,7. The prompt lists five of them (no Panapara or Apoklima). | The five values in the prompt match the files exactly. **Include Panapara and Apoklima as well**, because the files define them, unless you prefer the prompt's five. Categories are shown for the **whole-sign bhava**, and also for the chalit bhava when it differs. |
| C8 | Lordship and dispositor | houses_bhavas_day1 §8: the lord of a house is the lord of its sign. houses_bhavas_course_notes §9: the dispositor is the lord of the sign a graha occupies. | Lordship is **sign-based, counted from the Lagna sign** (whole-sign); the chalit cusps do not change lordship. A graha in its own sign is its own dispositor. The dispositor's bhava is shown both whole-sign and chalit. |
| C9 | Positions | horoscope_signs_houses §3.2: positions are geocentric. The prompt: mean node; Ketu = Rahu + 180°; Rahu and Ketu always retrograde. | **Geocentric, apparent** positions from the **Swiss Ephemeris data files** (no silent fallback to the Moshier model; the app fails with a clear error if the files are missing). Lagna is the sidereal ascendant from `swe.houses_ex`. Retrograde means longitudinal speed < 0. The Sun and Moon are never retrograde. Rahu is `MEAN_NODE`, Ketu is Rahu + 180°, and both are always marked R. |
| C10 | Ayanamsa shown on the chart | Not stated. | Show the value **actually subtracted** from the positions: Swiss Ephemeris applies the ayanamsa including nutation. A test checks that the tropical Sun minus the sidereal Sun equals the displayed value (it does, to 0.01″, for all four options). |
| C11 | Local time to UT | Not stated. | Use the IANA tzdata rules for the place's zone, including history before 1970. A local time that does not exist (a DST gap) or occurs twice (a DST overlap) is **not guessed**: the app returns an error asking the user to choose. UT is converted to Julian day with `swe.utc_to_jd`. |
| C12 | Tamil and Sanskrit labels | The files give Tamil and Sanskrit names in Latin transliteration only (e.g. rasis_signs §2: Mesham, Vrishabham). | Tamil labels in **Tamil script** and Sanskrit labels in **Devanagari**, drafted from the standard names and the files' transliterations. The full label list comes with the core module PR for your review. |
| C13 | Country-centroid places | Not a jyotisha rule. | Centroid rows of single-zone countries are allowed, with a warning that the coordinates are the centre of the country and the Lagna may be off. Multi-zone countries are rejected (D5). |
| C14 | Natural friendship table vs its stated rule | planets_day2_strengths §6.1 says friends are the lords of the 2nd, 4th, 5th, 8th, 9th and 12th from the moolatrikona sign, and enemies the lords of the 3rd, 6th, 7th, 10th and 11th. Applied literally, this gives 3 cells that differ from the table in the same section: Moon→Venus, Mars→Saturn and Venus→Jupiter come out as enemy, but the table says neutral. | Use **the table as printed**. It matches exactly when the classical clause "the lord of the exaltation sign is also a friend" is added to the rule, so the table is the complete version. |
| C15 | Lagna row | Not stated. | The placement table starts with a Lagna row: rasi, degree, nakshatra and pada, Lagna lord, and the bhava of the Lagna lord. Dignity, combustion and retrograde do not apply to it. |

## D. Inconsistencies in the files that the app does not depend on

These are listed so you know they were seen. The app's output does not depend on them. Most are already marked
"Source note" in the files themselves.

| File and section | Inconsistency |
|---|---|
| houses_bhavas_course_notes §7.3 | Heading in the original lists Apoklima as 3, 6, 9, 11; the text and houses_bhavas_day1 §7 give 3, 6, 9, 12. The app uses 3, 6, 9, 12. |
| houses_bhavas_course_notes §3, houses_bhavas_day1 §3 | The Equal House system is called "the default in Vedic astrology". The app shows whole-sign and the chalit of D1, which is itself an equal-house method. |
| planets_day2_strengths §2.1 | Ketu's arohi and avarohi spans are printed identically. |
| planets_day2_strengths §6.2, §6.3 | The worked example's Mercury temporal row and Saturn–Venus compound cell do not follow the stated rules. Temporal and compound relationships are not used (D4). |
| planets_day2_strengths §4 | Mercury's positive/negative sign columns were swapped in the original slide; the file corrects this by the odd/even rule. |
| nakshatras_navatara_navamsa §6.1, signs_nakshatras_course_notes §17.1 | Range typos for Purva Bhadrapada and Pushya, corrected in the files. The app takes nakshatra spans from rasis_signs §11. |
| houses_bhavas_course_notes §15 | The D-2 table puts Mercury in the Sun's hora; the drawn chart and the rule say the Moon's hora. D-2 is not used. |
| time_day1_cycles_hora_calendars §3.5, §3.6, §4.1, §4.2; time_panchanga_course_notes §4.5, §5.1, §6.3, §6.4 | Ritu solar months offset by one sign; Pangguni period; Phalguna nakshatra; ayana labels; tithi-category examples; karana numbering. None of these is used. |

## E. Data limitations

- `locations.db` has one table, `locations(id, country, state, latitude, longitude)`, with 722 rows in 116
  countries. It has no timezone column (hence D5) and no city column: `state` holds states and cities alike. 115
  rows are country centroids.
- 54 countries have **only** a centroid row. Among them, Australia, Brazil, Canada, Russia, Mexico and Mongolia span
  several zones, so D5 leaves **no usable place** in those countries. New Zealand (Chatham Islands) and Chile
  (Easter Island) also have more than one zone; you can mark their centroids usable in the CSV review.
- All coordinates are centroids of a city, state or country. For example, the Tamil Nadu row is about 1.6° of
  longitude from Chennai, which can move the Lagna by about a degree. Manual latitude/longitude entry is not in
  scope unless you ask for it.

## F. Needed from you

1. Confirm or correct C1–C15.
2. KP New (section B): the value your guru's software shows for 2000-01-01, and whether it is the mean or the true value.
3. At least three reference charts from established software (section G).

## G. Reference charts: what to send

For each chart:
- Date, local time, place, and the latitude, longitude and timezone (or UTC offset) the software used.
- Software name and version; ayanamsa; node setting (mean); bhava chalit setting (equal, Lagna as madhya, per D1).
- Lagna and the 9 grahas: longitude to the precision the software prints (degree, minute and, if shown, second), the
  retrograde marks, and the nakshatra and pada.
- The chalit bhava of each graha.

Between them, the charts should include one where a graha's whole-sign and chalit bhavas differ, one birth in the
southern hemisphere, and one high-latitude birth (above about 55°).
