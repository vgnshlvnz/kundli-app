import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getVara } from '../../public/js/kundli/panchanga/index.js';

describe('Vara (weekday) calculation', () => {
  test('Returns vara name and index', () => {
    const utc = 946684800; // 1950-01-01 00:00:00 UTC (Saturday)
    const vara = getVara(utc, 72.88, 19.07); // Mumbai coordinates
    assert.ok(typeof vara.name === 'string', 'Vara name should be a string');
    assert.ok(typeof vara.index === 'number', 'Vara index should be a number');
    assert.ok(vara.index >= 0 && vara.index <= 6, 'Vara index should be 0-6');
  });

  test('Vara index matches name', () => {
    const utc = 946684800;
    const vara = getVara(utc, 72.88, 19.07);
    const expectedNames = [
      'Ravivara', 'Somavara', 'Mangalavara', 'Budhavara',
      'Guruvara', 'Shukravara', 'Shanivaravara'
    ];
    assert.ok(vara.name === expectedNames[vara.index],
      `Vara at index ${vara.index} should be ${expectedNames[vara.index]}`);
  });

  test('Pre-sunrise birth gets previous Vedic day', () => {
    // This is the critical acceptance test
    // Birth at 4 AM local time on Saturday (UTC day is Saturday)
    // But sunrise in Mumbai is ~6:30 AM IST (01:00 UTC)
    // So 4 AM IST = 21:30 UTC (previous UTC day) → should be Friday in Vedic terms
    // Wait, let me recalculate: 4 AM IST on a Saturday is 21:30 UTC on Friday
    // But we want to test the concept, not specific dates.
    //
    // Test approach: create a birth time that's clearly before sunrise
    // Birth: 2020-01-15 03:00 AM IST = 2020-01-14 21:30 UTC
    // Sunrise in Mumbai on Jan 15, 2020: ~07:00 AM IST = 01:30 UTC
    // Since 03:00 AM IST (21:30 UTC previous day) is before sunrise,
    // the Vedic day should be the previous day (January 14).
    //
    // January 14, 2020 was a Tuesday
    const birthIst = new Date('2020-01-15T03:00:00+05:30');
    const birthUtc = birthIst.getTime() / 1000;
    const vara = getVara(birthUtc, 72.88, 19.07);

    // January 14, 2020 was a Tuesday (index 2)
    assert.ok(vara.index === 2,
      `Pre-sunrise birth should get previous day (Tuesday, index 2), got ${vara.index} (${vara.name})`);
  });

  test('Post-sunrise birth gets current Vedic day', () => {
    // Birth: 2020-01-15 10:00 AM IST = 2020-01-15 04:30 UTC
    // After sunrise, so Vedic day is January 15 (Wednesday, index 3)
    const birthIst = new Date('2020-01-15T10:00:00+05:30');
    const birthUtc = birthIst.getTime() / 1000;
    const vara = getVara(birthUtc, 72.88, 19.07);

    assert.ok(vara.index === 3,
      `Post-sunrise birth should get current day (Wednesday, index 3), got ${vara.index} (${vara.name})`);
  });

  test('Weekday follows the local date when sunrise falls on the previous UTC day', () => {
    // Delhi, 2020-06-17 (Wednesday) noon IST: sunrise 05:23 IST = 23:53 UTC on the 16th
    const delhi = getVara(new Date('2020-06-17T12:00:00+05:30').getTime() / 1000, 77.209, 28.6139);
    assert.equal(delhi.english, 'Wednesday');

    // Tokyo, same date: sunrise 04:25 JST = 19:25 UTC on the 16th
    const tokyo = getVara(new Date('2020-06-17T12:00:00+09:00').getTime() / 1000, 139.6917, 35.6895);
    assert.equal(tokyo.english, 'Wednesday');
  });

  test('West of Greenwich uses the local date too', () => {
    // New York, 2020-06-17 (Wednesday) 22:00 EDT = 02:00 UTC on Thursday
    const vara = getVara(new Date('2020-06-17T22:00:00-04:00').getTime() / 1000, -74.006, 40.7128);
    assert.equal(vara.english, 'Wednesday');
  });
});