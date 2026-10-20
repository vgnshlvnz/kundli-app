import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { subLordTable, kpLords, cuspSubLords, significators, signLord } from '../../public/js/kundli/kp/index.js';

describe('KP sub-lord table', () => {
  test('has the standard 249 subs', () => {
    // 27 nakshatras × 9 subs, plus 6 subs split at sign boundaries
    assert.equal(subLordTable().length, 249);
  });

  test('covers the whole zodiac contiguously', () => {
    const subs = subLordTable();
    assert.equal(subs[0].start, 0);
    assert(Math.abs(subs[subs.length - 1].end - 360) < 1e-9, 'last sub ends at 360°');
    for (let i = 1; i < subs.length; i++) {
      assert(Math.abs(subs[i].start - subs[i - 1].end) < 1e-9, `gap before sub ${i}`);
      assert(subs[i].end > subs[i].start, `sub ${i} has positive width`);
    }
  });

  test('no sub crosses a sign boundary', () => {
    for (const sub of subLordTable()) {
      assert.equal(Math.floor((sub.start + 1e-9) / 30), Math.floor((sub.end - 1e-9) / 30), `${sub.start}-${sub.end}`);
    }
  });

  test('matches the published start of the KP table', () => {
    // Aries: Ketu star, subs Ketu 0°00'00"-0°46'40", Venus -3°00'00", Sun -3°40'00"
    const [first, second, third] = subLordTable();
    assert.deepEqual([first.star, first.sub, second.sub, third.sub], ['Ketu', 'Ketu', 'Venus', 'Sun']);
    assert(Math.abs(first.end - 7 / 9) < 1e-9, 'Ketu sub ends at 0°46\'40"');
    assert(Math.abs(second.end - 3) < 1e-9, 'Venus sub ends at 3°00\'00"');
    assert(Math.abs(third.end - 11 / 3) < 1e-9, 'Sun sub ends at 3°40\'00"');
  });

  test('kpLords agrees with the table at every sub midpoint', () => {
    for (const sub of subLordTable()) {
      const lords = kpLords((sub.start + sub.end) / 2);
      assert.deepEqual([lords.sign, lords.star, lords.sub], [sub.sign, sub.star, sub.sub], `${sub.start}°`);
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
  test('star lord is the nakshatra lord', () => {
    const cycle = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    for (let n = 0; n < 27; n++) {
      assert.equal(kpLords(n * 40 / 3 + 0.1).star, cycle[n % 9], `nakshatra ${n + 1}`);
    }
  });

  test('first sub in each nakshatra is the nakshatra lord itself', () => {
    for (let n = 0; n < 27; n++) {
      const lords = kpLords(n * 40 / 3 + 0.01);
      assert.equal(lords.sub, lords.star, `nakshatra ${n + 1}`);
    }
  });

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

  test('house owner comes from the cusp sign, not the house number', () => {
    // House 1 cusp in Leo (owner Sun), so Sun signifies house 1 even when elsewhere
    const planets = [{ name: 'Sun', longitude: 200 }, { name: 'Mars', longitude: 300 }];
    const cusps = [130, 160, 190, 220, 250, 280, 310, 340, 10, 40, 70, 100];
    const result = significators(planets, cusps);
    assert(result[1].includes('Sun'), 'Sun owns Leo, the sign on cusp 1');
    assert(!result[1].includes('Mars'), 'Mars does not own Leo and is not in house 1');
  });

  test('planets in the star of an occupant signify the house (level A)', () => {
    // Ketu at 5° (Ashwini, star Ketu) occupies house 1; Moon at 200° is in Vishakha (star Jupiter)
    // Venus at 245° is in Mula (star Ketu) → signifies house 1 through Ketu
    const planets = [{ name: 'Ketu', longitude: 5 }, { name: 'Venus', longitude: 245 }, { name: 'Moon', longitude: 200 }];
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = significators(planets, cusps);
    assert(result[1].includes('Venus'), 'Venus is in the star of Ketu, who occupies house 1');
    assert(!result[1].includes('Moon'), 'Moon is not linked to house 1');
  });

  test('sign lord is significator for that house', () => {
    // Mars rules Aries, so Mars should be significator for house 1
    const planets = [{ name: 'Mars', longitude: 300 }]; // Mars in Aquarius (away from Aries)
    const cusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    const result = significators(planets, cusps);
    assert(result[1].includes('Mars'), 'Mars should be significator for house 1 (sign lord)');
  });
});