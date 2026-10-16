import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { localToUtc } from '../../public/js/kundli/geo/timezone.js';

test('Manual coordinates and timezone work', () => {
  const utc = localToUtc('2000-01-01T00:00:00', 'UTC');
  assert.equal(utc, '2000-01-01T00:00:00Z');
});

test('Manual coordinates with custom timezone', () => {
  const utc = localToUtc('2000-01-01T00:00:00', 'Asia/Kolkata');
  // IST is UTC+5:30, so 00:00 IST = 18:30 UTC on Dec 31
  assert.equal(utc, '1999-12-31T18:30:00Z');
});

test('Invalid timezone throws', () => {
  assert.throws(
    () => localToUtc('2000-01-01T00:00:00', 'Invalid/Zone'),
    /Invalid|not found/
  );
});

test('Invalid time format throws', () => {
  assert.throws(
    () => localToUtc('not-a-date', 'Asia/Kolkata'),
    /Invalid/
  );
});
