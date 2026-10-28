import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getSunrise, getSunset } from '../../public/js/kundli/panchanga/index.js';

describe('Sunrise/sunset calculation', () => {
  test('Sunrise returns a Unix timestamp', () => {
    const utc = 946684800;
    const sunrise = getSunrise(utc, 72.88, 19.07);
    assert.ok(typeof sunrise === 'number' || sunrise === null,
      'Sunrise should be a number or null');
  });

  test('Sunset returns a Unix timestamp', () => {
    const utc = 946684800;
    const sunset = getSunset(utc, 72.88, 19.07);
    assert.ok(typeof sunset === 'number' || sunset === null,
      'Sunset should be a number or null');
  });

  test('Sunrise and sunset are on the same day', () => {
    const utc = 946684800;
    const sunrise = getSunrise(utc, 72.88, 19.07);
    const sunset = getSunset(utc, 72.88, 19.07);
    if (sunrise && sunset) {
      // They should be within 24 hours of each other
      assert.ok(Math.abs(sunset - sunrise) < 24 * 60 * 60,
        'Sunrise and sunset should be within 24 hours');
      // Sunset should be after sunrise
      assert.ok(sunset > sunrise, 'Sunset should be after sunrise');
    }
  });
});

describe('Sunrise/sunset of the Vedic day of birth', () => {
  // Chennai, 1986-10-15: sunrise ~05:59 IST, sunset ~17:50 IST
  const CHENNAI = [80.2707, 13.0827];
  const ist = iso => new Date(`${iso}+05:30`).getTime() / 1000;

  test('Sunrise is the one at or before birth, not the next morning', () => {
    const birth = ist('1986-10-15T09:00:00');
    const sunrise = getSunrise(birth, ...CHENNAI);
    assert.ok(sunrise <= birth, 'Sunrise should not be after birth');
    assert.ok(Math.abs(sunrise - ist('1986-10-15T05:59:00')) < 5 * 60,
      `Sunrise should be ~05:59 IST on the 15th, got ${new Date(sunrise * 1000).toISOString()}`);
  });

  test('Evening birth after sunset keeps that day\'s sunrise and sunset', () => {
    const birth = ist('1986-10-15T21:00:00');
    assert.ok(Math.abs(getSunrise(birth, ...CHENNAI) - ist('1986-10-15T05:59:00')) < 5 * 60);
    assert.ok(Math.abs(getSunset(birth, ...CHENNAI) - ist('1986-10-15T17:50:00')) < 5 * 60);
  });

  test('Pre-dawn birth belongs to the previous day\'s sunrise and sunset', () => {
    const birth = ist('1986-10-16T03:00:00');
    assert.ok(Math.abs(getSunrise(birth, ...CHENNAI) - ist('1986-10-15T05:59:00')) < 5 * 60);
    assert.ok(Math.abs(getSunset(birth, ...CHENNAI) - ist('1986-10-15T17:50:00')) < 5 * 60);
  });
});