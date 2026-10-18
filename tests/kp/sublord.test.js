import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { subLordTable, kpLords, cuspSubLords, significators, signLord } from '../../public/js/kundli/kp/index.js';

describe('KP sub-lord table', () => {
  test('generates correct number of sub-lords', () => {
    const subs = subLordTable();
    // Vimshottari cycle has 9 periods, each divided into 9 sub-periods,
    // each into 9 sub-sub-periods, each into 9 sub-sub-sub-periods
    // Total: 9^4 = 6561 sub-lords at the finest (pratyamsa) level
    assert(subs.length === 6561, `Expected 6561 pratyamsas, got ${subs.length}`);
  });

  test('total width is 30°', () => {
    const subs = subLordTable();
    const last = subs[subs.length - 1];
    assert(Math.abs(last.end - 30) < 0.0001, `Last sub ends at ${last.end}°, expected 30°`);
  });

  test('first sub-lord is Ketu', () => {
    const subs = subLordTable();
    assert.equal(subs[0].lord, 'Ketu');
    assert.equal(subs[0].sub, 'Ketu');
    assert.equal(subs[0].subSub, 'Ketu');
    assert.equal(subs[0].subSubSub, 'Ketu');
  });

  test('all sub-lords have valid structure', () => {
    const subs = subLordTable();
    for (const sub of subs) {
      assert(sub.lord, 'lord');
      assert(sub.sub, 'sub');
      assert(sub.subSub, 'subSub');
      assert(sub.subSubSub, 'subSubSub');
      assert(sub.start >= 0 && sub.start < 30, 'start in range');
      assert(sub.end > sub.start && sub.end <= 30, 'end > start');
      assert(sub.width > 0, 'width > 0');
    }
  });

  test('sub-lords are contiguous', () => {
    const subs = subLordTable();
    for (let i = 1; i < subs.length; i++) {
      assert(Math.abs(subs[i].start - subs[i-1].end) < 0.0001,
        `Gap between sub ${i-1} and ${i}: ${subs[i-1].end} vs ${subs[i].start}`);
    }
  });
});

describe('KP sign lords', () => {
  test('Aries lord is Mars', () => {
    assert.equal(signLord(0), 'Mars');
  });

  test('Taurus lord is Venus', () => {
    assert.equal(signLord(1), 'Venus');
  });

  test('all 12 sign lords are correct', () => {
    const lords = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
                  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
    for (let i = 0; i < 12; i++) {
      assert.equal(signLord(i), lords[i], `Sign ${i} lord`);
    }
  });
});

describe('KP lords', () => {
  test('returns all required fields', () => {
    const lords = kpLords(15); // Mid-Aries
    assert.equal(typeof lords.sign, 'string', 'sign');
    assert.equal(typeof lords.star, 'string', 'star');
    assert.equal(typeof lords.sub, 'string', 'sub');
    assert.equal(typeof lords.subSub, 'string', 'subSub');
    assert.equal(typeof lords.signLord, 'string', 'signLord');
  });

  test('handles longitude boundaries', () => {
    // Test at exact sign boundary
    const lords = kpLords(30); // Exact start of Taurus
    assert.equal(lords.sign, 'Taurus');

    // Test at 360°/0° boundary
    const lords2 = kpLords(360);
    assert.equal(lords2.sign, 'Aries');

    // Test at 720° (two full rotations)
    const lords3 = kpLords(720);
    assert.equal(lords3.sign, 'Aries');
  });

  test('returns correct sign lord', () => {
    // Aries lord is Mars
    const lords = kpLords(15);
    assert.equal(lords.signLord, 'Mars');

    // Taurus lord is Venus
    const lords2 = kpLords(45);
    assert.equal(lords2.signLord, 'Venus');
  });

  test('boundary tests at sub edges', () => {
    // Test positions very close to sub boundaries
    const lords1 = kpLords(14.9999);
    const lords2 = kpLords(15.0001);
    // These should return valid results (may or may not be different)
    assert(lords1.sign, 'sign at boundary 1');
    assert(lords2.sign, 'sign at boundary 2');
  });
});

describe('KP cusp sub-lords', () => {
  test('requires 12 cusps', () => {
    assert.throws(() => cuspSubLords([1, 2, 3]), /Expected 12/);
  });

  test('returns 12 cusp sub-lord objects', () => {
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = cuspSubLords(cusps);
    assert.equal(result.length, 12);
    for (const c of result) {
      assert(c.house, 'house');
      assert(c.cusp !== undefined, 'cusp');
      assert(c.sign, 'sign');
      assert(c.star, 'star');
      assert(c.sub, 'sub');
      assert(c.signLord, 'signLord');
    }
  });

  test('cusp sub-lords vary by position', () => {
    const cusps1 = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const cusps2 = [1, 31, 61, 91, 121, 151, 181, 211, 241, 271, 301, 331];
    const result1 = cuspSubLords(cusps1);
    const result2 = cuspSubLords(cusps2);
    // Different cusps should give different sub-lords
    let different = 0;
    for (let i = 0; i < 12; i++) {
      if (result1[i].star !== result2[i].star ||
          result1[i].sub !== result2[i].sub) {
        different++;
      }
    }
    assert(different > 0, 'Different cusps should give different sub-lords');
  });
});

describe('KP significators', () => {
  test('requires 12 cusps', () => {
    assert.throws(() => significators([], [1, 2, 3]), /Expected 12/);
  });

  test('returns significators for all 12 houses', () => {
    const planets = [
      { name: 'Sun', longitude: 15 },
      { name: 'Moon', longitude: 45 },
      { name: 'Mars', longitude: 75 }
    ];
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = significators(planets, cusps);

    assert.equal(Object.keys(result).length, 12);
    for (let house = 1; house <= 12; house++) {
      assert(Array.isArray(result[house]), `House ${house}`);
    }
  });

  test('significators are non-empty for some houses', () => {
    const planets = [
      { name: 'Sun', longitude: 15 },
      { name: 'Moon', longitude: 45 },
      { name: 'Mars', longitude: 75 },
      { name: 'Mercury', longitude: 105 },
      { name: 'Jupiter', longitude: 135 },
      { name: 'Venus', longitude: 165 },
      { name: 'Saturn', longitude: 195 }
    ];
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = significators(planets, cusps);

    let totalSignificators = 0;
    for (let house = 1; house <= 12; house++) {
      totalSignificators += result[house].length;
    }
    assert(totalSignificators > 0, 'At least one planet should be a significator');
  });

  test('planet in house is significator for that house', () => {
    // Planet at 15° Aries should be significator for house 1 (cusp at 0°)
    const planets = [{ name: 'Sun', longitude: 15 }];
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = significators(planets, cusps);
    assert(result[1].includes('Sun'), 'Sun should be significator for house 1');
  });

  test('sign lord is significator for that house', () => {
    // Mars rules Aries, so Mars should be significator for house 1
    const planets = [{ name: 'Mars', longitude: 300 }]; // Mars in Aquarius (away from Aries)
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = significators(planets, cusps);
    assert(result[1].includes('Mars'), 'Mars should be significator for house 1 (sign lord)');
  });
});