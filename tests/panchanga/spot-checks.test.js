import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { computePanchanga } from '../../public/js/kundli/panchanga/index.js';

// Hand-entered from printed Tamil calendar sheets. Place is assumed Chennai (sunrise 06:03 fits it).
// Only what the printed sheet states AND the module can be held to is asserted.
const CHENNAI = { latitude: 13.08268, longitude: 80.270718, timezone: 'Asia/Kolkata' };

describe('Printed Tamil panchangam spot checks', () => {
  test('Sun 1 Nov 2026 (mahacalendar sheet): Parabhava, Aippasi 15, Sunday, sunrise 6.03, Krishna Saptami', () => {
    const utc = Date.UTC(2026, 10, 1, 6, 30) / 1000; // 12:00 IST, any time of that Hindu day
    const p = computePanchanga({ utc, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.deepEqual(p.tamilSolar, { month: 'Aippasi', date: 15, year60Name: 'Parabhava' });
    assert.equal(p.hinduDay.vara.english, 'Sunday');
    const sunrise = new Date(p.hinduDay.sunriseUtc * 1000)
      .toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    assert.equal(sunrise, '06:02'); // printed 6.03; the module's 06:02:37 is within the sheet's whole-minute rounding
    assert.equal(p.atSunrise.paksha.name, 'krishna');
    assert.equal(p.atSunrise.tithi.name, 'Saptami');

    // This date discriminates the sunset rule: Tula sankranti was 17 Oct 19:48 IST, after that day's
    // 17:48 sunset, so day 1 is 18 Oct. A midnight cutoff would have printed Aippasi 16.
  });

  test('Sat 3 Oct 2026: Saturday, Krishna Saptami and Ardra at sunrise', () => {
    const p = computePanchanga({ utc: Date.UTC(2026, 9, 3, 6, 30) / 1000, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.equal(p.hinduDay.vara.english, 'Saturday');
    assert.deepEqual([p.atSunrise.paksha.name, p.atSunrise.tithi.name, p.atSunrise.nakshatra.name], ['krishna', 'Saptami', 'Ardra']);
    assert.equal(p.tamilSolar.year60Name, 'Parabhava');
    // Printed times are NOT asserted: sheet Saptami ends 10:14 / Ardra ends 04:06 next day; astronomy gives 08:00 / 01:29.
  });

  test('Sat 17 Oct 2026: Shukla Saptami spans the whole day (adhika); Moola ends ~09:53 then Purva Ashadha', () => {
    const p = computePanchanga({ utc: Date.UTC(2026, 9, 17, 6, 30) / 1000, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.equal(p.hinduDay.vara.english, 'Saturday');
    assert.deepEqual([p.atSunrise.paksha.name, p.atSunrise.tithi.name], ['shukla', 'Saptami']);
    assert.equal(p.flags.adhikaTithi, true); // sheet: Saptami 60.00 (full day)
    assert.equal(p.atSunrise.nakshatra.name, 'Mula');
    const printed = Date.UTC(2026, 9, 17, 4, 23) / 1000; // 09:53 IST
    assert.ok(Math.abs(p.atSunrise.nakshatra.endUtc - printed) <= 10 * 60, 'Moola ends within 10 min of the printed 09:53');
  });

  test('Sun 18 Oct 2026: Aippasi 1 (first day after the post-sunset Tula sankranti), Shukla Saptami, Purva Ashadha', () => {
    const p = computePanchanga({ utc: Date.UTC(2026, 9, 18, 6, 30) / 1000, ...CHENNAI }, { ayanamsa: 'lahiri' });
    assert.deepEqual(p.tamilSolar, { month: 'Aippasi', date: 1, year60Name: 'Parabhava' });
    assert.equal(p.hinduDay.vara.english, 'Sunday');
    assert.deepEqual([p.atSunrise.paksha.name, p.atSunrise.tithi.name, p.atSunrise.nakshatra.name], ['shukla', 'Saptami', 'Purva Ashadha']);
    // Printed times NOT asserted: sheet Saptami ends 07:09 / Purva Ashadha ends 12:22; astronomy gives 08:28 / 12:48.
  });

  // The printed mahacalendar sheets put Purattasi 1 on 18 Sep (3 Oct = Purattasi 16, 17 Oct = 30). Drik Panchang's
  // Tamil month grid (below) puts it on 17 Sep, on the Kanya sankranti day, matching the astronomical sunset rule.
  // The sheets' tithi/nakshatra times are also hours off astronomy; they appear to be Vakya, so they are used only for
  // names and the dates where they agree.

  // NOT asserted for 1 Nov 2026: the sheet prints Saptami until 19:19 and Punarvasu until 10:32 (then Pushya);
  // astronomy (module, pyswisseph) gives Saptami until 14:52 and Pushya from 05:39.
});

// Drik Panchang (Thirukanitha / Lahiri), transcribed by hand. Times are to the minute on Drik's side, so 2 min tolerance.
describe('Drik Panchang spot checks', () => {
  const near = (utc, hhmmUtc, what) => {
    const [d, h, m] = hhmmUtc;
    const want = Date.UTC(d[0], d[1], d[2], h, m) / 1000;
    assert.ok(Math.abs(utc - want) <= 120, `${what}: off by ${Math.round((utc - want) / 60)} min`);
  };

  test('Kuala Lumpur, Fri 18 Sep 2026 (screenshot, Drik default place sunrise 07:04 sunset 19:11 MYT)', () => {
    const KL = { latitude: 3.139003, longitude: 101.686855, timezone: 'Asia/Kuala_Lumpur' };
    const p = computePanchanga({ utc: Date.UTC(2026, 8, 18, 4, 0) / 1000, ...KL }, { ayanamsa: 'lahiri' });
    const a = p.atSunrise;
    assert.equal(p.hinduDay.vara.english, 'Friday');
    assert.deepEqual([a.paksha.name, a.tithi.name, a.nakshatra.name, a.yoga.name, a.karana.name],
      ['shukla', 'Saptami', 'Jyeshtha', 'Priti', 'Vanija']);
    // MYT = UTC+8
    near(p.hinduDay.sunriseUtc, [[2026, 8, 17], 23, 4], 'sunrise');
    near(p.hinduDay.sunsetUtc, [[2026, 8, 18], 11, 11], 'sunset');
    near(a.tithi.endUtc, [[2026, 8, 18], 7, 30], 'tithi end');
    near(a.nakshatra.endUtc, [[2026, 8, 18], 17, 14], 'nakshatra end');
    near(a.yoga.endUtc, [[2026, 8, 18], 8, 5], 'yoga end');
    near(a.karana.endUtc, [[2026, 8, 18], 7, 30], 'karana end');
    assert.equal(p.lunarMonth.name, 'Bhadrapada');
  });

  test('Chennai, Tue 21 Jun 2022: Krishna Ashtami, Uttara Bhadrapada, Jyeshtha amanta / Ashadha purnimanta', () => {
    const utc = Date.UTC(2022, 5, 21, 6, 30) / 1000;
    const b = { utc, ...CHENNAI };
    const p = computePanchanga(b, { ayanamsa: 'lahiri' });
    const a = p.atSunrise;
    assert.equal(p.hinduDay.vara.english, 'Tuesday');
    assert.deepEqual([a.paksha.name, a.tithi.name, a.nakshatra.name, a.yoga.name, a.karana.name],
      ['krishna', 'Ashtami', 'Uttara Bhadrapada', 'Ayushman', 'Balava']);
    near(a.tithi.endUtc, [[2022, 5, 21], 15, 0], 'tithi end 20:30 IST');
    near(a.nakshatra.endUtc, [[2022, 5, 21], 23, 33], 'nakshatra end 05:03 IST next day');
    assert.equal(computePanchanga(b, { ayanamsa: 'lahiri', lunarSystem: 'amanta' }).lunarMonth.name, 'Jyeshtha');
    assert.equal(computePanchanga(b, { ayanamsa: 'lahiri', lunarSystem: 'purnimanta' }).lunarMonth.name, 'Ashadha');
  });
});

describe('Drik Panchang Tamil month grid, September 2026 (Kuala Lumpur)', () => {
  // Read from drikpanchang.com/tamil/tamil-month-panchangam.html: the small number on each day is the Tamil date.
  // Kanya (Purattasi) sankranti was 17 Sep 07:49 IST, before that day's sunset, so Purattasi 1 = 17 Sep.
  const KL = { latitude: 3.139003, longitude: 101.686855, timezone: 'Asia/Kuala_Lumpur' };
  const cases = [
    ['2026-09-01', 'Avani', 16], ['2026-09-08', 'Avani', 23], ['2026-09-15', 'Avani', 30], ['2026-09-16', 'Avani', 31],
    ['2026-09-17', 'Purattasi', 1], ['2026-09-18', 'Purattasi', 2], ['2026-09-19', 'Purattasi', 3],
    ['2026-09-22', 'Purattasi', 6], ['2026-09-26', 'Purattasi', 10], ['2026-09-29', 'Purattasi', 13],
    ['2026-10-01', 'Purattasi', 15]
  ];
  for (const [date, month, day] of cases) {
    test(`${date} is ${month} ${day}`, () => {
      const [y, m, d] = date.split('-').map(Number);
      const p = computePanchanga({ utc: Date.UTC(y, m - 1, d, 4, 0) / 1000, ...KL }, { ayanamsa: 'lahiri' });
      assert.deepEqual([p.tamilSolar.month, p.tamilSolar.date], [month, day]);
    });
  }
});
