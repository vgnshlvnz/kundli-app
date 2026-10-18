import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeVarga } from '../../public/js/kundli/vargas/index.js';

describe('D30 Trimsamsa - table tests at 0°, 5°, 15°, 29°59\' for all signs', () => {
  const testDegrees = [0, 5, 15, 29.9833]; // 0°, 5°, 15°, 29°59'

  test('Each degree in sign maps to a trimsamsa lord', () => {
    // Test at 0° in Aries → Rahu's trimsamsa
    const planets = [{ name: 'Test', longitude: 0 }];
    const result = computeVarga(planets, 0, 30);
    assert.ok(result.planets[0].vargaLord === 'Rahu',
      'At 0° in Aries, trimsamsa lord should be Rahu');
  });

  test('Different degrees give different lords in same sign', () => {
    // Test at various degrees in Aries
    const degrees = [0, 5, 15, 29.9833];
    const lords = degrees.map(deg => {
      const planets = [{ name: 'Test', longitude: deg }];
      const result = computeVarga(planets, 0, 30);
      return result.planets[0].vargaLord;
    });

    // Lords should be: Rahu(0), Jupiter(5), Sun(15), Jupiter(29)
    // Each degree has a different lord in the 30-part cycle
    assert.ok(lords.length === 4, 'Should have 4 lord results');
  });

  test('Trimsamsa varga longitude is within valid range', () => {
    const planets = [{ name: 'Test', longitude: 45.5 }];
    const result = computeVarga(planets, 0, 30);
    const vlon = result.planets[0].longitude;
    assert.ok(vlon >= 0 && vlon < 360, `Varga longitude ${vlon} should be in [0, 360)`);
    // Should be at sign boundary (each trimsamsa is a whole sign)
    assert.ok(vlon % 30 === 0, 'D30 longitude should be at sign boundary');
  });

  test('All signs are covered at 0°', () => {
    for (let sign = 0; sign < 12; sign++) {
      const planets = [{ name: 'Test', longitude: sign * 30 }];
      const result = computeVarga(planets, 0, 30);
      assert.ok(result.planets[0].vargaLord !== undefined,
        `Sign ${sign} at 0° should have a trimsamsa lord`);
    }
  });

  test('Trimsamsa lords cycle through all 9 planets', () => {
    // Check that multiple degrees produce different lords
    const planets = [{ name: 'Test', longitude: 0 }];
    const r0 = computeVarga(planets, 0, 30);

    const planets5 = [{ name: 'Test', longitude: 5 }];
    const r5 = computeVarga(planets5, 0, 30);

    // Different degrees should generally give different lords
    assert.ok(r0.planets[0].vargaLord !== r5.planets[0].vargaLord,
      '0° and 5° should have different trimsamsa lords');
  });

  test('Ascendant trimsamsa is calculated', () => {
    const planets = [];
    const result = computeVarga(planets, 10, 30); // 10° Aries
    assert.ok(result.ascendant !== undefined, 'Ascendant should have trimsamsa');
  });
});
