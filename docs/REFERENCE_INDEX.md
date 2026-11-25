# Reference index

This index records which reference file and section defines each jyotisha rule or table the app uses.
The files in [`reference/`](reference/) are the source of truth. Every rule table in the code records the
file and section it came from, and a test fails if the table drifts from that section.

How to read this index:
- Files are named without the `_llm_ready.md` suffix, e.g. `planets_day2_strengths` means
  [`reference/planets_day2_strengths_llm_ready.md`](reference/planets_day2_strengths_llm_ready.md).
- `§2.1` is the numbered heading in that file.
- "Used by" names the module and rule table planned in [MODULES.md](../MODULES.md) (added with the scaffold).
- Where the files are silent or inconsistent, the convention used is in [CONVENTIONS.md](CONVENTIONS.md).

## 1. Rules and tables the app uses

| Rule or table | Primary source | Same data also in (cross-checked, see §3) | Used by | Notes |
|---|---|---|---|---|
| Sign names (English, Sanskrit, Tamil transliteration), spans, symbols | rasis_signs §2 | signs_nakshatras_course_notes §1 | core `rasis.toml` | Tamil script and Devanagari are not in the files (CONVENTIONS C12) |
| Sign lords (7 classical) | rasis_signs §2 | signs_nakshatras_course_notes §1; horoscope_signs_houses §2.2, §6; houses_bhavas_day1 §4; houses_bhavas_course_notes §4 | core `rasis.toml`; placement lordship and dispositor | |
| Rahu co-lord of Aquarius, Ketu co-lord of Scorpio | rasis_signs §2 | planets_day2_strengths §2 ("Sign(s) owned"), §4 | placement `swakshetra.toml` only | Not used for lordship or dispositor (CONVENTIONS D2) |
| Odd / even signs | rasis_signs §3, §5.5 | signs_nakshatras_course_notes §6, §7.1 | core | Needed only to describe signs; not used by placement rules |
| South Indian chart layout (fixed signs, Meena top-left, clockwise) | horoscope_signs_houses §1.3 | — | chart layout table | |
| Graha names and abbreviations (SU MO MA ME JU VE SA RA KE, "R" = retrograde) | horoscope_signs_houses §1.4 | planets_day1_navagrahas §1 | core `grahas.toml`; chart | |
| 27 nakshatras: names, spans within each sign, lords | rasis_signs §11 | horoscope_signs_houses §6 (identical rows) | core `nakshatras.toml` | |
| Nakshatra = 13°20′, pada = 3°20′, 108 padas | nakshatras_navatara_navamsa §1 | signs_nakshatras_course_notes §13 | core `nakshatra_pada()` | |
| Nakshatra lord order (Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury) | nakshatras_navatara_navamsa §2 | signs_nakshatras_course_notes §13 | core `nakshatras.toml` | |
| 108 padas with rasi, rasi lord, nakshatra lord | nakshatra_table §1 | navamsa_calculator §2 | core test (consistency of spans) | Navamsa columns are not shown in the table |
| Positions are geocentric | horoscope_signs_houses §3.2 | — | ephemeris | CONVENTIONS C9 |
| Lagna is the rising degree; houses counted from it | horoscope_signs_houses §3.1 | rasis_signs §7; houses_bhavas_day1 §1 | ephemeris; bhava | |
| Whole-sign houses (rising sign = 1st house) | houses_bhavas_course_notes §3 ("Whole Sign") | houses_bhavas_day1 §3 | bhava `whole_sign()` | |
| Bhava chalit: equal 30° bhavas, Lagna degree as bhava madhya | horoscope_signs_houses §3.3 (method 1, worked example) | houses_bhavas_course_notes §3 (calls it "Porphyry") | bhava `chalit()` | CONVENTIONS D1, C6 |
| Bhava categories: Kendra, Panapara, Apoklima, Trikona, Upachaya, Dusthana, Maraka | houses_bhavas_day1 §7 (table), §7.8 (by house) | houses_bhavas_course_notes §7 | placement `bhava_categories.toml` | Panapara and Apoklima are not in the prompt (CONVENTIONS C7) |
| House lord = lord of the sign the house falls in | houses_bhavas_day1 §8 | houses_bhavas_course_notes §8 | placement lordship | Worked examples §8.1, §8.2 become tests |
| Dispositor = lord of the sign a graha occupies | houses_bhavas_course_notes §9 | — | placement dispositor | |
| Uccha / neecha signs and deep degrees | planets_day2_strengths §2 | — | placement `uccha_neecha.toml` | Includes Rahu (Taurus/Scorpio) and Ketu (Scorpio/Taurus) |
| Moolatrikona signs and degree ranges (7 grahas) | planets_day2_strengths §3 | — | placement `moolatrikona.toml` | No values for Rahu/Ketu (CONVENTIONS C3) |
| Swakshetra (own sign) portions | planets_day2_strengths §4.1 | planets_day2_strengths §4 (inconsistent for Jupiter, Venus) | placement `swakshetra.toml` | CONVENTIONS C2 |
| Exalted / MT / own portions within one sign (Moon Taurus, Mercury Virgo) | planets_day2_strengths §4.1 | — | placement `dignity_precedence.toml` | CONVENTIONS C1 |
| Ranking of placements by strength | planets_day2_strengths §7 | — | placement `dignity_precedence.toml` | |
| Natural friendships (naisargika maitri), 9 grahas | planets_day2_strengths §6.1 (table) | — | placement `naisargika_maitri.toml` | Table, not the prose rule above it (CONVENTIONS C14) |
| Combustion orbs, including retrograde orbs | planets_day2_strengths §9.4 | — | placement `combustion.toml` | The "same sign" condition is not applied (CONVENTIONS D3) |
| Mean node; Ketu = Rahu + 180° | (prompt; not in the files) | — | ephemeris | CONVENTIONS C9 |

