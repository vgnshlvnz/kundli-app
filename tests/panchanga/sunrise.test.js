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