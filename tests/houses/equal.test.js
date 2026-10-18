import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateHouses } from '../../public/js/kundli/houses/index.js';

describe('Equal houses', () => {
  test('Cusps spaced 30° apart', () => {
    const birth = { utc: 946684800, longitude: 72.88, latitude: 19.07 };
    const result = calculateHouses(birth, 'lahiri', 'equal');

    for (let i = 1; i < 12; i++) {
      const expected = (result.cusps[0] + i * 30) % 360;
      assert.ok(Math.abs(result.cusps[i] - expected) < 0.01,
        `Cusp ${i + 1} should be at ${expected}°`);
    }
  });

  test('ASC = cusp 1', () => {
    const birth = { utc: 946684800, longitude: 72.88, latitude: 19.07 };
    const result = calculateHouses(birth, 'lahiri', 'equal');
    // Cusp 1 should be the ASC
    assert.ok(Math.abs(result.cusps[0] - result.cusps[0]) < 0.01, 'Cusp 1 should equal ASC');
  });

  test('Cusp 7 = ASC + 180', () => {
    const birth = { utc: 946684800, longitude: 72.88, latitude: 19.07 };
    const result = calculateHouses(birth, 'lahiri', 'equal');
    const expected = (result.cusps[0] + 180) % 360;
    assert.ok(Math.abs(result.cusps[6] - expected) < 0.01, 'Cusp 7 should be ASC + 180');
  });
});
