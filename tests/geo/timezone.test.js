import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { localToUtc } from '../../public/js/kundli/geo/timezone.js';

test('Kuala Lumpur 1980-06-01 is UTC+7:30', () => {
  const utc = localToUtc('1980-06-01T12:00:00', 'Asia/Kuala_Lumpur');
  assert.equal(utc, '1980-06-01T04:30:00Z', `Got ${utc}`);
});

test('Kuala Lumpur 1983-06-01 is UTC+8', () => {
  const utc = localToUtc('1983-06-01T12:00:00', 'Asia/Kuala_Lumpur');
  assert.equal(utc, '1983-06-01T04:00:00Z', `Got ${utc}`);
});

test('Kuching 1980-06-01 is UTC+8', () => {
  const utc = localToUtc('1980-06-01T12:00:00', 'Asia/Kuching');
  assert.equal(utc, '1980-06-01T04:00:00Z', `Got ${utc}`);
});

test('Kolkata 1943-01-01 is UTC+6:30 (war time)', () => {
  const utc = localToUtc('1943-01-01T12:00:00', 'Asia/Kolkata');
  assert.equal(utc, '1943-01-01T05:30:00Z', `Got ${utc}`);
});

test('New York 2021-03-14 02:30 throws (DST gap)', () => {
  assert.throws(
    () => localToUtc('2021-03-14T02:30:00', 'America/New_York'),
    /Nonexistent|DST gap/
  );
});

test('New York 2021-11-07 01:30 throws without fold (ambiguous)', () => {
  assert.throws(
    () => localToUtc('2021-11-07T01:30:00', 'America/New_York'),
    /Ambiguous|fold/
  );
});

test('New York 2021-11-07 01:30 with fold works', () => {
  const utc1 = localToUtc('2021-11-07T01:30:00', 'America/New_York', { fold: 0 });
  const utc2 = localToUtc('2021-11-07T01:30:00', 'America/New_York', { fold: 1 });
  const diff = new Date(utc2).getTime() - new Date(utc1).getTime();
  assert.equal(Math.abs(diff), 3600000, 'Folds should differ by 1 hour');
});

test('London 2023-06-15 12:00 (BST, UTC+1)', () => {
  const utc = localToUtc('2023-06-15T12:00:00', 'Europe/London');
  assert.equal(utc, '2023-06-15T11:00:00Z');
});

test('Tokyo 2023-06-15 12:00 (JST, UTC+9)', () => {
  const utc = localToUtc('2023-06-15T12:00:00', 'Asia/Tokyo');
  assert.equal(utc, '2023-06-15T03:00:00Z');
});
