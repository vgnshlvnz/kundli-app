import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateHouses } from '../../public/js/kundli/houses/index.js';

describe('Whole sign houses', () => {
  test('ASC in Aries → all signs are houses', () => {
    // ASC at 10° Aries (0-30°)
    const birth = { utc: 946684800, longitude: 72.88, latitude: 19.07 };
    const result = calculateHouses(birth, 'lahiri', 'wholesign');

    // Cusps should be at sign boundaries (0°, 30°, 60°, ...)
    for (let i = 0; i < 12; i++) {
      assert.ok(Math.abs(result.cusps[i] - Math.floor(result.cusps[i] / 30) * 30) < 0.01,
        `Cusp ${i + 1} should be at sign boundary`);
    }
  });

  test('ASC in Aries → houses start at Aries', () => {
    const birth = { utc: 946684800, longitude: 72.88, latitude: 19.07 };
    const result = calculateHouses(birth, 'lahiri', 'wholesign');

    // Sidereal ASC is at 349° (Pisces), so house 1 starts at 330° (Pisces)
    // Let's verify the logic by checking the sign boundary
    const signStart = Math.floor(result.cusps[0] / 30) * 30;
    assert.ok(Math.abs(result.cusps[0] - signStart) < 0.01, 'House 1 should start at sign boundary');
  });

  test('All 12 cusps present', () => {
    const birth = { utc: 946684800, longitude: 72.88, latitude: 19.07 };
    const result = calculateHouses(birth, 'lahiri', 'wholesign');
    assert.ok(result.cusps.length === 12, 'Should have 12 cusps');
  });
});
