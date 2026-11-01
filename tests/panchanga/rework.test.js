import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computePanchanga, calculatePanchanga } from '../../public/js/kundli/panchanga/index.js';
import { KARANA_NAMES } from '../../public/js/kundli/panchanga/tables.js';
import { elongation, moonSidereal } from '../../public/js/kundli/panchanga/sky.js';

const CHENNAI = { latitude: 13.08268, longitude: 80.270718, timezone: 'Asia/Kolkata' };
const AYANAMSAS = ['lahiri', 'raman', 'krishnamurti'];

describe('Ayanamsa independence (property)', () => {
  // 120 moments across ~5 months, a prime-ish stride so they land all over the lunar cycle
  const moments = Array.from({ length: 120 }, (_, i) => 1_000_000_000 + i * 97_001);

  test('changing the ayanamsa never changes tithi, paksha or karana', () => {
    for (const utc of moments) {
      const [a, ...others] = AYANAMSAS.map(ayanamsa => computePanchanga({ utc, ...CHENNAI }, { ayanamsa }).atBirth);
      for (const o of others) {
        for (const k of ['tithi', 'paksha', 'karana']) assert.deepEqual(o[k], a[k], `${k} at ${utc}`);
      }
    }
  });

  test('changing the ayanamsa does change nakshatra and yoga', () => {
    let nakshatraChanged = 0;
    let yogaChanged = 0;
    for (const utc of moments) {
      const l = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri' }).atBirth;
      const r = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'raman' }).atBirth;
      if (l.nakshatra.index !== r.nakshatra.index) nakshatraChanged++;
      if (l.yoga.index !== r.yoga.index) yogaChanged++;
    }
    // Lahiri and Raman are ~1.4 degrees apart, so ~10% of moments cross a 13.33 degree boundary
    assert.ok(nakshatraChanged > 0, 'nakshatra never changed');
    assert.ok(yogaChanged > 0, 'yoga never changed');
  });

  test('the ayanamsa is required, never defaulted', () => {
    assert.throws(() => computePanchanga({ utc: 0, ...CHENNAI }, {}), TypeError);
    assert.throws(() => computePanchanga({ utc: 0, ...CHENNAI }), TypeError);
    assert.throws(() => calculatePanchanga({ utc: 0, ...CHENNAI }), TypeError);
    assert.throws(() => computePanchanga({ utc: 0, ...CHENNAI }, { ayanamsa: 'nope' }), /Unknown ayanamsa/);
  });
});

describe('Boundary times are root-found, not extrapolated', () => {
  test('the angle is on the edge at every returned start and end', () => {
    const utc = 529759800; // golden chart
    const p = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri' }).atBirth;
    // 30 s is far inside the 0.5 deg/hour Moon speed: error < 0.005 degrees
    const onEdge = (angle, width, t) => {
      const r = angle(t) % width;
      return Math.min(r, width - r);
    };
    assert.ok(onEdge(elongation, 12, p.tithi.startUtc) < 0.005);
    assert.ok(onEdge(elongation, 12, p.tithi.endUtc) < 0.005);
    assert.ok(onEdge(elongation, 6, p.karana.endUtc) < 0.005);
    assert.ok(onEdge(t => moonSidereal(t, 'lahiri'), 360 / 27, p.nakshatra.startUtc) < 0.005);
    assert.ok(onEdge(t => moonSidereal(t, 'lahiri'), 360 / 27, p.nakshatra.endUtc) < 0.005);
    for (const k of ['tithi', 'nakshatra', 'yoga', 'karana']) {
      assert.ok(p[k].startUtc <= utc && utc < p[k].endUtc, `${k} brackets birth`);
    }
  });

  test('tithi and karana nest: a tithi is exactly two karanas', () => {
    const p = computePanchanga({ utc: 529759800, ...CHENNAI }, { ayanamsa: 'lahiri' }).atBirth;
    assert.ok(p.karana.startUtc >= p.tithi.startUtc - 1 && p.karana.endUtc <= p.tithi.endUtc + 1);
    assert.equal(Math.floor(p.karana.index / 2), p.tithi.index);
  });
});

