import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getYoga } from '../../public/js/kundli/panchanga/index.js';

describe('Yoga calculation', () => {
  test('Returns yoga index 0-26', () => {
    const utc = 946684800;
    const yoga = getYoga(utc);
    assert.ok(yoga.index >= 0 && yoga.index < 27,
      'Yoga index should be 0-26');
  });

  test('Returns yoga name', () => {
    const utc = 946684800;
    const yoga = getYoga(utc);
    assert.ok(typeof yoga.name === 'string', 'Yoga name should be a string');
    assert.ok(yoga.name.length > 0, 'Yoga name should not be empty');
  });

  test('Yoga name matches index', () => {
    const utc = 946684800;
    const yoga = getYoga(utc);
    const yogaNames = [
      'Vishkambha', 'Prithivi', 'Aparajita', 'Sarpa', 'Siddhi',
      'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra',
      'Vaidhriti', 'Visham', 'Vishambhara', 'Priti', 'Ayushman',
      'Saumya', 'Dhriti', 'Shula', 'Ganda', 'Vigraha',
      'Harshana', 'Vajra', 'Siddha', 'Vyaghata', 'Harsha',
      'Varjya', 'Shiva'
    ];
    assert.ok(yoga.name === yogaNames[yoga.index],
      `Yoga at index ${yoga.index} should be ${yogaNames[yoga.index]}`);
  });
});