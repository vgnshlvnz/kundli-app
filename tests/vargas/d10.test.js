import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeVarga } from '../../public/js/kundli/vargas/index.js';

describe('D10 Dasamsa - career chart', () => {
  test('Each 3° segment maps to one dasamsa sign', () => {
    // At 0° in Aries → dasamsa sign 0 (Aries)
    const planets = [{ name: 'Test', longitude: 0 }];
    const result = computeVarga(planets, 0, 10);
    assert.ok(result.planets[0].sign === 0, '0° Aries → dasamsa sign 0');

    // At 3° in Aries → dasamsa sign 1 (Taurus)
    const planets3 = [{ name: 'Test', longitude: 3 }];
    const result3 = computeVarga(planets3, 0, 10);
    assert.ok(result3.planets[0].sign === 1, '3° Aries → dasamsa sign 1');

    // At 6° in Aries → dasamsa sign 2 (Gemini)
    const planets6 = [{ name: 'Test', longitude: 6 }];
    const result6 = computeVarga(planets6, 0, 10);
    assert.ok(result6.planets[0].sign === 2, '6° Aries → dasamsa sign 2');
  });

  test('Within dasamsa segment, degree scales 0-30', () => {
    // At 0.5° in Aries → dasamsa sign 0, degree 5
    const planets = [{ name: 'Test', longitude: 0.5 }];
    const result = computeVarga(planets, 0, 10);
    assert.ok(result.planets[0].sign === 0, '0.5° → dasamsa sign 0');
    assert.ok(result.planets[0].degree === 5, '0.5° → 5° within dasamsa sign');
  });

  test('Full sign completes 10 dasamsa signs', () => {
    // 30° in one sign = 10 * 3° = 10 dasamsa signs
    const planets = [{ name: 'Test', longitude: 29.9 }];
    const result = computeVarga(planets, 0, 10);
    assert.ok(result.planets[0].sign === 9, '29.9° → dasamsa sign 9');
  });

  test('Ascendant dasamsa is calculated', () => {
    const planets = [];
    const result = computeVarga(planets, 15, 10); // 15° Aries
    // 15° is in the 5th 3° segment, so dasamsa sign 5
    assert.ok(result.ascendant >= 150 && result.ascendant < 180,
      'Asc at 15° Aries should be in dasamsa sign 5 (Venus)');
  });
});