describe('Karana table', () => {
  test('60 half-tithis: 1 Kimstughna, 2-57 movable cycle, 58-60 fixed', () => {
    assert.equal(KARANA_NAMES.length, 60);
    assert.equal(KARANA_NAMES[0], 'Kimstughna');
    assert.deepEqual(KARANA_NAMES.slice(1, 8), ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti']);
    assert.equal(KARANA_NAMES[56], 'Vishti'); // #57 closes the eighth cycle
    assert.deepEqual(KARANA_NAMES.slice(57), ['Shakuni', 'Chatushpada', 'Naga']);
    assert.equal(KARANA_NAMES.filter(n => n === 'Vishti').length, 8);
  });
});

describe('Hindu day', () => {
  test('a 03:00 birth belongs to the previous civil day, with the right ghati', () => {
    // 2010-11-09 03:00 IST Chennai; sunrise that Hindu day was on 2010-11-08
    const utc = Date.UTC(2010, 10, 8, 21, 30) / 1000;
    const p = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.equal(p.hinduDay.isPreviousCivilDay, true);
    assert.equal(p.hinduDay.vara.english, 'Monday');
    const sec = utc - p.hinduDay.sunriseUtc;
    assert.equal(p.ghatiSinceSunrise.ghati, Math.floor(sec / 1440));
    assert.ok(p.ghatiSinceSunrise.ghati > 40, 'late in the Hindu day, ghati > 40');
    assert.ok(p.hinduDay.sunriseUtc <= utc && utc < p.hinduDay.nextSunriseUtc);
  });

  test('a post-sunrise birth is the same civil day', () => {
    const utc = Date.UTC(2010, 10, 9, 8, 0) / 1000; // 13:30 IST
    const p = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.equal(p.hinduDay.isPreviousCivilDay, false);
    assert.equal(p.hinduDay.vara.english, 'Tuesday');
  });

  test('atSunrise differs from atBirth when the angas change in between', () => {
    const p = computePanchanga({ utc: 529759800, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.ok(p.atSunrise.tithi.startUtc <= p.hinduDay.sunriseUtc && p.hinduDay.sunriseUtc < p.atSunrise.tithi.endUtc);
  });

  test('horaLord: first hora of Sunday is the Sun, then Venus', () => {
    const sunday = Date.UTC(2010, 10, 7, 6, 0) / 1000; // Sunday 2010-11-07, 11:30 IST
    const base = computePanchanga({ utc: sunday, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.equal(base.hinduDay.vara.english, 'Sunday');
    const at = secs => computePanchanga({ utc: base.hinduDay.sunriseUtc + secs, ...CHENNAI }, { ayanamsa: 'lahiri' }).horaLord;
    assert.equal(at(60), 'Sun');
    assert.equal(at(3600 + 60), 'Venus');
    assert.equal(at(7 * 3600 + 60), 'Sun');
  });
});

describe('Sunrise modes', () => {
  test('upper limb refracted < centre refracted < centre no refraction (sunrise), reverse for sunset', () => {
    const utc = Date.UTC(2010, 10, 9, 6, 0) / 1000;
    const get = sunriseMode => computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri', sunriseMode }).hinduDay;
    const [a, b, c] = [get('upperLimbRefracted'), get('centreRefracted'), get('centreNoRefraction')];
    assert.ok(a.sunriseUtc < b.sunriseUtc && b.sunriseUtc < c.sunriseUtc);
    assert.ok(a.sunsetUtc > b.sunsetUtc && b.sunsetUtc > c.sunsetUtc);
  });

  test('the default is upperLimbRefracted and an unknown mode is rejected', () => {
    const utc = Date.UTC(2010, 10, 9, 6, 0) / 1000;
    const d = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.equal(d.settings.sunriseMode, 'upperLimbRefracted');
    assert.deepEqual(d.hinduDay, computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri', sunriseMode: 'upperLimbRefracted' }).hinduDay);
    assert.throws(() => computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri', sunriseMode: 'x' }), RangeError);
  });
});

describe('Polar and refused locations', () => {
  const TROMSO = { latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo' };

  for (const [label, utc] of [['midnight sun', Date.UTC(2023, 5, 21, 10) / 1000], ['polar night', Date.UTC(2023, 11, 21, 10) / 1000]]) {
    test(`${label}: flags.noSunrise, nulls, no throw`, () => {
      const p = computePanchanga({ utc, ...TROMSO }, { ayanamsa: 'lahiri' });
      assert.equal(p.flags.noSunrise, true);
      assert.equal(p.atSunrise, null);
      assert.equal(p.hinduDay.vara, null);
      assert.equal(p.hinduDay.sunriseUtc, null);
      assert.equal(p.ghatiSinceSunrise, null);
      assert.equal(p.tamilSolar, null);
      assert.ok(p.atBirth.tithi.name, 'angas at birth are still reported');
      assert.ok(p.lunarMonth.name);
    });

    test(`${label}: the deprecated flat API still renders`, () => {
      const p = calculatePanchanga({ utc, ...TROMSO }, 'lahiri');
      assert.equal(p.sunriseSunset.sunriseUtc, null);
      assert.ok(p.vara.name);
    });
  }

  test('a centroid location is refused', () => {
    const err = (() => { try { computePanchanga({ utc: 0, ...CHENNAI, centroid: true }, { ayanamsa: 'lahiri' }); } catch (e) { return e; } })();
    assert.equal(err?.code, 'CENTROID_LOCATION');
    assert.throws(() => calculatePanchanga({ utc: 0, ...CHENNAI, centroid: true }, 'lahiri'), { code: 'CENTROID_LOCATION' });
  });
});

describe('Lunar month and Tamil solar', () => {
  test('adhika Shravana 2023 is flagged, and the nija Shravana that follows is not', () => {
    // Widely published: 2023 had an intercalary Shravana, 18 Jul - 16 Aug (amanta), then nija Shravana to 15 Sep.
    const at = (m, d) => computePanchanga({ utc: Date.UTC(2023, m, d, 6) / 1000, ...CHENNAI }, { ayanamsa: 'lahiri' }).lunarMonth;
    assert.deepEqual([at(7, 1).name, at(7, 1).adhika], ['Shravana', true]);
    assert.deepEqual([at(8, 1).name, at(8, 1).adhika], ['Shravana', false]);
    assert.deepEqual([at(5, 10).name, at(5, 10).adhika], ['Jyeshtha', false]);
  });

  test('Tamil date 1 falls on or just after the sankranti day (sunset rule)', () => {
    // Aani 1 of 2022: Mithuna sankranti on 2022-06-15 morning IST -> day 1 is 15 June
    const day = Date.UTC(2022, 5, 15, 5, 0) / 1000; // 10:30 IST
    const p = computePanchanga({ utc: day, ...CHENNAI }, { ayanamsa: 'lahiri' }).tamilSolar;
    assert.deepEqual(p, { month: 'Aani', date: 1, year60Name: 'Subakrit' });
    const prev = computePanchanga({ utc: day - 86400, ...CHENNAI }, { ayanamsa: 'lahiri' }).tamilSolar;
    assert.equal(prev.month, 'Vaikasi');
  });

  test('the Tamil month does not depend on the chart ayanamsa', () => {
    const utc = Date.UTC(1986, 9, 15, 11, 30) / 1000;
    const results = AYANAMSAS.map(ayanamsa => computePanchanga({ utc, ...CHENNAI }, { ayanamsa }).tamilSolar);
    assert.deepEqual(results[1], results[0]);
    assert.deepEqual(results[2], results[0]);
  });
});
