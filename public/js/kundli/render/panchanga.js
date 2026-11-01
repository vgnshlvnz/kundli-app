// Panchanga tab markup. Pure: takes a computePanchanga() result and returns an HTML string,
// so it can be tested without a DOM. All text comes from the calculation tables, not user input.

import { calendarName } from '../i18n/index.js';
import { NAKSHATRAS, isFixedKarana } from '../panchanga/index.js';

const PAKSHA_ENGLISH = { shukla: 'Waxing', krishna: 'Waning' };

/**
 * @param {import('../panchanga/contracts.js').Panchanga} p
 * @param {{ t: (key: string, vars?: object) => string, tr: (name: string) => string, lang: string, timeZone: string }} ctx
 * @returns {string}
 */
export function panchangaHtml(p, { t, tr, lang, timeZone }) {
  const date = u => new Date(u * 1000).toLocaleDateString('en-CA', { timeZone });
  const minutes = u => new Date(u * 1000).toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  const seconds = u => `${new Date(u * 1000).toLocaleTimeString('en-GB', { timeZone, hour12: false })} (${timeZone})`;
  const stamp = u => `${date(u)} ${minutes(u)}`;
  const span = s => t('panchanga.span', { start: stamp(s.startUtc), end: stamp(s.endUtc) });
  const until = s => t('panchanga.until', { end: stamp(s.endUtc) });
  const row = (label, value) => `<tr><th>${label}</th><td>${value}</td></tr>`;
  const note = text => `<tr><td colspan="2">${text}</td></tr>`;
  const table = (heading, rows) => `<h4>${heading}</h4><table class="chart-table">${rows.filter(Boolean).join('')}</table>`;

  const { atBirth: b, atSunrise: s, hinduDay: d, lunarMonth: lm, tamilSolar: ts, flags } = p;
  const paksha = a => `${tr(PAKSHA_ENGLISH[a.paksha.name])} (${tr(a.paksha.name)})`;
  const lord = a => tr(NAKSHATRAS[a.nakshatra.index].lord);

  const birthRows = [
    row(t('panchanga.tithi'), `${tr(b.tithi.name)} (${b.tithi.index + 1}) · ${span(b.tithi)}`),
    row(t('panchanga.paksha'), paksha(b)),
    row(t('panchanga.nakshatra'), `${tr(b.nakshatra.name)} (${t('dasha.lord')}: ${lord(b)}) · ${t('panchanga.pada')} ${b.pada} · ${span(b.nakshatra)}`),
    row(t('panchanga.yoga'), `${tr(b.yoga.name)} · ${span(b.yoga)}`),
    row(t('panchanga.karana'), `${tr(b.karana.name)}${isFixedKarana(b.karana.index) ? ` ${t('panchanga.fixed')}` : ''} · ${span(b.karana)}`)
  ];

  const dayRows = [
    d.vara && row(t('panchanga.vara'), `${lang === 'ta' ? tr(d.vara.english) : `${d.vara.name} (${d.vara.english})`}${d.isPreviousCivilDay ? ` ${t('panchanga.varaPrev')}` : ''}`),
    d.sunriseUtc !== null && row(t('panchanga.sunrise'), seconds(d.sunriseUtc)),
    d.sunsetUtc !== null && row(t('panchanga.sunset'), seconds(d.sunsetUtc)),
    d.nextSunriseUtc !== null && row(t('panchanga.nextSunrise'), seconds(d.nextSunriseUtc)),
    p.ghatiSinceSunrise && row(t('panchanga.sinceSunrise'), t('panchanga.ghatiValue', p.ghatiSinceSunrise)),
    p.horaLord && row(t('panchanga.hora'), tr(p.horaLord)),
    flags.noSunrise && note(t('panchanga.noSunrise'))
  ];

  const sunriseRows = s && [
    row(t('panchanga.tithi'), `${tr(s.tithi.name)} (${s.tithi.index + 1}) · ${until(s.tithi)}`),
    row(t('panchanga.paksha'), paksha(s)),
    row(t('panchanga.nakshatra'), `${tr(s.nakshatra.name)} (${t('dasha.lord')}: ${lord(s)}) · ${t('panchanga.pada')} ${s.pada} · ${until(s.nakshatra)}`),
    row(t('panchanga.yoga'), `${tr(s.yoga.name)} · ${until(s.yoga)}`),
    row(t('panchanga.karana'), `${tr(s.karana.name)} · ${until(s.karana)}`)
  ];

  const calendarRows = [
    row(t('panchanga.lunarMonth'), `${calendarName(lang, 'lunar', lm.name)}${lm.adhika ? ` ${t('panchanga.adhika')}` : ''}`),
    ts && row(t('panchanga.tamilMonth'), calendarName(lang, 'tamilMonth', ts.month)),
    ts && row(t('panchanga.tamilDate'), String(ts.date)),
    ts && row(t('panchanga.tamilYear'), calendarName(lang, 'year60', ts.year60Name)),
    flags.kshayaTithi && note(t('panchanga.kshayaTithi')),
    flags.adhikaTithi && note(t('panchanga.adhikaTithi'))
  ];

  return `<h3>${t('panchanga.heading')}</h3>${[
    table(t('panchanga.atBirth'), birthRows),
    table(t('panchanga.hinduDay'), dayRows),
    sunriseRows ? table(t('panchanga.atSunrise'), sunriseRows) : '',
    table(t('panchanga.calendar'), calendarRows)
  ].join('')}`;
}
