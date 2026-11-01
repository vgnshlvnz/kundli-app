#!/usr/bin/env python3
"""Panchanga oracle: writes tests/fixtures/panchanga/*.json using pyswisseph.

DEV-ONLY. Never imported by the app, never deployed (Workers run the JS module;
this only produces expected values for the tests to compare against).

Run:  scripts/oracle/.venv/bin/python scripts/oracle/gen_fixtures.py

Conventions used by the oracle (recorded in every fixture under "oracle"):
  * Ephemeris: Moshier (SEFLG_MOSEPH), no data files needed. Sun/Moon error
    is a few arcseconds, i.e. well under 1 s of boundary time.
  * Sunrise/sunset: swe.rise_trans defaults = upper limb, with standard
    refraction (1013.25 mbar, 15 C), observer at sea level.
  * Hindu day: the latest sunrise <= birth to the next sunrise.
  * Vara: weekday of the LOCAL CIVIL DATE of that sunrise (via IANA tzdata,
    so Kuala Lumpur's 1982 change is honoured).
  * Ayanamsa: MEAN (no nutation), matching public/js/kundli/ephemeris ayanamsa().
    (Swiss Ephemeris' own sidereal flag uses the true ayanamsa; it differs by <=17".)
  * Tithi/karana: tropical Moon - Sun. Nakshatra/pada: sidereal Moon.
    Yoga: sidereal Sun + sidereal Moon. Sidereal uses the chart's ayanamsa.
  * Anga start/end: bracket + bisection on the unwrapped angle, to 1 s.
"""
import json
import math
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import swisseph as swe

FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "fixtures", "panchanga")

SIDM = {
    "lahiri": swe.SIDM_LAHIRI,
    "raman": swe.SIDM_RAMAN,
    "krishnamurti": swe.SIDM_KRISHNAMURTI,
}

TITHI_BASE = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi",
              "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi",
              "Trayodashi", "Chaturdashi"]
TITHI_NAMES = TITHI_BASE + ["Purnima"] + TITHI_BASE + ["Amavasya"]
NAKSHATRAS = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
              "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta",
              "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha",
              "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
              "Uttara Bhadrapada", "Revati"]
YOGAS = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
         "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
         "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
         "Shukla", "Brahma", "Indra", "Vaidhriti"]
MOVABLE = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"]
VARAS = ["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara"]
ENGLISH = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def karana_name(i):  # i = 0..59 (half-tithi index)
    if i == 0:
        return "Kimstughna"
    if i >= 57:
        return ["Shakuni", "Chatushpada", "Naga"][i - 57]
    return MOVABLE[(i - 1) % 7]


# ---------------------------------------------------------------- time helpers
def jd(unix):
    return unix / 86400.0 + 2440587.5


def unix(jd_ut):
    return (jd_ut - 2440587.5) * 86400.0


def iso_local(unix_s, tz):
    return datetime.fromtimestamp(unix_s, ZoneInfo(tz)).isoformat(timespec="seconds")


def local_to_unix(y, mo, d, h, mi, tz):
    return int(datetime(y, mo, d, h, mi, tzinfo=ZoneInfo(tz)).timestamp())


# ---------------------------------------------------------------- longitudes
def lons(t, ayan):
    """(sun_trop, moon_trop, sun_sid, moon_sid) at unix time t."""
    swe.set_sid_mode(SIDM[ayan])
    j = jd(t)
    sun = swe.calc_ut(j, swe.SUN, FLAGS)[0][0]
    moon = swe.calc_ut(j, swe.MOON, FLAGS)[0][0]
    a = swe.get_ayanamsa_ex_ut(j, swe.FLG_MOSEPH | swe.FLG_NONUT)[1]  # mean, as the app's ephemeris module
    return sun, moon, (sun - a) % 360, (moon - a) % 360


def angle(kind, t, ayan):
    s, m, ss, ms = lons(t, ayan)
    return {
        "elong": (m - s) % 360,        # tithi, karana (tropical)
        "moon_sid": ms,                # nakshatra
        "yoga": (ss + ms) % 360,       # yoga
        "sun_sid": ss,                 # sankranti
    }[kind]


