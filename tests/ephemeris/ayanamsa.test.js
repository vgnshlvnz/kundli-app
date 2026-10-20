import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { ayanamsa, tropicalLongitudes, computePlanets, meanNode, trueNode } from '../../public/js/kundli/ephemeris/index.js';

// Golden chart: October 15, 1986, 10:00 AM, Chennai, India (13.0827°N, 80.2707°E)
// Unix timestamp: 529759800 (UTC)
const GOLDEN_BIRTH = { utc: 529759800, longitude: 80.2707, latitude: 13.0827 };
const GOLDEN_AY = 'lahiri';

describe('Ayanamsa', () => {
  // Known JHora ayanamsa values at key epochs
  // J1900.0 = January 0, 1900 12:00:00 UT = Unix timestamp -2208988800
  // J2000.0 = January 1, 2000 12:00:00 UT = Unix timestamp 946728000
  // 2050.0  = January 1, 2050 12:00:00 UT = Unix timestamp 2524608000

  const j1900 = -2208988800;
  const j2000 = 946728000;
  const year2050 = 2524608000;

  test('Lahiri ayanamsa at J2000.0 is 23.85733° ± 0.00001°', () => {
    const ay = ayanamsa(j2000, 'lahiri');
    // Swiss Ephemeris formula constant: 23.857329226° at t=0
    assert(Math.abs(ay - 23.85733) < 0.00001, `Lahiri at J2000 should be 23.85733°, got ${ay}`);
  });

  test('Lahiri ayanamsa increases over time', () => {
    const ay1900 = ayanamsa(j1900, 'lahiri');
    const ay2000 = ayanamsa(j2000, 'lahiri');
    const ay2050 = ayanamsa(year2050, 'lahiri');

    assert(ay2000 > ay1900, `Ayanamsa should increase: J1900=${ay1900} J2000=${ay2000}`);
    assert(ay2050 > ay2000, `Ayanamsa should increase: J2000=${ay2000} J2050=${ay2050}`);
  });

  // Offsets from Swiss Ephemeris 2.10 (SE_SIDM_KRISHNAMURTI / SE_SIDM_RAMAN), constant over 1900-2100
  test('Krishnamurti ayanamsa is Lahiri - 0.096852°', () => {
    const diff = ayanamsa(j2000, 'lahiri') - ayanamsa(j2000, 'krishnamurti');
    assert(Math.abs(diff - 0.096852) < 1e-6, `Lahiri - Krishnamurti should be 0.096852°, got ${diff}`);
  });

  test('Raman ayanamsa is Lahiri - 1.446301°', () => {
    const diff = ayanamsa(j2000, 'lahiri') - ayanamsa(j2000, 'raman');
    assert(Math.abs(diff - 1.446301) < 1e-6, `Lahiri - Raman should be 1.446301°, got ${diff}`);
  });
});

describe('Tropical positions', () => {
  const j2000 = 946728000;

  test('Sun longitude at J2000.0 is 280.46° ± 0.1°', () => {
    const pos = tropicalLongitudes(j2000);
    // Swiss Ephemeris: 280.460095° at J2000.0
    // astronomy-engine is accurate to ~5 arcmin for planets
    assert(Math.abs(pos.Sun.longitude - 280.46) < 0.1,
      `Sun at J2000 should be 280.46°, got ${pos.Sun.longitude}`);
  });

  test('Moon position is valid', () => {
    const pos = tropicalLongitudes(j2000);
    assert(pos.Moon.longitude >= 0 && pos.Moon.longitude < 360,
      `Moon longitude should be 0-360°, got ${pos.Moon.longitude}`);
  });

  test('All 7 planets and both nodes have positions', () => {
    const pos = tropicalLongitudes(j2000);
    assert.deepEqual(Object.keys(pos).sort(),
      ['Jupiter', 'Ketu', 'Mars', 'Mercury', 'Moon', 'Rahu', 'Saturn', 'Sun', 'Venus']);
    const ketuMinusRahu = (pos.Ketu.longitude - pos.Rahu.longitude + 360) % 360;
    assert(Math.abs(ketuMinusRahu - 180) < 1e-9, 'Ketu should be opposite Rahu');
  });
});