## 2. Sections indexed but not used by the placement table

These sections are data the app does not compute. They are listed so that nothing in the reference set is overlooked.

| File | Sections |
|---|---|
| horoscope_signs_houses | §1, §1.1, §1.2 (models, chart formats other than South Indian), §2, §2.1, §3 (general), §4 divisional charts, §5 Kalapurusha |
| houses_bhavas_course_notes | §1, §2, §4 significations and body parts, §5 karakas, §6 purusharthas, §7.1–§7.8 house descriptions, §10 parivartana, §11 functional nature (benefic/malefic, kendra/trikona lords, yogakaraka, kendradhipati dosha, 3-6-11 and 12-2-8 lords, Rahu/Ketu), §12 bhavat bhavam, §13 badhaka, §14 analysis principles, §15 D-2 hora |
| houses_bhavas_day1 | §1, §2, §4 significations, §5 karakas, §6 purusharthas, §7.1–§7.7 descriptions, §9 Aries/Taurus profiles |
| nakshatras_navatara_navamsa | §3 uses, §4 attributes (nature, orientation, guna, gana), §5 tarabalam, §6 navamsa (D-9) and its examples |
| nakshatra_table | §1 navamsa and purushartha columns, §2 attributes (deity, shakti, symbol, classifications, body, dosha, direction, colour, name sounds), §3 symbols |
| navamsa_calculator | §1, §2 (D-9 lookup; used only to cross-check the pada table) |
| planets_day1_navagrahas | All sections (§1–§6): significations, Sankhya, chara karakas, characteristic tables, natural benefics/malefics |
| planets_day2_strengths | §1 strength factors, §2.1 arohi/avarohi, §2.2 uchchabhilashi, §5 dig bala, §6.2 temporal and §6.3 compound relationships, §8 avasthas, §9.1 aspects, §9.2 sthana drishti, §9.3 conjunctions |
| rasis_signs | §1, §3 and §4 classification tables (except odd/even), §5 explanations, §6 significance, §7 lagna timing and Tamil months, §8–§10 three lagnas, §12–§14 worked and practice charts (§14 becomes a nakshatra test) |
| signs_nakshatras_course_notes | Part A §2–§8 sign classifications, Part B §9–§12 three lagnas, Part C §14–§17 nakshatra uses, attributes, tarabalam, navamsa |
| tarabalam_table_pushya | §1, §2 |
| time_day1_cycles_hora_calendars | All sections: yugas, units of time, sunrise definition, hora, vara, ritus, ayanas, calendars, samvatsaras |
| time_panchanga_course_notes | All sections: the same time topics plus tithi, karana, yoga, muhurta, Abhijit |

## 3. Cross-checks between files (2026-11-26)

These were checked by script against the reference files as committed in `f4fd241`. The same checks become tests in the core
and placement modules.

| Check | Result |
|---|---|
| Sign lords in rasis_signs §2, signs_nakshatras_course_notes §1, horoscope_signs_houses §6, houses_bhavas_day1 §4, houses_bhavas_course_notes §4 | Agree for all 12 signs |
| Nakshatra rows in rasis_signs §11 and horoscope_signs_houses §6 | Identical (36 rows) |
| The 27 nakshatras are consecutive 13°20′ spans from 0° Aries | Yes |
| Nakshatra lords follow the Vimshottari order | Yes |
| nakshatra_table §1 (108 padas): rasi, rasi lord, nakshatra, pada, nakshatra lord, navamsa sign and lord | Consistent with the spans and the sign lords |
| navamsa_calculator §2 against nakshatra_table §1 | Match (108 rows) |
| House classifications in houses_bhavas_day1 §7, §7.8 and houses_bhavas_course_notes §7 | Agree (the §7.3 heading typo in the course notes is noted in CONVENTIONS) |
| Neecha is the 7th sign from uccha at the same degree (planets_day2_strengths §2) | Yes, all 9 grahas |
| Natural friendship table against the rule written in planets_day2_strengths §6.1 | 3 cells differ (Moon→Venus, Mars→Saturn, Venus→Jupiter). With the classical clause "the lord of the exaltation sign is also a friend" the table matches in all 42 cells. See CONVENTIONS C14 |

## 4. Instructions addressed to an AI

None of the 13 files contains instructions addressed to an AI or a coding agent. The "llm_ready" suffix
appears only in the filenames.