def _past(kind, ayan, t, edge):
    """Signed distance (deg, in -180..180) of the angle past `edge`."""
    return (angle(kind, t, ayan) - edge + 180) % 360 - 180


def find_edge(kind, ayan, t0, edge, forward, step=3600):
    """Time the angle crosses `edge` (deg) going forward/backward from t0."""
    edge %= 360
    a, b = t0, t0
    sign = 1 if forward else -1
    for _ in range(24 * 40):  # at most 40 days
        b = a + sign * step
        da, db = _past(kind, ayan, a, edge), _past(kind, ayan, b, edge)
        if forward and da < 0 <= db:
            lo, hi = a, b
            break
        if not forward and db < 0 <= da:
            lo, hi = b, a
            break
        a = b
    else:
        raise RuntimeError("no crossing")
    while hi - lo > 0.5:  # bisection to 0.5 s
        mid = (lo + hi) / 2
        if _past(kind, ayan, mid, edge) >= 0:
            hi = mid
        else:
            lo = mid
    return round((lo + hi) / 2)


WIDTH = {"elong": 12.0, "moon_sid": 360 / 27, "yoga": 360 / 27}


def span(kind, ayan, t, width, namer):
    idx = int(angle(kind, t, ayan) // width)
    lo = find_edge(kind, ayan, t, idx * width, forward=False)
    hi = find_edge(kind, ayan, t, (idx + 1) * width, forward=True)
    return {"index": idx, "name": namer(idx), "startUtc": lo, "endUtc": hi}


def angas(t, ayan):
    tithi = span("elong", ayan, t, 12.0, lambda i: TITHI_NAMES[i])
    karana = span("elong", ayan, t, 6.0, karana_name)
    nak = span("moon_sid", ayan, t, WIDTH["moon_sid"], lambda i: NAKSHATRAS[i])
    yoga = span("yoga", ayan, t, WIDTH["yoga"], lambda i: YOGAS[i])
    shukla = tithi["index"] < 15
    paksha = {
        "index": 0 if shukla else 1,
        "name": "shukla" if shukla else "krishna",
        "startUtc": find_edge("elong", ayan, t, 0 if shukla else 180, forward=False),
        "endUtc": find_edge("elong", ayan, t, 180 if shukla else 0, forward=True),
    }
    ms = angle("moon_sid", t, ayan)
    pada = int((ms % WIDTH["moon_sid"]) // (WIDTH["moon_sid"] / 4)) + 1
    return {"tithi": tithi, "paksha": paksha, "nakshatra": nak, "pada": pada,
            "yoga": yoga, "karana": karana}


# ---------------------------------------------------------------- sunrise
def rises_sets(t_birth, lat, lon):
    geo = (lon, lat, 0.0)

    def all_events(rsmi):
        out, t = [], jd(t_birth - 2.5 * 86400)
        end = jd(t_birth + 2.5 * 86400)
        while t < end:
            res, tret = swe.rise_trans(t, swe.SUN, rsmi, geo, 1013.25, 15.0, swe.FLG_MOSEPH)
            if res < 0:  # circumpolar
                return out
            out.append(unix(tret[0]))
            t = tret[0] + 0.01
        return out

    return all_events(swe.CALC_RISE), all_events(swe.CALC_SET)


MODE_FLAGS = {"centreRefracted": swe.BIT_DISC_CENTER,
              "centreNoRefraction": swe.BIT_DISC_CENTER | swe.BIT_NO_REFRACTION}


def mode_times(sunrise, lat, lon):
    """Sunrise/sunset of the same Hindu day under the other two sunrise modes."""
    out = {}
    for name, bits in MODE_FLAGS.items():
        g = (lon, lat, 0.0)
        r = swe.rise_trans(jd(sunrise - 7200), swe.SUN, swe.CALC_RISE | bits, g, 1013.25, 15.0, swe.FLG_MOSEPH)[1][0]
        st = swe.rise_trans(jd(sunrise), swe.SUN, swe.CALC_SET | bits, g, 1013.25, 15.0, swe.FLG_MOSEPH)[1][0]
        out[name] = {"sunriseUtc": round(unix(r)), "sunsetUtc": round(unix(st))}
    return out


def hindu_day(t_birth, lat, lon, tz):
    rises, sets = rises_sets(t_birth, lat, lon)
    before = [r for r in rises if r <= t_birth]
    after = [r for r in rises if r > t_birth]
    if not before or not after:
        return {"noSunrise": True}
    sr, nsr = before[-1], after[0]
    ss = next((s for s in sets if s > sr), None)
    zi = ZoneInfo(tz)
    sr_local = datetime.fromtimestamp(sr, zi)
    birth_local = datetime.fromtimestamp(t_birth, zi)
    dow = (sr_local.weekday() + 1) % 7  # python Mon=0 -> Sun=0
    return {
        "noSunrise": False,
        "sunriseUtc": round(sr), "sunsetUtc": round(ss) if ss else None,
        "nextSunriseUtc": round(nsr),
        "isPreviousCivilDay": sr_local.date() < birth_local.date(),
        "vara": {"index": dow, "name": VARAS[dow], "english": ENGLISH[dow]},
        "sunriseLocal": sr_local.isoformat(timespec="seconds"),
    }


def build(case_id, group, y, mo, d, h, mi, tz, lat, lon, place, ayan="lahiri", utc=None, note=""):
    t = utc if utc is not None else local_to_unix(y, mo, d, h, mi, tz)
    hd = hindu_day(t, lat, lon, tz)
    fx = {
        "id": case_id, "group": group, "note": note,
        "input": {"utc": t, "latitude": lat, "longitude": lon, "place": place, "tz": tz,
                  "localTime": iso_local(t, tz), "ayanamsa": ayan,
                  "locationSource": "locations.db" if place in CITIES else "manual (not in locations.db)"},
        "oracle": {"ephemeris": "swisseph 2.10.03 Moshier", "sunrise": "upperLimbRefracted",
                   "ayanamsaKind": "mean (matches app ephemeris module)",
                   "tamilDayOneRule": "ingress before sunset on its civil date -> day 1, else next date",
                   "lunarNaming": "Sun's sidereal sign at opening new moon + 1; adhika = same sign at both bounding new moons",
                   "tolerance": {"sunriseSunsetSec": 60, "boundarySec": 120}},
        "expected": {"atBirth": angas(t, ayan)},
    }
    sun, moon, _, _ = lons(t, ayan)
    fx["expected"]["atBirthLongitudes"] = {
        "sunTropical": sun, "moonTropical": moon,
        "ayanamsa": swe.get_ayanamsa_ex_ut(jd(t), swe.FLG_MOSEPH | swe.FLG_NONUT)[1]}
    if hd["noSunrise"]:
        fx["expected"]["flags"] = {"noSunrise": True}
        return fx
    ghati_s = t - hd["sunriseUtc"]
    fx["expected"].update({
        "hinduDay": {k: hd[k] for k in ("vara", "sunriseUtc", "sunsetUtc", "nextSunriseUtc",
                                         "isPreviousCivilDay", "sunriseLocal")},
        "atSunrise": angas(hd["sunriseUtc"], ayan),
        "sunriseModes": mode_times(hd["sunriseUtc"], lat, lon),
        "lunarMonth": lunar_month(t, ayan),
        "tamilSolar": tamil_solar(hd["sunriseUtc"], lat, lon, tz, ayan),
        "ghatiSinceSunrise": {"ghati": int(ghati_s // 1440), "vighati": int((ghati_s % 1440) // 24)},
    })
    a, b = (fx["expected"]["atSunrise"]["tithi"]["index"],
            angas(hd["nextSunriseUtc"], ayan)["tithi"]["index"])
    fx["expected"]["flags"] = {"noSunrise": False,
                               "adhikaTithi": a == b,          # same tithi at both sunrises
                               "kshayaTithi": (b - a) % 30 >= 2}  # a tithi fell between them
    return fx


# ---------------------------------------------------------------- lunar month, Tamil solar
LUNAR = ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashwina",
         "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"]
TAMIL_MONTHS = ["Chithirai", "Vaikasi", "Aani", "Aadi", "Avani", "Purattasi", "Aippasi",
                "Karthigai", "Margazhi", "Thai", "Maasi", "Panguni"]
YEAR60 = ["Prabhava", "Vibhava", "Shukla", "Pramodoota", "Prajotpatti", "Angirasa", "Srimukha",
          "Bhava", "Yuva", "Dhatu", "Isvara", "Vegudhanya", "Pramathi", "Vikrama", "Vishu",
          "Chitrabhanu", "Subhanu", "Dharana", "Parthiva", "Viya", "Sarvajit", "Sarvadhari",
          "Virodhi", "Vikruti", "Kara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
          "Hevilambi", "Vilambi", "Vikari", "Sarvari", "Plava", "Subakrit", "Sobhakrit", "Krodhi",
          "Visuvasu", "Parabhava", "Plavanga", "Keelaka", "Soumya", "Sadharana", "Virodhikrit",
          "Paridhabi", "Pramadicha", "Anandha", "Rakshasa", "Nala", "Pingala", "Kalayukthi",
          "Siddharthi", "Raudhri", "Dunmathi", "Dundubhi", "Rudhrothgari", "Raktakshi",
          "Krodhana", "Akshaya"]  # index 0 = Prabhava = Tamil year starting April 1987


def amanta(t, ayan):
    """Amanta month containing t. Named for the sidereal sign the Sun is in at the
    month-opening new moon (Sun in Meena -> Chaitra). Adhika when the Sun is in the
    same sign at both bounding new moons, i.e. no sankranti inside the month."""
    n0 = find_edge("elong", ayan, t, 0, False)
    n1 = find_edge("elong", ayan, t, 0, True)
    r0, r1 = int(angle("sun_sid", n0, ayan) // 30), int(angle("sun_sid", n1, ayan) // 30)
    return {"name": LUNAR[(r0 + 1) % 12], "adhika": r0 == r1, "startUtc": n0, "endUtc": n1}


def lunar_month(t, ayan):
    a = amanta(t, ayan)
    # Purnimanta: shukla paksha as amanta; krishna paksha takes the NEXT amanta month.
    if angle("elong", t, ayan) < 180:
        p = a
    else:
        p = amanta(a["endUtc"] + 3600, ayan)
    return {"amanta": a,
            "purnimanta": {"name": p["name"], "adhika": p["adhika"]}}


def sunset_on(date, lat, lon, tz):
    mid = datetime(date.year, date.month, date.day, tzinfo=ZoneInfo(tz)).timestamp()
    res, tr = swe.rise_trans(jd(mid), swe.SUN, swe.CALC_SET, (lon, lat, 0.0), 1013.25, 15.0, swe.FLG_MOSEPH)
    return None if res < 0 else unix(tr[0])


def day_one(ingress, lat, lon, tz):
    """Civil date that counts as day 1 of the Tamil month: ingress before that
    date's sunset -> that date; otherwise the next date."""
    d = datetime.fromtimestamp(ingress, ZoneInfo(tz)).date()
    ss = sunset_on(d, lat, lon, tz)
    return d if ss is None or ingress < ss else d + timedelta(days=1)


TAMIL_AYANAMSA = "lahiri"  # sankranti always by Lahiri, as printed panchangams do


def tamil_solar(sunrise, lat, lon, tz, ayan):
    ayan = TAMIL_AYANAMSA
    S = datetime.fromtimestamp(sunrise, ZoneInfo(tz)).date()

    def latest(deg_edge_fn, t):
        r = int(angle("sun_sid", t, ayan) // 30)
        return r, find_edge("sun_sid", ayan, t, r * 30, False)

    r, I = latest(None, sunrise + 36 * 3600)
    while day_one(I, lat, lon, tz) > S:
        r = (r - 1) % 12
        I = find_edge("sun_sid", ayan, I - 3600, r * 30, False)
    d1 = day_one(I, lat, lon, tz)
    M = I
    rr = r
    while rr != 0:  # walk back to the latest Mesha ingress
        rr = (rr - 1) % 12
        M = find_edge("sun_sid", ayan, M - 3600, rr * 30, False)
    year = day_one(M, lat, lon, tz).year
    return {"month": TAMIL_MONTHS[r], "date": (S - d1).days + 1,
            "year60Name": YEAR60[(year - 1987) % 60], "ingressUtc": I,
            "day1": d1.isoformat()}


# ---------------------------------------------------------------- cases
def _db_city(name, tz):
    """Exact (non-centroid) city row from locations.db: country+state row, state NOT NULL."""
    import sqlite3
    db = os.path.join(os.path.dirname(__file__), "..", "..", "locations.db")
    c = sqlite3.connect(f"file:{os.path.normpath(db)}?mode=ro", uri=True)
    r = c.execute("SELECT latitude, longitude FROM locations WHERE state = ?", (name,)).fetchone()
    if r is None:
        raise SystemExit(f"{name!r} not in locations.db")
    return (r[0], r[1], tz)


CITIES = {  # DB-backed: exact city rows from locations.db
    "Chennai": _db_city("Chennai", "Asia/Kolkata"),
    "Delhi": _db_city("Delhi", "Asia/Kolkata"),
    "Mumbai": _db_city("Mumbai", "Asia/Kolkata"),
    "Kolkata": _db_city("Kolkata", "Asia/Kolkata"),
    "Bengaluru": _db_city("Bangalore", "Asia/Kolkata"),
    "Hyderabad": _db_city("Hyderabad", "Asia/Kolkata"),
    "Kuala Lumpur": _db_city("Kuala Lumpur", "Asia/Kuala_Lumpur"),
}
# NOT in locations.db as cities (country centroid rows only, which Phase 2 must refuse).
# Exact coordinates, used to test astronomy only.
MANUAL = {
    "Sydney": (-33.8688, 151.2093, "Australia/Sydney"),
    "Cape Town": (-33.9249, 18.4241, "Africa/Johannesburg"),
    "Buenos Aires": (-34.6037, -58.3816, "America/Argentina/Buenos_Aires"),
    "Reykjavik": (64.1466, -21.9426, "Atlantic/Reykjavik"),
}
CITIES_ALL = {**CITIES, **MANUAL}


def cases():
    out = []
    # --- golden: the one chart with full location data in the repo (tests/kp/golden_chart.test.js)
    out.append(build("golden-1986-chennai", "golden", 0, 0, 0, 0, 0, "Asia/Kolkata",
                     *CITIES["Chennai"][:2], "Chennai", utc=529759800,
                     note="1986-10-15 17:00 IST. tests/kp/golden_chart.test.js"))
    for ay in ("raman", "krishnamurti"):
        out.append(build(f"golden-1986-chennai-{ay}", "golden", 0, 0, 0, 0, 0, "Asia/Kolkata",
                         *CITIES["Chennai"][:2], "Chennai", ay, utc=529759800))

    # --- pre-dawn births 00:00-06:00 local (9)
    predawn = [("Chennai", 1990, 6, 21, 0, 10), ("Delhi", 1985, 12, 22, 1, 30),
               ("Mumbai", 2001, 3, 3, 2, 45), ("Kolkata", 1978, 7, 14, 3, 20),
               ("Bengaluru", 2010, 11, 9, 4, 5), ("Hyderabad", 1995, 1, 15, 4, 50),
               ("Delhi", 2022, 6, 21, 5, 5), ("Chennai", 1968, 9, 2, 5, 15),
               ("Kolkata", 2026, 10, 20, 0, 0)]
    for i, (c, y, mo, d, h, mi) in enumerate(predawn):
        lat, lon, tz = CITIES_ALL[c]
        ay = ["lahiri", "raman", "krishnamurti"][i % 3]
        out.append(build(f"predawn-{i+1:02d}-{c.lower().replace(' ', '')}", "predawn",
                         y, mo, d, h, mi, tz, lat, lon, c, ay))

    # --- boundaries +-5 min, Asia/Kolkata, Chennai
    lat, lon, tz = CITIES["Chennai"]
    t = local_to_unix(2003, 5, 1, 12, 0, tz)
    for i in range(3):  # tithi
        b = find_edge("elong", "lahiri", t, 12.0 * (int(angle("elong", t, "lahiri") // 12) + 1), True)
        for tag, off in (("m5", -300), ("p5", 300)):
            out.append(build(f"tithi-boundary-{i+1}-{tag}", "boundary", 0, 0, 0, 0, 0, tz, lat, lon,
                             "Chennai", utc=b + off, note=f"tithi edge {b} {tag}"))
        t = b + 5 * 86400
    t = local_to_unix(2012, 9, 1, 12, 0, tz)
    for i in range(2):  # nakshatra (lahiri) -> 4 cases
        w = 360 / 27
        b = find_edge("moon_sid", "lahiri", t, w * (int(angle("moon_sid", t, "lahiri") // w) + 1), True)
        for tag, off in (("m5", -300), ("p5", 300)):
            out.append(build(f"nakshatra-boundary-{i+1}-{tag}", "boundary", 0, 0, 0, 0, 0, tz, lat, lon,
                             "Chennai", utc=b + off, note=f"nakshatra edge {b} {tag}"))
        t = b + 6 * 86400
    # one more tithi edge, +5 min, at the Purnima/Amavasya wrap (karana Naga/Kimstughna)
    b = find_edge("elong", "lahiri", local_to_unix(2019, 3, 1, 0, 0, tz), 0.0, True)
    out.append(build("amavasya-boundary-p5", "boundary", 0, 0, 0, 0, 0, tz, lat, lon, "Chennai",
                     utc=b + 300, note=f"new moon {b}"))

    # --- Kuala Lumpur around the 1982-01-01 change (UTC+7:30 -> +8:00) (6)
    lat, lon, tz = CITIES["Kuala Lumpur"]
    for i, (y, mo, d, h, mi) in enumerate([(1975, 6, 12, 5, 40), (1979, 11, 3, 2, 15),
                                           (1981, 12, 31, 6, 50), (1982, 1, 1, 0, 10),
                                           (1990, 8, 15, 6, 45), (2005, 3, 5, 3, 30)]):
        out.append(build(f"kl-{i+1}-{y}", "kl", y, mo, d, h, mi, tz, lat, lon, "Kuala Lumpur",
                         note="pre-1982 = UTC+7:30, from 1982-01-01 = UTC+8"))

    # --- southern hemisphere (3) and lat > 60 (1)
    for i, (c, y, mo, d, h, mi) in enumerate([("Sydney", 2015, 10, 10, 4, 0),
                                              ("Cape Town", 1999, 6, 21, 5, 30),
                                              ("Buenos Aires", 2008, 12, 21, 3, 15)]):
        lat, lon, tz = CITIES_ALL[c]
        out.append(build(f"south-{i+1}-{c.lower().replace(' ', '')}", "south", y, mo, d, h, mi,
                         tz, lat, lon, c))
    lat, lon, tz = CITIES_ALL["Reykjavik"]
    out.append(build("highlat-reykjavik", "highlat", 2015, 3, 20, 3, 30, tz, lat, lon, "Reykjavik"))
    return out


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith(".json"):
            os.remove(os.path.join(OUT, f))
    cs = cases()
    for c in cs:
        with open(os.path.join(OUT, c["id"] + ".json"), "w") as fh:
            json.dump(c, fh, indent=2)
            fh.write("\n")
    print(f"wrote {len(cs)} fixtures to {os.path.normpath(OUT)}")
