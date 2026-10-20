import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateHouses } from '../../public/js/kundli/houses/index.js';
import { kpLords, cuspSubLords } from '../../public/js/kundli/kp/index.js';

// Golden chart: October 15, 1986, 17:00 IST (11:30 UTC), Chennai, India
// Same birth data as ephemeris golden chart for cross-validation
// KP fixed to Krishnamurti ayanamsa and Placidus houses
const GOLDEN_BIRTH = { utc: 529759800, longitude: 80.2707, latitude: 13.0827 };

// Expected Placidus cusps (sidereal, Krishnamurti ayanamsa) from Swiss Ephemeris 2.10.03
const EXPECTED_CUSPS = [
  344.2627, // Cusp 1 (ASC) - Pisces
  17.7491,  // Cusp 2
  46.3347,  // Cusp 3
  72.3687,  // Cusp 4 (IC)
  99.0392,  // Cusp 5
  129.3107, // Cusp 6
  164.2627, // Cusp 7
  197.7491, // Cusp 8
  226.3347, // Cusp 9
  252.3687, // Cusp 10 (MC)
  279.0392, // Cusp 11
  309.3107  // Cusp 12
];

// Expected KP lords for each cusp, derived from the cusps above with the standard
// KP rule (nakshatra divided into 9 Vimshottari subs starting from its lord).
// Every cusp is at least 1.4' from a sub boundary.
const EXPECTED_KP = [
  { house: 1, sign: 'Pisces', signLord: 'Jupiter', star: 'Saturn', sub: 'Rahu' },
  { house: 2, sign: 'Aries', signLord: 'Mars', star: 'Venus', sub: 'Mars' },
  { house: 3, sign: 'Taurus', signLord: 'Venus', star: 'Moon', sub: 'Saturn' },
  { house: 4, sign: 'Gemini', signLord: 'Mercury', star: 'Rahu', sub: 'Saturn' },
  { house: 5, sign: 'Cancer', signLord: 'Moon', star: 'Saturn', sub: 'Venus' },
  { house: 6, sign: 'Leo', signLord: 'Sun', star: 'Ketu', sub: 'Jupiter' },
  { house: 7, sign: 'Virgo', signLord: 'Mercury', star: 'Moon', sub: 'Jupiter' },
  { house: 8, sign: 'Libra', signLord: 'Venus', star: 'Rahu', sub: 'Sun' },
  { house: 9, sign: 'Scorpio', signLord: 'Mars', star: 'Saturn', sub: 'Jupiter' },
  { house: 10, sign: 'Sagittarius', signLord: 'Jupiter', star: 'Ketu', sub: 'Mercury' },
  { house: 11, sign: 'Capricorn', signLord: 'Saturn', star: 'Sun', sub: 'Venus' },
  { house: 12, sign: 'Aquarius', signLord: 'Saturn', star: 'Rahu', sub: 'Jupiter' }
];

describe('KP Golden Chart: Oct 15 1986 17:00 IST Chennai', () => {
  test('ASC is in Pisces (~344.26° sidereal)', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const asc = houses.cusps[0];
    // Sign check: Pisces starts at 330°
    assert(asc > 330 && asc < 360, `ASC should be in Pisces, got ${asc}°`);
    // Precision check
    assert(Math.abs(asc - EXPECTED_CUSPS[0]) < 0.01,
      `ASC should be ~344.26°, got ${asc}°`);
  });

  test('MC is in Sagittarius (~252.37° sidereal)', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const mc = houses.cusps[9];
    // Sign check: Sagittarius starts at 240°
    assert(mc > 240 && mc < 270, `MC should be in Sagittarius, got ${mc}°`);
    // Precision check
    assert(Math.abs(mc - EXPECTED_CUSPS[9]) < 0.01,
      `MC should be ~252.37°, got ${mc}°`);
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
      `MC should be ~252.37°`);
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
    assert.equal(lords.sign, 'Pisces', 'ASC should be in Pisces');
    assert.equal(lords.signLord, 'Jupiter', 'ASC sign lord should be Jupiter');
    assert.equal(lords.star, 'Saturn', 'ASC KP star should be Saturn');
    assert.equal(lords.sub, 'Rahu', 'ASC KP sub should be Rahu');
  });

  test('MC cusp (house 10) KP lords', () => {
    const houses = calculateHouses(GOLDEN_BIRTH, 'krishnamurti', 'placidus');
    const lords = kpLords(houses.cusps[9]);
    assert.equal(lords.sign, 'Sagittarius', 'MC should be in Sagittarius');
    assert.equal(lords.signLord, 'Jupiter', 'MC sign lord should be Jupiter');
    assert.equal(lords.star, 'Ketu', 'MC KP star should be Ketu');
    assert.equal(lords.sub, 'Mercury', 'MC KP sub should be Mercury');
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
