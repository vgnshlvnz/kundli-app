import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computePlanets } from '../../public/js/kundli/ephemeris/index.js';
import { computeVimshottariDasha, getNakshatra, computeBhuktis } from '../../public/js/kundli/dasha/index.js';

describe('Dasha integration: birth data → Moon position → Vimshottari', () => {
  // Golden chart: October 15, 1986, 10:00 AM, Chennai, India
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

    // Moon at ~0.5° in Pisces → sidereal longitude ~330.5°
    // This should fall in Purva Bhadrapada (320°-333.33°) or Uttara Bhadrapada (333.33°-346.67°)
    // Purva Bhadrapada lord is Moon, Uttara Bhadrapada lord is also Moon
    assert(['Purva Bhadrapada', 'Uttara Bhadrapada'].includes(nakshatra.name),
      `Moon at ${moonSiderealLon}° should be in Purva/Uttara Bhadrapada, got ${nakshatra.name}`);

    // Both nakshatras have Moon as lord
    assert(nakshatra.lord === 'Moon',
      `Nakshatra lord should be Moon, got ${nakshatra.lord}`);

    // 4. Compute Vimshottari dasha
    const dasha = computeVimshottariDasha(GOLDEN_BIRTH, moonSiderealLon);

    // First mahadasha should be Moon (lord of Purva/Uttara Bhadrapada)
    assert(dasha.mahadashas[0].planet === 'Moon',
      `First mahadasha should be Moon, got ${dasha.mahadashas[0].planet}`);

    // Remaining first mahadasha should be less than full 10 years
    assert(dasha.remainingFirstMahadashaYears > 0 && dasha.remainingFirstMahadashaYears < 10,
      `Remaining first MD should be 0-10 years, got ${dasha.remainingFirstMahadashaYears}`);

    // Subsequent mahadashas follow Vimshottari order after Moon:
    // Moon → Mars → Rahu → Jupiter → Saturn → Mercury → Ketu → Venus → Sun
    const expectedOrder = ['Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun'];
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
    const md1 = dasha.mahadashas[0]; // Moon (partial)
    const bhuktis = computeBhuktis(md1);

    // Compute bhukti duration for validation
    // In Moon mahadasha, first bhukti is Moon itself:
    // bhukti duration = (md_duration / 120) * planet_period
    const moonBhuktiYears = (md1.durationYears / 120) * 10;

    // First bhukti should be Moon
    assert(bhuktis[0].planet === 'Moon',
      `First bhukti in Moon MD should be Moon, got ${bhuktis[0].planet}`);

    assert(Math.abs(bhuktis[0].durationYears - moonBhuktiYears) < 0.01,
      `Moon bhukti should be ~${moonBhuktiYears} years, got ${bhuktis[0].durationYears}`);

    // Bhukti total should equal mahadasha duration
    let totalBhuktiYears = 0;
    for (const b of bhuktis) {
      totalBhuktiYears += b.durationYears;
    }
    assert(Math.abs(totalBhuktiYears - md1.durationYears) < 0.01,
      `Bhukti total should equal mahadasha duration, got ${totalBhuktiYears} vs ${md1.durationYears}`);
  });
});
