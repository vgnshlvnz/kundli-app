import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { getTithi, getNakshatra, getYoga, getKarana } from '../../public/js/kundli/panchanga/index.js';

// Expected values from Swiss Ephemeris 2.10.03 sidereal (Lahiri) Sun and Moon,
// at moments at least 0.2° away from any nakshatra, yoga or karana boundary.
const MOMENTS = [
  { label: '1990-01-15 05:00 UTC', utc: 632379600, tithi: 20, nakshatra: 'Purva Phalguni', yoga: 'Saubhagya', karana: 'Kaulava' },
  { label: '1986-10-15 11:30 UTC', utc: 529759800, tithi: 13, nakshatra: 'Purva Bhadrapada', yoga: 'Dhruva', karana: 'Taitila' },
  { label: '1975-11-06 01:00 UTC', utc: 184467600, tithi: 3, nakshatra: 'Jyeshtha', yoga: 'Atiganda', karana: 'Gara' },
  { label: '2010-08-20 13:15 UTC', utc: 1282310100, tithi: 12, nakshatra: 'Purva Ashadha', yoga: 'Priti', karana: 'Bava' },
  { label: '2026-10-20 00:15 UTC', utc: 1792455300, tithi: 9, nakshatra: 'Shravana', yoga: 'Shula', karana: 'Kaulava' },
  { label: '1962-02-05 08:50 UTC', utc: -249405000, tithi: 1, nakshatra: 'Dhanishta', yoga: 'Variyan', karana: 'Kimstughna' }
];

describe('Panchanga vs Swiss Ephemeris (Lahiri)', () => {
  for (const m of MOMENTS) {
    test(m.label, () => {
      assert.equal(getTithi(m.utc).number, m.tithi, 'tithi');
      assert.equal(getNakshatra(m.utc, 'lahiri').name, m.nakshatra, 'nakshatra (sidereal Moon)');
      assert.equal(getYoga(m.utc, 'lahiri').name, m.yoga, 'yoga (sidereal Sun + Moon)');
      assert.equal(getKarana(m.utc).name, m.karana, 'karana');
    });
  }
});

describe('Fixed karanas around the new moon of 2000-01-06 18:14 UTC', () => {
  test('just after new moon is Kimstughna', () => {
    // 22:00 UTC: Moon − Sun ≈ 2.0°
    const karana = getKarana(947196000);
    assert.equal(karana.name, 'Kimstughna');
    assert.equal(karana.fixed, true);
  });

  test('just before new moon is Naga', () => {
    // 12:00 UTC: Moon − Sun ≈ 356.9°
    const karana = getKarana(947160000);
    assert.equal(karana.name, 'Naga');
    assert.equal(karana.fixed, true);
  });
});
