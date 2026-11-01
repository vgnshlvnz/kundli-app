import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { computePanchanga } from '../../public/js/kundli/panchanga/index.js';

// Fixtures come from scripts/oracle/gen_fixtures.py (pyswisseph; dev-only, regenerate with that script).
const DIR = new URL('../fixtures/panchanga/', import.meta.url);
const fixtures = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()
  .map(f => JSON.parse(fs.readFileSync(new URL(f, DIR), 'utf8')));

const SUNRISE_TOL = 60;  // seconds
const BOUNDARY_TOL = 120;

const near = (actual, expected, tol, what) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} vs ${expected} (off by ${actual - expected} s)`);

function checkAngas(actual, expected, label) {
  for (const key of ['tithi', 'paksha', 'nakshatra', 'yoga', 'karana']) {
    assert.equal(actual[key].index, expected[key].index, `${label} ${key} index`);
    assert.equal(actual[key].name, expected[key].name, `${label} ${key} name`);
    near(actual[key].startUtc, expected[key].startUtc, BOUNDARY_TOL, `${label} ${key} start`);
    near(actual[key].endUtc, expected[key].endUtc, BOUNDARY_TOL, `${label} ${key} end`);
  }
  assert.equal(actual.pada, expected.pada, `${label} pada`);
}

assert.ok(fixtures.length >= 30, 'expected the oracle fixtures to be present');

describe('Panchanga against the pyswisseph oracle', () => {
  for (const f of fixtures) {
    test(f.id, () => {
      const { input: i, expected: e } = f;
      const birth = { utc: i.utc, latitude: i.latitude, longitude: i.longitude, timezone: i.tz };
      const settings = { ayanamsa: i.ayanamsa };
      const p = computePanchanga(birth, settings);

      checkAngas(p.atBirth, e.atBirth, 'atBirth');
      assert.equal(p.flags.noSunrise, e.flags.noSunrise);
      if (e.flags.noSunrise) return;

      const h = e.hinduDay;
      near(p.hinduDay.sunriseUtc, h.sunriseUtc, SUNRISE_TOL, 'sunrise');
      near(p.hinduDay.sunsetUtc, h.sunsetUtc, SUNRISE_TOL, 'sunset');
      near(p.hinduDay.nextSunriseUtc, h.nextSunriseUtc, SUNRISE_TOL, 'next sunrise');
      assert.deepEqual(p.hinduDay.vara, h.vara, 'vara');
      assert.equal(p.hinduDay.isPreviousCivilDay, h.isPreviousCivilDay, 'isPreviousCivilDay');

      checkAngas(p.atSunrise, e.atSunrise, 'atSunrise');

      // ghati follows our sunrise, which is allowed to differ from the oracle's by a minute (~3 vighati)
      const vighati = x => x.ghati * 60 + x.vighati;
      assert.ok(Math.abs(vighati(p.ghatiSinceSunrise) - vighati(e.ghatiSinceSunrise)) <= 3, 'ghati');

      assert.equal(p.flags.adhikaTithi, e.flags.adhikaTithi, 'adhika tithi');
      assert.equal(p.flags.kshayaTithi, e.flags.kshayaTithi, 'kshaya tithi');

      const amanta = computePanchanga(birth, { ...settings, lunarSystem: 'amanta' }).lunarMonth;
      assert.deepEqual([amanta.name, amanta.adhika], [e.lunarMonth.amanta.name, e.lunarMonth.amanta.adhika], 'amanta');
      const purni = computePanchanga(birth, { ...settings, lunarSystem: 'purnimanta' }).lunarMonth;
      assert.deepEqual([purni.name, purni.adhika], [e.lunarMonth.purnimanta.name, e.lunarMonth.purnimanta.adhika], 'purnimanta');

      assert.deepEqual(p.tamilSolar, {
        month: e.tamilSolar.month, date: e.tamilSolar.date, year60Name: e.tamilSolar.year60Name
      }, 'tamil solar');

      for (const mode of ['centreRefracted', 'centreNoRefraction']) {
        // Query mid-day so a birth within minutes of sunrise cannot fall on either side of the mode's sunrise.
        const midday = { ...birth, utc: h.sunriseUtc + 6 * 3600 };
        const m = computePanchanga(midday, { ...settings, sunriseMode: mode }).hinduDay;
        near(m.sunriseUtc, e.sunriseModes[mode].sunriseUtc, SUNRISE_TOL, `${mode} sunrise`);
        near(m.sunsetUtc, e.sunriseModes[mode].sunsetUtc, SUNRISE_TOL, `${mode} sunset`);
      }
    });
  }
});
