import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computeVarga } from '../../public/js/kundli/vargas/index.js';

describe('Simple multiplication vargas (D1, D4, D7, D9, D12, D16, D20, D24, D27, D45, D60)', () => {
  // Test planet at 15° Aries
  const testPlanets = [{ name: 'Sun', longitude: 15 }];
  const ascendant = 15;

  test('D1 returns input unchanged', () => {
    const result = computeVarga(testPlanets, ascendant, 1);
    assert.ok(result.planets[0].longitude === 15, 'D1 longitude should be unchanged');
    assert.ok(result.ascendant === 15, 'D1 ascendant should be unchanged');
  });

  test('D4 (Chaturthamsa) = 4 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 4);
    assert.ok(result.planets[0].longitude === 60, 'D4: 4*15=60');
    assert.ok(result.planets[0].sign === 2, 'D4: 60° is in Leo (sign 2)');
  });

  test('D7 (Saptamsa) = 7 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 7);
    assert.ok(result.planets[0].longitude === 105, 'D7: 7*15=105');
  });

  test('D9 (Navamsa) = 9 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 9);
    const expected = (9 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D9: 9*15=${expected}`);
    assert.ok(result.planets[0].sign === Math.floor(expected / 30), 'D9 sign correct');
  });

  test('D12 (Dvadasamsa) = 12 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 12);
    const expected = (12 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D12: 12*15=${expected}`);
  });

  test('D16 (Shodashamsa) = 16 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 16);
    const expected = (16 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D16: 16*15=${expected}`);
  });

  test('D20 (Vimsamsa) = 20 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 20);
    const expected = (20 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D20: 20*15=${expected}`);
  });

  test('D24 (Chaturvimshamsa) = 24 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 24);
    const expected = (24 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D24: 24*15=${expected}`);
  });

  test('D27 (Saptavimsamsa) = 27 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 27);
    const expected = (27 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D27: 27*15=${expected}`);
  });

  test('D45 (Akshavedamsa) = 45 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 45);
    const expected = (45 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D45: 45*15=${expected}`);
  });

  test('D60 (Shastiamsa) = 60 * longitude', () => {
    const result = computeVarga(testPlanets, ascendant, 60);
    const expected = (60 * 15) % 360;
    assert.ok(result.planets[0].longitude === expected, `D60: 60*15=${expected}`);
  });

  test('Ascendant is also transformed', () => {
    const result = computeVarga(testPlanets, 200, 9);
    const expectedAsc = (9 * 200) % 360;
    assert.ok(result.ascendant === expectedAsc, `D9 asc: 9*200=${expectedAsc}`);
  });

  test('Unknown varga throws error', () => {
    assert.throws(() => computeVarga(testPlanets, ascendant, 5), /Unknown varga divisor/);
  });
});
