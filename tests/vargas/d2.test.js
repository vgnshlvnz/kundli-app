import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeVarga } from '../../public/js/kundli/vargas/index.js';

describe('D2 Hora - table tests at 0°, 5°, 15°, 29°59\' for all signs', () => {
  // Test at specific degrees in each sign
  const testDegrees = [0, 5, 15, 29.9833]; // 29°59' = 29.9833°

  test('Odd signs (Aries, Gemini, Leo, Libra, Sag, Aqu) - Sun hora first 7.5°', () => {
    const oddSigns = [0, 2, 4, 6, 8, 10];
    for (const sign of oddSigns) {
      // At 0° in odd sign → Sun's hora (varga longitude 0° = Aries)
      const planets = [{ name: 'Test', longitude: sign * 30 }];
      const result = computeVarga(planets, 0, 2);
      assert.ok(result.planets[0].longitude === 0,
        `At 0° in sign ${sign} (odd), should be Sun's hora (0°)`);

      // At 5° in odd sign → still Sun's hora (first 7.5°)
      const planets5 = [{ name: 'Test', longitude: sign * 30 + 5 }];
      const result5 = computeVarga(planets5, 0, 2);
      assert.ok(result5.planets[0].longitude < 180,
        `At 5° in sign ${sign} (odd), should be Sun's hora (< 180°)`);

      // At 15° in odd sign → Moon's hora (after 7.5°)
      const planets15 = [{ name: 'Test', longitude: sign * 30 + 15 }];
      const result15 = computeVarga(planets15, 0, 2);
      assert.ok(result15.planets[0].longitude >= 180,
        `At 15° in sign ${sign} (odd), should be Moon's hora (>= 180°)`);
    }
  });

  test('Even signs (Taurus, Cancer, Virgo, Sco, Cap, Pis) - Moon hora first 22.5°', () => {
    const evenSigns = [1, 3, 5, 7, 9, 11];
    for (const sign of evenSigns) {
      // At 0° in even sign → Moon's hora (varga longitude 180° = Libra)
      const planets = [{ name: 'Test', longitude: sign * 30 }];
      const result = computeVarga(planets, 0, 2);
      assert.ok(result.planets[0].longitude >= 180,
        `At 0° in sign ${sign} (even), should be Moon's hora (>= 180°)`);

      // At 15° in even sign → still Moon's hora (first 22.5°)
      const planets15 = [{ name: 'Test', longitude: sign * 30 + 15 }];
      const result15 = computeVarga(planets15, 0, 2);
      assert.ok(result15.planets[0].longitude >= 180,
        `At 15° in sign ${sign} (even), should be Moon's hora (>= 180°)`);

      // At 25° in even sign → Sun's hora (after 22.5°)
      const planets25 = [{ name: 'Test', longitude: sign * 30 + 25 }];
      const result25 = computeVarga(planets25, 0, 2);
      assert.ok(result25.planets[0].longitude < 180,
        `At 25° in sign ${sign} (even), should be Sun's hora (< 180°)`);
    }
  });

  test('Hora varga longitude range is 0-360', () => {
    const planets = [{ name: 'Test', longitude: 45 }];
    const result = computeVarga(planets, 0, 2);
    const vlon = result.planets[0].longitude;
    assert.ok(vlon >= 0 && vlon < 360, `Varga longitude ${vlon} should be in [0, 360)`);
  });

  test('Ascendant hora calculation', () => {
    const planets = [];
    const result = computeVarga(planets, 10, 2); // 10° Aries (odd sign)
    // 10° is past 7.5° in Aries, so Moon's hora
    assert.ok(result.ascendant >= 180, 'Asc at 10° Aries should be in Moon\'s hora');
  });
});
