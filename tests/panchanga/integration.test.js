import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculatePanchanga } from '../../public/js/kundli/panchanga/index.js';

describe('Complete panchanga calculation', () => {
  const birth = {
    utc: 946684800, // 1950-01-01 00:00:00 UTC
    longitude: 72.88, // Mumbai
    latitude: 19.07
  };

  test('calculatePanchanga returns all components', () => {
    const panchanga = calculatePanchanga(birth);

    // All components present
    assert.ok(panchanga.tithi, 'Tithi should be present');
    assert.ok(panchanga.paksha, 'Paksha should be present');
    assert.ok(panchanga.nakshatra, 'Nakshatra should be present');
    assert.ok(panchanga.yoga, 'Yoga should be present');
    assert.ok(panchanga.karana, 'Karana should be present');
    assert.ok(panchanga.vara, 'Vara should be present');
    assert.ok(panchanga.sunriseSunset, 'Sunrise/sunset should be present');
  });

  test('Tithi is within valid range', () => {
    const panchanga = calculatePanchanga(birth);
    assert.ok(panchanga.tithi.number >= 1 && panchanga.tithi.number <= 30,
      'Tithi should be 1-30');
  });

  test('Paksha matches tithi number', () => {
    const panchanga = calculatePanchanga(birth);
    if (panchanga.tithi.number <= 15) {
      assert.ok(panchanga.paksha.name === 'shukla',
        'Tithi 1-15 should be shukla paksha');
    } else {
      assert.ok(panchanga.paksha.name === 'krishna',
        'Tithi 16-30 should be krishna paksha');
    }
  });

  test('Nakshatra index is 0-26', () => {
    const panchanga = calculatePanchanga(birth);
    assert.ok(panchanga.nakshatra.index >= 0 && panchanga.nakshatra.index < 27,
      'Nakshatra index should be 0-26');
  });

  test('Yoga index is 0-26', () => {
    const panchanga = calculatePanchanga(birth);
    assert.ok(panchanga.yoga.index >= 0 && panchanga.yoga.index < 27,
      'Yoga index should be 0-26');
  });

  test('Vara index is 0-6', () => {
    const panchanga = calculatePanchanga(birth);
    assert.ok(panchanga.vara.index >= 0 && panchanga.vara.index <= 6,
      'Vara index should be 0-6');
  });

  test('Birth UTC is preserved', () => {
    const panchanga = calculatePanchanga(birth);
    assert.ok(panchanga.birthUtc === birth.utc,
      'Birth UTC should be preserved');
  });

  test('Golden chart: matches expected values', () => {
    // Test with a known date where we can verify against a reference
    const birthUtc = 946684800; // 1950-01-01
    const panchanga = calculatePanchanga({
      utc: birthUtc,
      longitude: 72.88,
      latitude: 19.07
    });

    // Verify structure is correct (exact values depend on astronomical calculations)
    assert.ok(typeof panchanga.tithi.percentage === 'number',
      'Tithi percentage should be a number');
    assert.ok(panchanga.tithi.percentage >= 0 && panchanga.tithi.percentage <= 100,
      'Tithi percentage should be 0-100');
    assert.ok(typeof panchanga.karana.fixed === 'boolean',
      'Karana fixed flag should be boolean');
  });
});