import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateHouses } from '../../public/js/kundli/houses/index.js';
import { kpLords, cuspSubLords } from '../../public/js/kundli/kp/index.js';

// Golden chart: October 15, 1986, 10:00 AM Chennai, India
// Same birth data as ephemeris golden chart for cross-validation
// KP fixed to Krishnamurti ayanamsa and Placidus houses
const GOLDEN_BIRTH = { utc: 529759800, longitude: 80.2707, latitude: 13.0827 };

// Expected Placidus cusps (sidereal, Krishnamurti ayanamsa)
const EXPECTED_CUSPS = [
  311.7154, // Cusp 1 (ASC) - Aquarius
  179.4883, // Cusp 2
  207.9182, // Cusp 3
  163.3926, // Cusp 4 (IC)
  272.9166, // Cusp 5
  245.7063, // Cusp 6
  131.7154, // Cusp 7
  359.4883, // Cusp 8
  27.9182,  // Cusp 9
  343.3926, // Cusp 10 (MC)
  92.9166,  // Cusp 11
  65.7063   // Cusp 12
];

// Expected KP sub-lords for each cusp
const EXPECTED_KP = [
  { house: 1, sign: 'Aquarius', signLord: 'Saturn', star: 'Mars', sub: 'Rahu' },
  { house: 2, sign: 'Virgo', signLord: 'Mercury', star: 'Mercury', sub: 'Mercury' },
  { house: 3, sign: 'Libra', signLord: 'Venus', star: 'Mercury', sub: 'Rahu' },
  { house: 4, sign: 'Virgo', signLord: 'Mercury', star: 'Rahu', sub: 'Venus' },
  { house: 5, sign: 'Capricorn', signLord: 'Saturn', star: 'Venus', sub: 'Sun' },
  { house: 6, sign: 'Sagittarius', signLord: 'Jupiter', star: 'Venus', sub: 'Saturn' },
  { house: 7, sign: 'Leo', signLord: 'Sun', star: 'Mars', sub: 'Rahu' },
  { house: 8, sign: 'Pisces', signLord: 'Jupiter', star: 'Mercury', sub: 'Mercury' },
  { house: 9, sign: 'Aries', signLord: 'Mars', star: 'Mercury', sub: 'Rahu' },
  { house: 10, sign: 'Pisces', signLord: 'Jupiter', star: 'Rahu', sub: 'Venus' },
  { house: 11, sign: 'Cancer', signLord: 'Moon', star: 'Venus', sub: 'Sun' },
  { house: 12, sign: 'Gemini', signLord: 'Mercury', star: 'Venus', sub: 'Saturn' }
];

describe('KP Golden Chart: Oct 15 1986 10:00 Chennai', () => {
  test('ASC is in Aquarius (~311.72° sidereal)', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const asc = houses.cusps[0];
    // Sign check: Aquarius starts at 300°
    assert(asc > 300 && asc < 330, `ASC should be in Aquarius, got ${asc}°`);
    // Precision check
    assert(Math.abs(asc - EXPECTED_CUSPS[0]) < 0.01,
      `ASC should be ~311.72°, got ${asc}°`);
  });

  test('MC is in Pisces (~343.39° sidereal)', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const mc = houses.cusps[9];
    // Sign check: Pisces starts at 330°
    assert(mc > 330 && mc < 360, `MC should be in Pisces, got ${mc}°`);
    // Precision check
    assert(Math.abs(mc - EXPECTED_CUSPS[9]) < 0.01,
      `MC should be ~343.39°, got ${mc}°`);
  });

  test('All 12 Placidus cusps match expected values', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    for (let i = 0; i < 12; i++) {
      const cusp = houses.cusps[i];
      const expected = EXPECTED_CUSPS[i];
      assert(Math.abs(cusp - expected) < 0.01,
        `Cusp ${i + 1}: expected ~${expected}°, got ${cusp}°`);
    }
  });

  test('Cusp 7 = ASC + 180°', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const asc = houses.cusps[0];
    const expected7 = (asc + 180) % 360;
    assert(Math.abs(houses.cusps[6] - expected7) < 0.01,
      `Cusp 7 should be ASC + 180°`);
  });

  test('Cusp 10 (MC) matches expected', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    assert(Math.abs(houses.cusps[9] - EXPECTED_CUSPS[9]) < 0.01,
      `MC should be ~343.39°`);
  });

  test('Cusp 4 (IC) = MC + 180°', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const mc = houses.cusps[9];
    const expected4 = (mc + 180) % 360;
    assert(Math.abs(houses.cusps[3] - expected4) < 0.01,
      `Cusp 4 should be MC + 180°`);
  });
});

describe('KP sub-lord assignments (golden chart)', () => {
  test('ASC cusp (house 1) KP lords', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const lords = kpLords(houses.cusps[0]);
    assert.equal(lords.sign, 'Aquarius', 'ASC should be in Aquarius');
    assert.equal(lords.signLord, 'Saturn', 'ASC sign lord should be Saturn');
    assert.equal(lords.star, 'Mars', 'ASC KP star should be Mars');
    assert.equal(lords.sub, 'Rahu', 'ASC KP sub should be Rahu');
  });

  test('MC cusp (house 10) KP lords', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const lords = kpLords(houses.cusps[9]);
    assert.equal(lords.sign, 'Pisces', 'MC should be in Pisces');
    assert.equal(lords.signLord, 'Jupiter', 'MC sign lord should be Jupiter');
    assert.equal(lords.star, 'Rahu', 'MC KP star should be Rahu');
    assert.equal(lords.sub, 'Venus', 'MC KP sub should be Venus');
  });

  test('All 12 cusps have correct KP sub-lords', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const kp = cuspSubLords(houses.cusps);

    for (let i = 0; i < 12; i++) {
      const expected = EXPECTED_KP[i];
      assert.equal(kp[i].house, expected.house, `House number ${expected.house}`);
      assert.equal(kp[i].sign, expected.sign,
        `House ${expected.house} should be in ${expected.sign}`);
      assert.equal(kp[i].signLord, expected.signLord,
        `House ${expected.house} sign lord should be ${expected.signLord}`);
      assert.equal(kp[i].star, expected.star,
        `House ${expected.house} KP star should be ${expected.star}`);
      assert.equal(kp[i].sub, expected.sub,
        `House ${expected.house} KP sub should be ${expected.sub}`);
    }
  });

  test('cuspSubLords returns array of 12 entries', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const kp = cuspSubLords(houses.cusps);
    assert(kp.length === 12, 'Should have 12 cusp sub-lord entries');
  });
});
