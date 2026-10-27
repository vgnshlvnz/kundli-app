import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computePlanets } from '../../public/js/kundli/ephemeris/index.js';
import { computeVimshottariDasha, getNakshatra, computeBhuktis } from '../../public/js/kundli/dasha/index.js';

describe('Dasha integration: birth data → Moon position → Vimshottari', () => {
  // Golden chart: October 15, 1986, 17:00 IST (11:30 UTC), Chennai, India
  // From tests/ephemeris/ayanamsa.test.js
  const GOLDEN_BIRTH = { utc: 529759800, longitude: 80.2707, latitude: 13.0827 };

  test('Moon position leads to correct nakshatra and first mahadasha', () => {
    // 1. Compute actual sidereal positions from birth data
    const planets = computePlanets(GOLDEN_BIRTH, 'lahiri');
    const moon = planets.find(p => p.name === 'Moon');

    // Moon should be in Pisces (sign 11) at ~0.5° based on ephemeris golden chart
    assert(moon.sign === 11, `Moon should be in Pisces, got sign ${moon.sign}`);
    assert(moon.degreeInSign > 0 && moon.degreeInSign < 2,
      `Moon should be ~0.5° in Pisces, got ${moon.degreeInSign}°`);

    // 2. Get sidereal longitude for dasha calculation
    const moonSiderealLon = moon.siderealLongitude;

    // 3. Determine nakshatra
    const nakshatra = getNakshatra(moonSiderealLon);

    // Moon at 330.4824° (Swiss Ephemeris, Lahiri) → Purva Bhadrapada (320°-333.33°), lord Jupiter
    assert(nakshatra.name === 'Purva Bhadrapada',
      `Moon at ${moonSiderealLon}° should be in Purva Bhadrapada, got ${nakshatra.name}`);
    assert(nakshatra.lord === 'Jupiter',
      `Nakshatra lord should be Jupiter, got ${nakshatra.lord}`);

    // 4. Compute Vimshottari dasha
    const dasha = computeVimshottariDasha(GOLDEN_BIRTH, moonSiderealLon);

    // First mahadasha is Jupiter (lord of Purva Bhadrapada)
    assert(dasha.mahadashas[0].planet === 'Jupiter',
      `First mahadasha should be Jupiter, got ${dasha.mahadashas[0].planet}`);

    // 10.4824° of 13.3333° traversed → (1 - 0.78618) × 16 = 3.42 years of Jupiter left
    assert(Math.abs(dasha.remainingFirstMahadashaYears - 3.421) < 0.01,
      `Remaining first MD should be ~3.42 years, got ${dasha.remainingFirstMahadashaYears}`);

    // Subsequent mahadashas follow Vimshottari order after Jupiter
    const expectedOrder = ['Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu'];
    for (let i = 0; i < 9; i++) {
      assert(dasha.mahadashas[i].planet === expectedOrder[i],
        `Mahadasha ${i} should be ${expectedOrder[i]}, got ${dasha.mahadashas[i].planet}`);
    }
  });

  test('Mahadasha periods are correct durations', () => {
    const planets = computePlanets(GOLDEN_BIRTH, 'lahiri');
    const moon = planets.find(p => p.name === 'Moon');

    const dasha = computeVimshottariDasha(GOLDEN_BIRTH, moon.siderealLongitude);

    // Check that full-period mahadashas have correct lengths
    // After the first partial one, all should be full duration
    const durations = {
      'Moon': 10, 'Mars': 7, 'Rahu': 18, 'Jupiter': 16,
      'Saturn': 19, 'Mercury': 17, 'Ketu': 7, 'Venus': 20, 'Sun': 6
    };

    for (let i = 1; i < 9; i++) {
      const md = dasha.mahadashas[i];
      const expectedDuration = durations[md.planet];
      assert(Math.abs(md.durationYears - expectedDuration) < 0.01,
        `${md.planet} mahadasha should be ${expectedDuration} years, got ${md.durationYears}`);
    }
  });

  test('Bhukti calculations within first mahadasha', () => {
    const planets = computePlanets(GOLDEN_BIRTH, 'lahiri');
    const moon = planets.find(p => p.name === 'Moon');

    const dasha = computeVimshottariDasha(GOLDEN_BIRTH, moon.siderealLongitude);

    // Check bhuktis within first mahadasha (not currentBhuktis, which is only
    // populated when a current mahadasha is found at the query date)
    const md1 = dasha.mahadashas[0]; // Jupiter (partial)
    const bhuktis = computeBhuktis(md1);

    // Bhuktis divide the full 16-year Jupiter period; those that ended before
    // birth are dropped and the one running at birth is cut at birth.
    assert(bhuktis.length >= 1 && bhuktis.length <= 9, `Got ${bhuktis.length} bhuktis`);
    assert.equal(bhuktis[0].start, md1.start, 'First bhukti starts at birth');

    // Every bhukti after the first keeps its full length: (16 / 120) * planet period
    const periods = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
    for (const b of bhuktis.slice(1)) {
      const expected = (16 / 120) * periods[b.planet];
      assert(Math.abs(b.durationYears - expected) < 0.01,
        `${b.planet} bhukti should be ~${expected} years, got ${b.durationYears}`);
    }

    // Bhukti total should equal the remaining mahadasha duration
    let totalBhuktiYears = 0;
    for (const b of bhuktis) {
      totalBhuktiYears += b.durationYears;
    }
    assert(Math.abs(totalBhuktiYears - md1.durationYears) < 0.01,
      `Bhukti total should equal mahadasha duration, got ${totalBhuktiYears} vs ${md1.durationYears}`);
  });
});
