import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  getNakshatra,
  computeMahadashas,
  computeBhuktis,
  getCurrentMahadasha,
  getCurrentBhukti,
  computeVimshottariDasha
} from '../../public/js/kundli/dasha/index.js';

describe('Nakshatra identification', () => {
  test('Longitude 0° falls in Ashwini', () => {
    const result = getNakshatra(0);
    assert.ok(result.name === 'Ashwini', '0° should be in Ashwini');
    assert.ok(result.lord === 'Ketu', 'Ashwini lord is Ketu');
  });

  test('Longitude 10° falls in Ashwini', () => {
    const result = getNakshatra(10);
    assert.ok(result.name === 'Ashwini', '10° should be in Ashwini');
  });

  test('Longitude 13.34° falls in Bharani', () => {
    const result = getNakshatra(13.34);
    assert.ok(result.name === 'Bharani', '13.34° should be in Bharani');
    assert.ok(result.lord === 'Venus', 'Bharani lord is Venus');
  });

  test('Longitude 300° falls in Dhanishta', () => {
    const result = getNakshatra(300);
    assert.ok(result.name === 'Dhanishta');
    assert.ok(result.lord === 'Sun', 'Dhanishta lord is Sun');
  });

  test('Longitude 359° falls in Revati', () => {
    const result = getNakshatra(359);
    assert.ok(result.name === 'Revati');
    assert.ok(result.lord === 'Mars');
  });

  test('All 27 nakshatras are covered', () => {
    // Check boundaries between nakshatras
    const boundaries = [0, 13.3333, 26.6667, 40.0, 53.3333, 66.6667, 80.0, 93.3333,
      106.6667, 120.0, 133.3333, 146.6667, 160.0, 173.3333, 186.6667, 200.0,
      213.3333, 226.6667, 240.0, 253.3333, 266.6667, 280.0, 293.3333, 306.6667,
      320.0, 333.3333, 346.6667];

    for (const boundary of boundaries) {
      const result = getNakshatra(boundary);
      assert.ok(result.name !== null, `Nakshatra found at ${boundary}°`);
    }
  });
});

describe('Mahadasha sequence', () => {
  const birth = { utc: 946684800 }; // 1950-01-01 00:00 UTC

  test('Moon in Ashwini starts Ketu mahadasha', () => {
    // Ashwini = 0° longitude
    const mahadashas = computeMahadashas(birth, 5);
    assert.ok(mahadashas[0].planet === 'Ketu', 'First mahadasha should be Ketu');
  });

  test('Moon in Bharani starts Venus mahadasha', () => {
    // Bharani = 13.3333°
    const mahadashas = computeMahadashas(birth, 15);
    assert.ok(mahadashas[0].planet === 'Venus', 'First mahadasha should be Venus');
  });

  test('Moon in Pushya starts Mars mahadasha', () => {
    // Pushya = 93.3333°
    const mahadashas = computeMahadashas(birth, 95);
    assert.ok(mahadashas[0].planet === 'Mars', 'First mahadasha should be Mars');
  });

  test('Full sequence is 9 mahadashas', () => {
    const mahadashas = computeMahadashas(birth, 5);
    assert.ok(mahadashas.length === 9, 'Should have 9 mahadashas');
  });

  test('Mahadasha sequence follows Vimshottari order', () => {
    // Start at Ketu (Ashwini), check sequence
    const mahadashas = computeMahadashas(birth, 5);
    const expected = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
    for (let i = 0; i < 9; i++) {
      assert.ok(mahadashas[i].planet === expected[i],
        `Mahadasha ${i} should be ${expected[i]}`);
    }
  });

  test('Periods are correct', () => {
    const mahadashas = computeMahadashas(birth, 5);
    // Ketu = 7 years (first one will be less since we start mid-nakshatra)
    // Venus = 20, Sun = 6, etc.
    assert.ok(mahadashas[1].durationYears === 20, 'Venus period should be 20 years');
    assert.ok(mahadashas[2].durationYears === 6, 'Sun period should be 6 years');
    assert.ok(mahadashas[3].durationYears === 10, 'Moon period should be 10 years');
  });

  test('Total cycle is 120 years (Moon at nakshatra start)', () => {
    // Moon at 0° Ashwini → first mahadasha is full 7 years
    const mahadashas = computeMahadashas(birth, 0);
    let total = 0;
    for (const md of mahadashas) {
      total += md.durationYears;
    }
    assert.ok(Math.abs(total - 120) < 0.1, `Total should be 120 years, got ${total}`);
  });

  test('First mahadasha is partial (Moon mid-nakshatra)', () => {
    // Moon at 5° Ashwini → fraction 5/13.3333 = 0.375 → remaining 4.375 years
    const mahadashas = computeMahadashas(birth, 5);
    let total = 0;
    for (const md of mahadashas) {
      total += md.durationYears;
    }
    // First is 4.375, rest are full: 4.375 + 20+6+10+7+18+16+19+17 = 117.375
    assert.ok(Math.abs(total - 117.375) < 0.1, `Expected 117.375 years, got ${total}`);
  });

  test('Mahadashas are contiguous', () => {
    const mahadashas = computeMahadashas(birth, 5);
    for (let i = 1; i < 9; i++) {
      assert.ok(Math.abs(mahadashas[i].start - mahadashas[i-1].end) < 1,
        'Mahadashas should be contiguous');
    }
  });

  test('Remaining first mahadasha is less than full period', () => {
    // Moon at 5° Ashwini = fraction 5/13.3333 = 0.375 through nakshatra
    // Remaining = (1 - 0.375) * 7 = 4.375 years
    const mahadashas = computeMahadashas(birth, 5);
    assert.ok(mahadashas[0].durationYears < 7, 'First mahadasha should be less than 7 years');
    assert.ok(Math.abs(mahadashas[0].durationYears - 4.375) < 0.01,
      `Expected ~4.375 years, got ${mahadashas[0].durationYears}`);
  });

  test('Moon at beginning of nakshatra gets full first mahadasha', () => {
    // Moon at 0° Ashwini = fraction 0
    // Remaining = 7 years (full period)
    const mahadashas = computeMahadashas(birth, 0);
    assert.ok(Math.abs(mahadashas[0].durationYears - 7) < 0.01,
      `Expected 7 years, got ${mahadashas[0].durationYears}`);
  });

  test('Moon at end of nakshatra gets almost no first mahadasha', () => {
    // Moon at 13° Ashwini = fraction 13/13.3333 ≈ 0.975
    // Remaining = (1 - 0.975) * 7 ≈ 0.175 years
    const mahadashas = computeMahadashas(birth, 13);
    assert.ok(mahadashas[0].durationYears < 0.2, 'Should be very short');
  });
});