describe('Sidereal positions', () => {
  const j2000 = 946728000;

  test('Sidereal longitude = tropical - ayanamsa (mod 360)', () => {
    const tropical = tropicalLongitudes(j2000);
    const ay = ayanamsa(j2000, 'lahiri');

    const sid = ((tropical.Sun.longitude - ay) % 360 + 360) % 360;

    // Verify computePlanets gives same result
    const planets = computePlanets({ utc: j2000, longitude: 0, latitude: 0 }, 'lahiri');
    const sunPlanet = planets.find(p => p.name === 'Sun');

    assert(Math.abs(sunPlanet.siderealLongitude - sid) < 0.000001,
      `Sidereal should match formula: planet=${sunPlanet.siderealLongitude} formula=${sid}`);
  });

  test('Retrograde flag is set based on speed', () => {
    const planets = computePlanets({ utc: j2000, longitude: 0, latitude: 0 }, 'lahiri');

    // Planets with negative speed should be retrograde
    for (const p of planets) {
      const tropical = tropicalLongitudes(j2000);
      if (tropical[p.name].speed < 0) {
        assert(p.retrograde === true, `${p.name} should be retrograde`);
      } else {
        assert(p.retrograde === false, `${p.name} should not be retrograde`);
      }
    }
  });
});

describe('Lunar nodes', () => {
  const j2000 = 946728000;

  test('Mean node is in valid range', () => {
    const node = meanNode(j2000);
    assert(node >= 0 && node < 360, `Mean node should be 0-360°, got ${node}`);
  });

  test('True node is in valid range', () => {
    const node = trueNode(j2000);
    assert(node >= 0 && node < 360, `True node should be 0-360°, got ${node}`);
  });

  test('Mean and true nodes are close (< 1.5° at J2000.0)', () => {
    const mean = meanNode(j2000);
    const trueNodeVal = trueNode(j2000);

    // True node varies around mean node throughout the lunar month
    // Actual difference at J2000.0 is ~1.09°
    let diff = Math.abs(mean - trueNodeVal);
    if (diff > 180) diff = 360 - diff;
    assert(diff < 1.5, `Mean/true node difference should be < 1.5°, got ${diff}`);
  });
});

// Reference: Swiss Ephemeris 2.10.03 (Moshier), Lahiri, mean node.
// GOLDEN_BIRTH is 1986-10-15 11:30 UTC = 17:00 IST, Chennai.
const GOLDEN_SIDEREAL = {
  Sun: [178.1442, false], Moon: [330.4824, false], Mars: [279.9370, false],
  Mercury: [201.6716, false], Jupiter: [320.2547, true], Venus: [206.7236, false],
  Saturn: [222.9791, false], Rahu: [356.9261, true]
};

describe('Golden chart: Oct 15 1986 17:00 IST Chennai (Lahiri) vs Swiss Ephemeris', () => {
  const planets = computePlanets(GOLDEN_BIRTH, GOLDEN_AY);

  for (const [name, [expected, retro]] of Object.entries(GOLDEN_SIDEREAL)) {
    test(`${name} within 1' of Swiss Ephemeris`, () => {
      const p = planets.find(x => x.name === name);
      const diff = Math.abs(((p.siderealLongitude - expected + 540) % 360) - 180) * 60;
      assert(diff < 1, `${name}: expected ${expected}°, got ${p.siderealLongitude}° (${diff.toFixed(2)}' off)`);
      assert.equal(p.retrograde, retro, `${name} retrograde should be ${retro}`);
    });
  }

  test('Mars is in Capricorn, not the heliocentric Aquarius', () => {
    assert.equal(planets.find(p => p.name === 'Mars').sign, 9);
  });

  test('All planets have valid sign/degree in range', () => {
    for (const p of planets) {
      assert(p.sign >= 0 && p.sign < 12,
        `${p.name} sign should be 0-11, got ${p.sign}`);
      assert(p.degreeInSign >= 0 && p.degreeInSign < 30,
        `${p.name} degreeInSign should be 0-30, got ${p.degreeInSign}`);
      assert(p.nakshatra === null, `${p.name} nakshatra should be null (computed later)`);
      assert(p.pada === null, `${p.name} pada should be null (computed later)`);
    }
  });
});
