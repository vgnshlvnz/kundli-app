import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { ayanamsa, tropicalLongitudes, computePlanets, meanNode, trueNode } from '../../public/js/kundli/ephemeris/index.js';

describe('Ayanamsa', () => {
  // Known JHora ayanamsa values at key epochs
  // J1900.0 = January 0, 1900 12:00:00 UT = Unix timestamp -2208988800
  // J2000.0 = January 1, 2000 12:00:00 UT = Unix timestamp 946728000
  // 2050.0  = January 1, 2050 12:00:00 UT = Unix timestamp 2524608000

  const j1900 = -2208988800;
  const j2000 = 946728000;
  const year2050 = 2524608000;

  test('Lahiri ayanamsa at J2000.0 is ~23° 54\'', () => {
    const ay = ayanamsa(j2000, 'lahiri');
    // Expected: ~23.90625° (23° 54' 22.5")
    assert(ay > 23.8 && ay < 24.0, `Lahiri at J2000 should be ~23.9°, got ${ay}`);
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

  test('Sun longitude at J2000.0 is near 280°', () => {
    const pos = tropicalLongitudes(j2000);
    assert(pos.Sun.longitude > 270 && pos.Sun.longitude < 290,
      `Sun at J2000 should be ~280°, got ${pos.Sun.longitude}`);
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

  test('Mean and true nodes are close', () => {
    const mean = meanNode(j2000);
    const trueNodeVal = trueNode(j2000);

    // Difference should be small (< 1.5°) — true node varies around mean node
    // throughout the lunar month due to orbital perturbations
    let diff = Math.abs(mean - trueNodeVal);
    if (diff > 180) diff = 360 - diff;
    assert(diff < 1.5, `Mean/true node difference should be < 1.5°, got ${diff}`);
  });
});