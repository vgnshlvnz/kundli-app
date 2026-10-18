import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeVarga } from '../../public/js/kundli/vargas/index.js';

describe('D3 Drekkana - siblings and courage', () => {
  test('Each 10° segment maps to one drekkana sign', () => {
    // At 0° in Aries → drekkana sign determined by lord table
    const planets = [{ name: 'Test', longitude: 0 }];
    const result = computeVarga(planets, 0, 3);
    assert.ok(result.planets[0].sign >= 0 && result.planets[0].sign < 12,
      'Drekkana sign should be valid (0-11)');
    // Mars rules first drekkana of Aries → sign 1 (Mars)
    assert.ok(result.planets[0].sign === 1, '0° Aries → Mars drekkana (sign 1)');
  });

  test('Three drekkana segments per sign', () => {
    // First 10° of Aries → Mars
    const r1 = computeVarga([{ name: 'Test', longitude: 5 }], 0, 3);
    assert.ok(r1.planets[0].sign === 1, '0-10° Aries → Mars drekkana');

    // Second 10° of Aries → Sun
    const r2 = computeVarga([{ name: 'Test', longitude: 15 }], 0, 3);
    assert.ok(r2.planets[0].sign === 0, '10-20° Aries → Sun drekkana');

    // Third 10° of Aries → Mercury
    const r3 = computeVarga([{ name: 'Test', longitude: 25 }], 0, 3);
    assert.ok(r3.planets[0].sign === 4, '20-30° Aries → Mercury drekkana');
  });

  test('Drekkana longitude is at sign boundary', () => {
    const planets = [{ name: 'Test', longitude: 15 }];
    const result = computeVarga(planets, 0, 3);
    assert.ok(result.planets[0].longitude % 30 === 0,
      'Drekkana longitude should be at sign boundary');
  });

  test('Ascendant drekkana is calculated', () => {
    const planets = [];
    const result = computeVarga(planets, 5, 3); // 5° Aries
    assert.ok(result.ascendant !== undefined, 'Ascendant should have drekkana');
    // 5° is in first drekkana of Aries → Mars
    assert.ok(result.ascendant === 30, 'Asc at 5° Aries → Mars drekkana (30°)');
  });
});