describe('Bhukti calculations', () => {
  const birth = { utc: 946684800 };

  test('Bhukti sequence is 9 sub-periods', () => {
    const mahadashas = computeMahadashas(birth, 5);
    const bhuktis = computeBhuktis(mahadashas[0]);
    assert.ok(bhuktis.length === 9, 'Should have 9 bhuktis');
  });

  test('Bhukti total equals mahadasha duration', () => {
    const mahadashas = computeMahadashas(birth, 5);
    const bhuktis = computeBhuktis(mahadashas[1]); // Venus, full 20 years
    let total = 0;
    for (const b of bhuktis) {
      total += b.durationYears;
    }
    assert.ok(Math.abs(total - 20) < 0.1, `Total should be 20 years, got ${total}`);
  });

  test('Bhukti periods are proportional', () => {
    // In a 20-year Venus mahadasha:
    // Venus bhukti = (20/120) * 20 = 3.33 years
    // Sun bhukti = (20/120) * 6 = 1 year
    const mahadashas = computeMahadashas(birth, 5);
    const bhuktis = computeBhuktis(mahadashas[1]);

    // First bhukti in Venus mahadasha is Venus itself
    assert.ok(Math.abs(bhuktis[0].durationYears - 3.333) < 0.01,
      `Venus bhukti should be ~3.33 years, got ${bhuktis[0].durationYears}`);

    // Second is Sun
    assert.ok(Math.abs(bhuktis[1].durationYears - 1) < 0.01,
      `Sun bhukti should be ~1 year, got ${bhuktis[1].durationYears}`);
  });

  test('Bhukti sequence follows Vimshottari order from mahadasha planet', () => {
    // In Ketu mahadasha, bhuktis start with Ketu
    const mahadashas = computeMahadashas(birth, 5);
    const bhuktis = computeBhuktis(mahadashas[0]);
    assert.ok(bhuktis[0].planet === 'Ketu', 'First bhukti in Ketu MD should be Ketu');
    assert.ok(bhuktis[1].planet === 'Venus', 'Second bhukti should be Venus');
  });
});

describe('Current period detection', () => {
  const birth = { utc: 946684800 }; // 1950

  test('Can find mahadasha at specific date', () => {
    const mahadashas = computeMahadashas(birth, 5);
    // At birth + 2 years, should still be in first mahadasha (Ketu, remaining ~4.375 years)
    const queryDate = birth.utc + 2 * 365.25 * 86400;
    const current = getCurrentMahadasha(mahadashas, queryDate);
    assert.ok(current.planet === 'Ketu', 'At +2 years should be in Ketu');
    assert.ok(current.current === true, 'Should be marked as current');
  });

  test('Can find bhukti at specific date', () => {
    const mahadashas = computeMahadashas(birth, 5);
    const bhuktis = computeBhuktis(mahadashas[1]); // Venus mahadasha
    // Query at start of Venus mahadasha + 1 year
    const queryDate = mahadashas[1].start + 1 * 365.25 * 86400;
    const current = getCurrentBhukti(bhuktis, queryDate);
    // At +1 year in Venus MD, we should be in Venus bhukti (lasts ~3.33 years)
    assert.ok(current.planet === 'Venus', 'Should be in Venus bhukti at +1 year');
  });
});

describe('Complete dasha calculation', () => {
  test('computeVimshottariDasha returns complete result', () => {
    const birth = { utc: 946684800 };
    const result = computeVimshottariDasha(birth, 5);

    assert.ok(result.moonNakshatra === 'Ashwini');
    assert.ok(result.moonNakshatraLord === 'Ketu');
    assert.ok(result.mahadashas.length === 9);
    assert.ok(typeof result.remainingFirstMahadashaYears === 'number');
    assert.ok(result.birthYear === 2000);
  });

  test('Handles Moon in different nakshatras', () => {
    const birth = { utc: 946684800 };

    // Moon at 110° = Ashlesha (lord: Rahu)
    let result = computeVimshottariDasha(birth, 110);
    assert.ok(result.moonNakshatraLord === 'Rahu');

    // Moon at 200° = Vishakha (lord: Saturn)
    result = computeVimshottariDasha(birth, 200);
    assert.ok(result.moonNakshatraLord === 'Saturn');

    // Moon at 350° = Revati (lord: Mars)
    result = computeVimshottariDasha(birth, 350);
    assert.ok(result.moonNakshatraLord === 'Mars');
  });
});
