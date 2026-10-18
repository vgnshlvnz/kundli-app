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

  test('Krishnamurti ayanamsa is slightly different from Lahiri', () => {
    const lahiri = ayanamsa(j2000, 'lahiri');
    const krish = ayanamsa(j2000, 'krishnamurti');

    // Difference should be small but non-zero
    assert(lahiri !== krish, `Lahiri and Krishnamurti should differ`);
    assert(Math.abs(lahiri - krish) < 0.1, `Difference should be < 0.1°`);
  });

  test('Raman ayanamsa is different from both', () => {
    const lahiri = ayanamsa(j2000, 'lahiri');
    const raman = ayanamsa(j2000, 'raman');

    assert(lahiri !== raman, `Lahiri and Raman should differ`);
    assert(Math.abs(lahiri - raman) < 0.1, `Difference should be < 0.1°`);
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

  test('All 7 planets have positions', () => {
    const pos = tropicalLongitudes(j2000);
    assert(Object.keys(pos).length === 7, `Should have 7 planets, got ${Object.keys(pos).length}`);
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

describe('Golden chart: Oct 15 1986 10:00 Chennai (Lahiri)', () => {
  test('Sun in Virgo ~28°', () => {
    const planets = computePlanets(GOLDEN_BIRTH, GOLDEN_AY);
    const sun = planets.find(p => p.name === 'Sun');
    // Expected: Virgo (sign 5), ~28°
    assert(sun.sign === 5, `Sun should be in Virgo (sign 5), got sign ${sun.sign}`);
    assert(sun.degreeInSign > 26 && sun.degreeInSign < 30,
      `Sun should be ~28° in Virgo, got ${sun.degreeInSign}°`);
  });

  test('Moon in Pisces ~0.5°', () => {
    const planets = computePlanets(GOLDEN_BIRTH, GOLDEN_AY);
    const moon = planets.find(p => p.name === 'Moon');
    // Expected: Pisces (sign 11), ~0.5°
    assert(moon.sign === 11, `Moon should be in Pisces (sign 11), got sign ${moon.sign}`);
    assert(moon.degreeInSign > 0 && moon.degreeInSign < 2,
      `Moon should be ~0.5° in Pisces, got ${moon.degreeInSign}°`);
  });

  test('Mars in Aquarius ~25°', () => {
    const planets = computePlanets(GOLDEN_BIRTH, GOLDEN_AY);
    const mars = planets.find(p => p.name === 'Mars');
    // Expected: Aquarius (sign 10), ~25°
    assert(mars.sign === 10, `Mars should be in Aquarius (sign 10), got sign ${mars.sign}`);
    assert(mars.degreeInSign > 23 && mars.degreeInSign < 27,
      `Mars should be ~25° in Aquarius, got ${mars.degreeInSign}°`);
  });

  test('All planets have valid sign/degree in range', () => {
    const planets = computePlanets(GOLDEN_BIRTH, GOLDEN_AY);
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