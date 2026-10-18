import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getTithi, getPaksha } from '../../public/js/kundli/panchanga/index.js';

describe('Tithi calculation', () => {
  test('Computes tithi number from elongation', () => {
    // Example: elongation = 120° → tithi 10 (120/12 = 10, +1 = 11)
    // Using a known date instead of constructing elongation directly
    const utc = 946684800; // 1950-01-01 00:00:00 UTC
    const tithi = getTithi(utc);
    assert.ok(typeof tithi.number === 'number', 'Tithi number should be a number');
    assert.ok(tithi.number >= 1 && tithi.number <= 30, 'Tithi number should be 1-30');
  });

  test('Tithi name matches number', () => {
    const utc = 946684800;
    const tithi = getTithi(utc);
    const expectedNames = [
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
      'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
      'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
      'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
    ];
    assert.ok(tithi.name === expectedNames[tithi.number - 1],
      `Tithi ${tithi.number} should be ${expectedNames[tithi.number - 1]}`);
  });

  test('Tithi percentage is 0-100', () => {
    const utc = 946684800;
    const tithi = getTithi(utc);
    assert.ok(tithi.percentage >= 0 && tithi.percentage <= 100,
      'Tithi percentage should be 0-100');
  });

  test('Paksha is shukla for tithi 1-15', () => {
    for (let i = 1; i <= 15; i++) {
      const paksha = getPaksha(i);
      assert.ok(paksha.name === 'shukla', `Tithi ${i} should be shukla paksha`);
      assert.ok(paksha.english === 'Waxing', `Tithi ${i} should be waxing`);
    }
  });

  test('Paksha is krishna for tithi 16-30', () => {
    for (let i = 16; i <= 30; i++) {
      const paksha = getPaksha(i);
      assert.ok(paksha.name === 'krishna', `Tithi ${i} should be krishna paksha`);
      assert.ok(paksha.english === 'Waning', `Tithi ${i} should be waning`);
    }
  });

  test('Paksha boundary at tithi 15/16', () => {
    const paksha15 = getPaksha(15);
    const paksha16 = getPaksha(16);
    assert.ok(paksha15.name === 'shukla', 'Tithi 15 should be shukla');
    assert.ok(paksha16.name === 'krishna', 'Tithi 16 should be krishna');
  });
});