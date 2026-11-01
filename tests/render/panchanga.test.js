import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { panchangaHtml } from '../../public/js/kundli/render/panchanga.js';
import { computePanchanga } from '../../public/js/kundli/panchanga/index.js';
import { translate, term } from '../../public/js/kundli/i18n/index.js';

const CHENNAI = { latitude: 13.08268, longitude: 80.270718, timezone: 'Asia/Kolkata' };
const TROMSO = { latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo' };

const render = (birth, lang = 'en') => panchangaHtml(
  computePanchanga(birth, { ayanamsa: 'lahiri' }),
  { t: (k, v) => translate(lang, k, v), tr: n => term(lang, n), lang, timeZone: birth.timezone }
);
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('Panchanga tab', () => {
  test('shows angas at birth with start and end, Hindu day, angas at sunrise and the calendar', () => {
    const t = text(render({ utc: Date.UTC(2026, 10, 1, 6, 30) / 1000, ...CHENNAI }));
    for (const part of ['At birth', 'Saptami (22)', '2026-10-31 16:57 → 2026-11-01 14:52', 'Pushya', 'Pada 2',
      'Hindu day', 'Ravivara (Sunday)', '06:02:37 (Asia/Kolkata)', 'Since sunrise', '14 ghati 53 vighati',
      'At sunrise', 'until 2026-11-01 14:52', 'Ashwina', 'Aippasi (ஐப்பசி)', 'Tamil date 15', 'Parabhava']) {
      assert.ok(t.includes(part), `missing "${part}" in: ${t}`);
    }
    assert.ok(!t.includes('(adhika)') && !t.includes('Kshaya'));
  });

  test('Tamil mode uses Tamil names throughout', () => {
    const t = text(render({ utc: Date.UTC(2026, 10, 1, 6, 30) / 1000, ...CHENNAI }, 'ta'));
    for (const part of ['சப்தமி', '2026-10-31 16:57 முதல் 2026-11-01 14:52 வரை', 'பூசம்', 'ஞாயிற்றுக்கிழமை', 'ஆஸ்வயுஜம்', 'ஐப்பசி', 'பராபவ']) {
      assert.ok(t.includes(part), `missing "${part}"`);
    }
    assert.ok(!t.includes('{'), 'no unfilled placeholders');
  });

  test('a pre-sunrise birth is marked as the previous civil day', () => {
    // 03:00 IST on 2010-11-09: the Hindu day began on the 8th
    const t = text(render({ utc: Date.UTC(2010, 10, 8, 21, 30) / 1000, ...CHENNAI }));
    assert.ok(t.includes('Somavara (Monday) (previous civil day)'), t);
  });

  test('kshaya and adhika tithi are announced', () => {
    const kshaya = text(render({ utc: Date.UTC(2026, 9, 3, 6, 30) / 1000, ...CHENNAI }));
    assert.ok(kshaya.includes('Kshaya tithi'), kshaya);
    const adhika = text(render({ utc: Date.UTC(2026, 9, 17, 6, 30) / 1000, ...CHENNAI }));
    assert.ok(adhika.includes('Adhika tithi'), adhika);
  });

  test('an adhika lunar month is marked', () => {
    const t = text(render({ utc: Date.UTC(2023, 7, 1, 6) / 1000, ...CHENNAI }));
    assert.ok(t.includes('Shravana (adhika)'), t);
  });

  test('polar day: a notice, no sunrise rows, no at-sunrise table, and nothing throws', () => {
    for (const utc of [Date.UTC(2023, 5, 21, 10) / 1000, Date.UTC(2023, 11, 21, 10) / 1000]) {
      for (const lang of ['en', 'ta']) {
        const html = render({ utc, ...TROMSO }, lang);
        const t = text(html);
        assert.ok(t.includes(lang === 'en' ? 'does not rise or set' : 'உதிப்பதோ மறைவதோ இல்லை'), t);
        assert.ok(!t.includes('Since sunrise') && !t.includes('At sunrise'));
        assert.ok(!html.includes('undefined') && !html.includes('null') && !html.includes('NaN'));
        assert.ok(t.includes('Tithi') || t.includes('திதி'), 'angas at birth are still shown');
      }
    }
  });
});
