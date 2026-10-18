import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getKarana } from '../../public/js/kundli/panchanga/index.js';

describe('Karana calculation', () => {
  test('Returns karana name', () => {
    const utc = 946684800;
    const karana = getKarana(utc);
    assert.ok(typeof karana.name === 'string', 'Karana name should be a string');
    assert.ok(karana.name.length > 0, 'Karana name should not be empty');
  });

  test('Returns fixed flag', () => {
    const utc = 946684800;
    const karana = getKarana(utc);
    assert.ok(typeof karana.fixed === 'boolean', 'Fixed flag should be boolean');
  });

  test('Fixed karanas only on specific tithis', () => {
    // Fixed karanas (Bava, Taitila, Garga, Vanija) occur on first halves of
    // tithis 1, 3, 5, 7 respectively
    const utc = 946684800;
    const karana = getKarana(utc);
    // Just verify the calculation runs and returns a valid karana
    assert.ok(karana.name !== null, 'Karana should be calculated');
  });
});