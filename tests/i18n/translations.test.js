import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { translate, term, planetAbbreviation, tamilMonth } from '../../public/js/kundli/i18n/index.js';
import { computePlanets } from '../../public/js/kundli/ephemeris/index.js';
import { getNakshatra } from '../../public/js/kundli/dasha/index.js';
import { calculatePanchanga } from '../../public/js/kundli/panchanga/index.js';
import { kpLords } from '../../public/js/kundli/kp/index.js';

const TAMIL = /[஀-௿]/;

// UI keys used by index.html and app.js
function usedKeys() {
  const html = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../../public/js/app.js', import.meta.url), 'utf8');
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) keys.add(m[1]);
  for (const m of js.matchAll(/\bt\('([^']+)'/g)) keys.add(m[1]);
  return [...keys];
}

// Every astrological name the calculation modules can hand to the UI
function moduleNames() {
  const names = new Set();
  const place = { longitude: 80.2707, latitude: 13.0827 };
  computePlanets({ utc: 631765800, ...place }, 'lahiri').forEach(p => names.add(p.name));
  for (let lon = 0; lon < 360; lon += 0.5) {
    names.add(getNakshatra(lon).name);
    const lords = kpLords(lon);
    ['sign', 'star', 'sub', 'subSub', 'signLord'].forEach(k => names.add(lords[k]));
  }
  // Every 3 hours for 35 days covers all tithis, yogas, karanas and weekdays
  for (let i = 0; i < 280; i++) {
    const p = calculatePanchanga({ utc: 631765800 + i * 3 * 3600, ...place }, 'lahiri');
    [p.tithi.name, p.paksha.name, p.paksha.english, p.nakshatra.name, p.nakshatra.lord,
      p.yoga.name, p.karana.name, p.vara.english].forEach(n => names.add(n));
  }
  return [...names];
}

describe('Tamil translations', () => {
  test('Every UI key used in the page has English and Tamil text', () => {
    const keys = usedKeys();
    assert.ok(keys.length > 80, `expected many keys, found ${keys.length}`);
    for (const key of keys) {
      assert.notEqual(translate('en', key), key, `missing English text for ${key}`);
      assert.match(translate('ta', key), TAMIL, `missing Tamil text for ${key}`);
    }
  });

  test('Tamil text keeps the same placeholders as English', () => {
    for (const key of usedKeys()) {
      const placeholders = text => (text.match(/\{\w+\}/g) || []).sort().join();
      assert.equal(placeholders(translate('ta', key, {})), placeholders(translate('en', key, {})), key);
    }
  });

  test('Placeholders are filled', () => {
    assert.equal(translate('en', 'timezone.label', { tz: 'Asia/Kolkata' }), 'Timezone: Asia/Kolkata');
    assert.equal(translate('ta', 'timezone.label', { tz: 'Asia/Kolkata' }), 'நேர மண்டலம்: Asia/Kolkata');
  });

  test('Every name from the calculation modules has a Tamil name', () => {
    const names = moduleNames();
    assert.ok(names.length >= 100, `expected all name sets, found ${names.length}`);
    for (const name of names) {
      assert.match(term('ta', name), TAMIL, `no Tamil name for "${name}"`);
    }
  });

  test('English names pass through unchanged', () => {
    assert.equal(term('en', 'Purva Phalguni'), 'Purva Phalguni');
    assert.equal(term('ta', 'Purva Phalguni'), 'பூரம்');
    assert.equal(term('ta', 'Pisces'), 'மீனம்');
  });

  test('Planet abbreviations exist in Tamil only', () => {
    for (const planet of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
      assert.match(planetAbbreviation('ta', planet), TAMIL);
      assert.equal(planetAbbreviation('en', planet), undefined);
    }
  });

  test('Tamil month follows the Sun\'s sidereal sign', () => {
    assert.equal(tamilMonth('ta', 0), 'சித்திரை');   // Sun in Mesham
    assert.equal(tamilMonth('ta', 9), 'தை');         // Sun in Makaram
    assert.equal(tamilMonth('ta', 11), 'பங்குனி');   // Sun in Meenam
    assert.equal(tamilMonth('en', 8), 'Margazhi (மார்கழி)');
  });
});
