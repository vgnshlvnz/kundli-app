// Kundli Calculator - Main Application
// Single-page vanilla JS app for Vedic birth chart calculation

import { resolveBirth, searchLocations, localToUtc } from './kundli/geo/index.js';
import { computePlanets, SECONDS_PER_YEAR } from './kundli/ephemeris/index.js';
import { calculateHouses } from './kundli/houses/index.js';
import { computeVimshottariDasha, computeBhuktis, getNakshatra, splitYears } from './kundli/dasha/index.js';
import { calculatePanchanga } from './kundli/panchanga/index.js';
import { kpLords, signLord, significators } from './kundli/kp/index.js';
import { computeVarga } from './kundli/vargas/index.js';
import { southIndianChart } from './kundli/render/index.js';
import { LANGUAGES, translate, term, planetAbbreviation, tamilMonth } from './kundli/i18n/index.js';

const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const LANGUAGE_KEY = 'kundli-language';

// Current interface language; t() looks up UI text, tr() astrological names
let lang = 'en';
const t = (key, vars) => translate(lang, key, vars);
const tr = name => term(lang, name);

// App state
const state = {
  settings: {
    ayanamsa: 'lahiri',
    houseSystem: 'wholesign',
    chartStyle: 'basic'
  },
  resolvedBirth: null,
  planets: null,
  houses: null,
  dasha: null,
  panchanga: null,
  currentTab: 'rasi'
};

// DOM references (initialized on DOMContentLoaded)
let appEl, formEl, resultsEl;
let nameInput, dateInput, timeInput, locationInput, locationDropdown, locationError;
let settingsAyanamsa, settingsHouse, settingsStyle;
let tabContainer, tabs = {};
let utcOffsetEl;

// Debounce utility
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);

function init() {
  appEl = document.getElementById('app');
  formEl = document.getElementById('birth-form');
  resultsEl = document.getElementById('results');

  // Form fields
  nameInput = document.getElementById('birth-name');
  dateInput = document.getElementById('birth-date');
  timeInput = document.getElementById('birth-time');
  locationInput = document.getElementById('birth-location');
  locationDropdown = document.getElementById('location-dropdown');
  locationError = document.getElementById('location-error');
  utcOffsetEl = document.getElementById('utc-offset');

  // Settings
  settingsAyanamsa = document.getElementById('settings-ayanamsa');
  settingsHouse = document.getElementById('settings-house');
  settingsStyle = document.getElementById('settings-style');

  // Tab container
  tabContainer = document.getElementById('tab-container');
  ['rasi', 'navamsa', 'planets', 'vimshottari', 'panchanga', 'kp'].forEach(id => {
    tabs[id] = document.getElementById(`tab-${id}`);
  });
  document.getElementById('download-pdf').addEventListener('click', downloadPdf);
  document.querySelectorAll('.language-switch button').forEach(btn => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });

  // Event listeners
  formEl.addEventListener('submit', handleSubmit);
  locationInput.addEventListener('input', () => {
    // Typing invalidates a previously chosen location
    for (const key of ['locationId', 'latitude', 'longitude', 'timezone']) delete locationInput.dataset[key];
    debouncedSearch();
  });
  locationInput.addEventListener('keydown', handleLocationKeys);
  settingsAyanamsa.addEventListener('change', e => {
    state.settings.ayanamsa = e.target.value;
    recalculate();
  });
  settingsHouse.addEventListener('change', e => {
    state.settings.houseSystem = e.target.value;
    recalculate();
  });
  settingsStyle.addEventListener('change', e => {
    state.settings.chartStyle = e.target.value;
    updateAdvancedTabs();
  });
  tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Close location dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#location-wrapper')) {
      locationDropdown.classList.add('hidden');
    }
  });

  // Set default date to today
  const today = new Date();
  dateInput.value = today.toISOString().split('T')[0];

  renderForm();

  let saved = null;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch (e) { /* storage unavailable */ }
  if (LANGUAGES.includes(saved)) setLanguage(saved);
}

// Switch the interface language and redraw any results already on screen
function setLanguage(newLang) {
  lang = newLang;
  document.documentElement.lang = lang;
  try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (e) { /* storage unavailable */ }
  document.title = t('app.title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder, { value: el.dataset.i18nValue });
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('.language-switch button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });
  if (state.planets) {
    utcOffsetEl.textContent = t('timezone.resolved', { tz: state.resolvedBirth.timezone });
    renderResults();
  } else {
    updateUtcOffset();
  }
}

let debouncedSearch = debounce(searchAndShowResults, 250);

async function searchAndShowResults() {
  const query = locationInput.value.trim();
  if (query.length < 2) {
    locationDropdown.classList.add('hidden');
    return;
  }

  try {
    const results = await searchLocations(query, 10);
    if (results.length > 0) {
      renderLocationDropdown(results);
      locationDropdown.classList.remove('hidden');
      locationError.classList.add('hidden');
    } else {
      locationDropdown.classList.add('hidden');
      showLocationError(t('location.noMatch', { query }));
    }
  } catch (e) {
    console.error('Location search failed:', e);
    locationDropdown.classList.add('hidden');
    showLocationError(t('location.unavailable'));
  }
}

function showLocationError(message) {
  locationError.textContent = message;
  locationError.classList.remove('hidden');
}

// Arrow keys move through the dropdown, Enter picks, Escape closes
function handleLocationKeys(e) {
  const items = [...locationDropdown.querySelectorAll('.location-item')];
  if (locationDropdown.classList.contains('hidden') || items.length === 0) return;
  const current = items.findIndex(item => item.classList.contains('active'));
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items.forEach((item, i) => item.classList.toggle('active', i === next));
    items[next].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && current >= 0) {
    e.preventDefault();
    items[current].click();
  } else if (e.key === 'Escape') {
    locationDropdown.classList.add('hidden');
  }
}

function renderLocationDropdown(results) {
  locationDropdown.innerHTML = '';
  results.forEach(loc => {
    const item = document.createElement('div');
    item.className = 'location-item';
    // Skip parts that repeat the previous one (e.g. "Bavaria, Bavaria" or "India, India")
    const parts = [loc.name, loc.state, loc.country].filter((p, i, a) => p && p !== a[i - 1] && !(i === 2 && p === a[0]));
    item.textContent = parts.join(', ');
    if (loc.centroid) {
      const badge = document.createElement('span');
      badge.className = 'centroid-badge';
      badge.textContent = t('location.centroid');
      item.append(' ', badge);
    }
    item.addEventListener('click', () => selectLocation(loc));
    locationDropdown.appendChild(item);
  });
}

function selectLocation(loc) {
  locationInput.value = `${loc.name}, ${loc.country}`;
  locationInput.dataset.locationId = loc.id;
  locationInput.dataset.latitude = loc.latitude;
  locationInput.dataset.longitude = loc.longitude;
  locationInput.dataset.timezone = loc.tz;
  locationDropdown.classList.add('hidden');
  updateUtcOffset();
}

async function updateUtcOffset() {
  if (locationInput.dataset.timezone) {
    try {
      // Estimate offset by converting a test date
      const testDate = dateInput.value || '2000-01-01';
      const testTime = timeInput.value || '12:00:00';
      const localTimeStr = `${testDate}T${testTime}`;
      const tz = locationInput.dataset.timezone;
      // Try conversion to get offset (we'll use the actual convert for calculation)
      utcOffsetEl.textContent = t('timezone.label', { tz });
    } catch (e) {
      utcOffsetEl.textContent = '';
    }
  } else {
    utcOffsetEl.textContent = '';
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  resultsEl.classList.add('hidden');
  locationError.classList.add('hidden');

  try {
    // Resolve birth data
    const input = {
      localBirthTime: `${dateInput.value}T${timeInput.value}`,
    };

    const picked = locationInput.dataset;
    if (picked.locationId) {
      // Use the location chosen from the dropdown, not a re-search of its label
      input.latitude = parseFloat(picked.latitude);
      input.longitude = parseFloat(picked.longitude);
      input.timezone = picked.timezone;
    } else {
      input.locationQuery = locationInput.value;
    }

    state.resolvedBirth = await resolveBirth(input);

    // Convert resolved birth time to unix timestamp
    const birthDate = new Date(state.resolvedBirth.utcBirthTime);
    const utcSeconds = Math.floor(birthDate.getTime() / 1000);

    // Compute planets
    state.planets = computePlanets({
      utc: utcSeconds,
      longitude: state.resolvedBirth.longitude,
      latitude: state.resolvedBirth.latitude
    }, state.settings.ayanamsa);

    // Compute houses
    state.houses = calculateHouses({
      utc: utcSeconds,
      longitude: state.resolvedBirth.longitude,
      latitude: state.resolvedBirth.latitude
    }, state.settings.ayanamsa, state.settings.houseSystem);

    // Compute Vimshottari dasha
    const moonPlanet = state.planets.find(p => p.name === 'Moon');
    state.dasha = computeVimshottariDasha({ utc: utcSeconds }, moonPlanet.siderealLongitude);

    // Compute panchanga
    state.panchanga = calculatePanchanga({
      utc: utcSeconds,
      longitude: state.resolvedBirth.longitude,
      latitude: state.resolvedBirth.latitude
    }, state.settings.ayanamsa);

    // Update UTC offset display with actual conversion result
    utcOffsetEl.textContent = t('timezone.resolved', { tz: state.resolvedBirth.timezone });

    renderResults();

    // Show results
    resultsEl.classList.remove('hidden');
    switchTab('rasi');

  } catch (e) {
    console.error('Calculation failed:', e);
    locationError.textContent = e.message;
    locationError.classList.remove('hidden');
  }
}

// Render all tabs from the computed state
function renderResults() {
  renderPrintSummary();
  renderKeyFacts();
  renderRasiTab();
  renderNavamsaTab();
  renderPlanetsTab();
  renderVimshottariTab();
  renderPanchangaTab();
  renderKpTab();
}

function recalculate() {
  if (state.resolvedBirth) {
    handleSubmit(new Event('submit'));
  }
}

function switchTab(tabId) {
  state.currentTab = tabId;
  // Update tab button styles
  tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  // Show/hide tab content
  Object.keys(tabs).forEach(id => {
    tabs[id].style.display = id === tabId ? 'block' : 'none';
  });
}

function updateAdvancedTabs() {
  // If basic style, hide advanced tabs (vimshottari, panchanga, kp, navamsa)
  const advancedTabs = ['navamsa', 'vimshottari', 'panchanga', 'kp'];
  if (state.settings.chartStyle === 'basic') {
    advancedTabs.forEach(id => {
      tabs[id].style.display = 'none';
    });
    tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
      if (advancedTabs.includes(btn.dataset.tab)) {
        btn.style.display = 'none';
      }
    });
    if (advancedTabs.includes(state.currentTab)) {
      switchTab('planets');
    }
  } else {
    tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.style.display = 'block';
    });
    // Re-render advanced content if needed
    if (state.resolvedBirth) {
      recalculate();
    }
  }
}

// Tab rendering functions

function renderRasiTab() {
  if (!state.planets || !state.houses) return;

  const asc = state.houses.siderealAscendant;
  const ascSign = Math.floor(asc / 30);

  let html = `
    <h3>${t('rasi.heading')}</h3>
    ${southIndianChart({
      title: t('rasi.title'),
      subtitle: chartSubtitle(),
      ascendantSign: ascSign,
      planets: state.planets.map(p => ({ ...chartPlanet(p), degree: p.degreeInSign })),
      labels: chartLabels(t('rasi.title'))
    })}
    <p><strong>${t('rasi.ascendant')}:</strong> ${tr(SIGN_NAMES[ascSign])} ${(asc - ascSign * 30).toFixed(2)}°</p>
    <table class="chart-table">
      <thead>
        <tr>
          <th>${t('col.planet')}</th>
          <th>${t('col.sign')}</th>
          <th>${t('col.degree')}</th>
          <th>${t('col.house')}</th>
          <th>${t('col.retrograde')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.planets.forEach(p => {
    const signName = tr(SIGN_NAMES[p.sign]);
    const house = getHouseNumber(p.siderealLongitude);
    html += `
      <tr>
        <td>${tr(p.name)}</td>
        <td>${signName}</td>
        <td>${p.degreeInSign.toFixed(2)}°</td>
        <td>${house}</td>
        <td>${p.retrograde ? t('yes') : t('no')}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tabs['rasi'].innerHTML = html;
}

function renderNavamsaTab() {
  if (!state.planets || !state.houses) return;

  // Varga functions read `longitude`; pass the sidereal one
  const d1 = state.planets.map(p => ({ ...p, longitude: p.siderealLongitude }));
  const d9 = computeVarga(d1, state.houses.siderealAscendant, 9);

  const d9AscSign = Math.floor(d9.ascendant / 30);

  let html = `
    <h3>${t('navamsa.heading')}</h3>
    ${southIndianChart({
      title: t('navamsa.title'),
      subtitle: chartSubtitle(),
      ascendantSign: d9AscSign,
      planets: d9.planets.map(chartPlanet),
      labels: chartLabels(t('navamsa.title'))
    })}
    <p><strong>${t('navamsa.ascendant')}:</strong> ${tr(SIGN_NAMES[d9AscSign])} ${(d9.ascendant % 30).toFixed(2)}°</p>
    <table class="chart-table">
      <thead>
        <tr>
          <th>${t('col.planet')}</th>
          <th>${t('col.sign')}</th>
          <th>${t('col.degree')}</th>
          <th>${t('col.house')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  d9.planets.forEach(p => {
    const signName = tr(SIGN_NAMES[p.sign]);
    html += `
      <tr>
        <td>${tr(p.name)}</td>
        <td>${signName}</td>
        <td>${p.degree.toFixed(2)}°</td>
        <td>${((p.sign - d9AscSign + 12) % 12) + 1}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tabs['navamsa'].innerHTML = html;
}

function renderPlanetsTab() {
  if (!state.planets) return;

  let html = `
    <h3>${t('planets.heading')}</h3>
    <table class="chart-table">
      <thead>
        <tr>
          <th>${t('col.planet')}</th>
          <th>${t('col.sign')}</th>
          <th>${t('col.degree')}</th>
          <th>${t('col.house')}</th>
          <th>${t('col.nakshatra')}</th>
          <th>${t('col.pada')}</th>
          <th>${t('col.speed')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.planets.forEach(p => {
    const signName = tr(SIGN_NAMES[p.sign]);
    const house = getHouseNumber(p.siderealLongitude);
    const nakshatra = getNakshatra(p.siderealLongitude);
    // Each nakshatra (13°20') has four padas of 3°20'
    const pada = Math.floor((p.siderealLongitude % (40 / 3)) / (10 / 3)) + 1;
    const speed = Math.abs(p.speed).toFixed(3);
    html += `
      <tr>
        <td>${tr(p.name)}</td>
        <td>${signName}</td>
        <td>${p.degreeInSign.toFixed(4)}°</td>
        <td>${house}</td>
        <td>${tr(nakshatra.name)}</td>
        <td>${pada}</td>
        <td>${speed}${t('perDay')}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tabs['planets'].innerHTML = html;
}

function renderVimshottariTab() {
  if (!state.dasha) return;

  const now = new Date();
  const currentYear = now.getFullYear();

  const { currentMahadasha, currentBhukti } = state.dasha;
  const nowUtc = now.getTime() / 1000;
  // "Saturn · 2017-03-01 – 2036-03-01 · 9y 4m 10d remaining"
  const currentPeriod = p => `${tr(p.planet)} · ${dateRange(p)} · ${t('dasha.remaining', { time: formatYmd((p.end - nowUtc) / SECONDS_PER_YEAR) })}`;

  let html = `
    <h3>${t('dasha.heading')}</h3>
    <p><strong>${t('dasha.born')}:</strong> ${state.dasha.birthYear}</p>
    <p><strong>${t('dasha.moonNakshatra')}:</strong> ${tr(state.dasha.moonNakshatra)} (${t('dasha.lord')}: ${tr(state.dasha.moonNakshatraLord)})</p>
    <p><strong>${t('dasha.balance')}:</strong> ${tr(state.dasha.moonNakshatraLord)} · ${formatYmd(state.dasha.remainingFirstMahadashaYears)}</p>
    <p><strong>${t('dasha.currentMahadasha')}:</strong> ${currentMahadasha ? currentPeriod(currentMahadasha) : t('na')}</p>
    ${currentBhukti ? `<p><strong>${t('dasha.currentBhukti')}:</strong> ${currentPeriod(currentBhukti)}</p>` : ''}
    <h4>${t('dasha.timeline')}</h4>
    <table class="chart-table">
      <thead>
        <tr>
          <th>${t('col.planet')}</th>
          <th>${t('col.start')}</th>
          <th>${t('col.end')}</th>
          <th>${t('col.duration')}</th>
          <th>${t('col.current')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.dasha.mahadashas.forEach(md => {
    const isCurrent = currentMahadasha && currentMahadasha.planet === md.planet;
    html += `
      <tr${isCurrent ? ' class="current-period"' : ''}>
        <td>${tr(md.planet)}</td>
        <td>${birthPlaceDate(md.start)}</td>
        <td>${birthPlaceDate(md.end)}</td>
        <td>${md.durationYears.toFixed(2)}</td>
        <td>${isCurrent ? t('yes') : t('no')}</td>
      </tr>
    `;
  });

  html += `</tbody></table><h4>${t('dasha.bhuktis')}</h4>`;

  // One collapsible bhukti table per mahadasha; the running one starts open
  state.dasha.mahadashas.forEach(md => {
    const isCurrentMd = currentMahadasha && currentMahadasha.planet === md.planet;
    html += `
      <details class="bhukti-group"${isCurrentMd ? ' open' : ''}>
        <summary>${t('dasha.group', { planet: tr(md.planet) })} · ${dateRange(md)}</summary>
        <table class="chart-table">
          <thead>
            <tr>
              <th>${t('col.bhukti')}</th>
              <th>${t('col.start')}</th>
              <th>${t('col.end')}</th>
              <th>${t('col.current')}</th>
            </tr>
          </thead>
          <tbody>
    `;
    computeBhuktis(md).forEach(b => {
      const isCurrent = isCurrentMd && currentBhukti && currentBhukti.start === b.start;
      html += `
        <tr${isCurrent ? ' class="current-period"' : ''}>
          <td>${tr(md.planet)} / ${tr(b.planet)}</td>
          <td>${birthPlaceDate(b.start)}</td>
          <td>${birthPlaceDate(b.end)}</td>
          <td>${isCurrent ? t('yes') : t('no')}</td>
        </tr>
      `;
    });
    html += '</tbody></table></details>';
  });

  tabs['vimshottari'].innerHTML = html;
}

function renderPanchangaTab() {
  if (!state.panchanga) return;

  const p = state.panchanga;
  const sun = state.planets.find(planet => planet.name === 'Sun');
  let vara = lang === 'ta' ? tr(p.vara.english) : `${p.vara.name} (${p.vara.english})`;
  // The vara runs sunrise to sunrise, so a pre-dawn birth keeps the previous
  // day's vara; name the calendar day too, as daily panchangas list by it
  const sunriseUtc = p.sunriseSunset.sunriseUtc;
  if (sunriseUtc && birthPlaceDate(p.birthUtc) !== birthPlaceDate(sunriseUtc)) {
    vara += ` · ${t('panchanga.beforeSunrise', { day: tr(birthPlaceWeekday(p.birthUtc)), date: birthPlaceDate(p.birthUtc) })}`;
  }
  let html = `
    <h3>${t('panchanga.heading')}</h3>
    <table class="chart-table">
      <tr><th>${t('panchanga.tithi')}</th><td>${tr(p.tithi.name)} (${p.tithi.number}) - ${t('panchanga.elapsed', { percent: p.tithi.percentage.toFixed(1) })}</td></tr>
      <tr><th>${t('panchanga.paksha')}</th><td>${tr(p.paksha.english)} (${tr(p.paksha.name)})</td></tr>
      <tr><th>${t('panchanga.nakshatra')}</th><td>${tr(p.nakshatra.name)} (${t('dasha.lord')}: ${tr(p.nakshatra.lord)})</td></tr>
      <tr><th>${t('panchanga.yoga')}</th><td>${tr(p.yoga.name)}</td></tr>
      <tr><th>${t('panchanga.karana')}</th><td>${tr(p.karana.name)}${p.karana.fixed ? ` ${t('panchanga.fixed')}` : ''}</td></tr>
      <tr><th>${t('panchanga.vara')}</th><td>${vara}</td></tr>
      <tr><th>${t('panchanga.tamilMonth')}</th><td>${tamilMonth(lang, sun.sign)}</td></tr>
      ${p.sunriseSunset.sunriseUtc ? `<tr><th>${t('panchanga.sunrise')}</th><td>${birthPlaceTime(p.sunriseSunset.sunriseUtc)}</td></tr>` : ''}
      ${p.sunriseSunset.sunsetUtc ? `<tr><th>${t('panchanga.sunset')}</th><td>${birthPlaceTime(p.sunriseSunset.sunsetUtc)}</td></tr>` : ''}
    </table>
  `;
  tabs['panchanga'].innerHTML = html;
}

function renderKpTab() {
  if (!state.planets || !state.houses) return;

  let html = `
    <h3>${t('kp.heading')}</h3>
    <h4>${t('kp.planetSubLords')}</h4>
    <table class="chart-table">
      <thead>
        <tr>
          <th>${t('col.planet')}</th>
          <th>${t('col.sign')}</th>
          <th>${t('col.starLord')}</th>
          <th>${t('col.subLord')}</th>
          <th>${t('col.subSubLord')}</th>
          <th>${t('col.signLord')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.planets.forEach(p => {
    const lords = kpLords(p.siderealLongitude);
    html += `
      <tr>
        <td>${tr(p.name)}</td>
        <td>${tr(lords.sign)}</td>
        <td>${tr(lords.star)}</td>
        <td>${tr(lords.sub)}</td>
        <td>${tr(lords.subSub)}</td>
        <td>${tr(lords.signLord)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <h4>${t('kp.cuspSubLords')}</h4>
    <table class="chart-table">
      <thead>
        <tr>
          <th>${t('col.house')}</th>
          <th>${t('col.cusp')}</th>
          <th>${t('col.sign')}</th>
          <th>${t('col.signLord')}</th>
          <th>${t('col.starLord')}</th>
          <th>${t('col.subLord')}</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.houses.cusps.forEach((cusp, index) => {
    const lords = kpLords(cusp);
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${cusp.toFixed(2)}°</td>
        <td>${tr(lords.sign)}</td>
        <td>${tr(lords.signLord)}</td>
        <td>${tr(lords.star)}</td>
        <td>${tr(lords.sub)}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tabs['kp'].innerHTML = html;
}

// PDF export uses the browser's print dialog ("Save as PDF"); the print
// stylesheet lays out every tab one after another. The page title becomes
// the suggested file name.
function downloadPdf() {
  const originalTitle = document.title;
  const name = nameInput.value.trim();
  document.title = t('pdf.fileName', { name: name || dateInput.value });
  window.addEventListener('afterprint', () => { document.title = originalTitle; }, { once: true });
  window.print();
}

// Headline facts shown above the tabs
function renderKeyFacts() {
  const moon = state.planets.find(p => p.name === 'Moon');
  const { currentMahadasha, currentBhukti } = state.dasha;
  const facts = [
    [t('facts.lagna'), tr(SIGN_NAMES[Math.floor(state.houses.siderealAscendant / 30)])],
    [t('facts.moonSign'), tr(SIGN_NAMES[moon.sign])],
    [t('facts.birthStar'), tr(state.dasha.moonNakshatra)],
    [t('facts.currentDasha'), currentMahadasha
      ? tr(currentMahadasha.planet) + (currentBhukti ? ` / ${tr(currentBhukti.planet)}` : '')
      : t('na')]
  ];
  const container = document.getElementById('key-facts');
  container.innerHTML = '';
  facts.forEach(([label, value]) => {
    const fact = document.createElement('div');
    fact.className = 'key-fact';
    fact.innerHTML = '<span class="key-fact-label"></span><span class="key-fact-value"></span>';
    fact.firstChild.textContent = label;
    fact.lastChild.textContent = value;
    container.appendChild(fact);
  });
}

// Birth details and settings printed at the top of the PDF
function renderPrintSummary() {
  const { timezone } = state.resolvedBirth;
  const rows = [
    [t('print.name'), nameInput.value.trim()],
    [t('print.born'), `${dateInput.value} ${timeInput.value} (${timezone})`],
    [t('print.place'), locationInput.value],
    [t('print.ayanamsa'), settingsAyanamsa.selectedOptions[0].textContent],
    [t('print.houses'), settingsHouse.selectedOptions[0].textContent]
  ].filter(([, value]) => value);
  const summary = document.getElementById('print-summary');
  summary.innerHTML = '<h2></h2><dl></dl>';
  summary.firstChild.textContent = t('print.heading');
  rows.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    summary.querySelector('dl').append(dt, dd);
  });
}

// Helper: a planet as the chart expects it, named in the current language
function chartPlanet(p) {
  return { name: tr(p.name), abbr: planetAbbreviation(lang, p.name), sign: p.sign, retrograde: p.retrograde };
}

// Helper: chart labels in the current language
function chartLabels(title) {
  return {
    signs: SIGN_NAMES.map(tr),
    asc: t('chart.asc'),
    lagna: t('chart.lagna'),
    retroMark: t('chart.retroMark'),
    retrograde: t('chart.retrograde'),
    aria: t('chart.aria', { title })
  };
}

// Helper: centre text of the chart — name (if given) and birth date/time
function chartSubtitle() {
  return [nameInput.value.trim(), `${dateInput.value} ${timeInput.value}`].filter(Boolean).join(' · ');
}

// Helper: format a UTC timestamp (seconds) as local time at the birth place
function birthPlaceTime(utcSeconds) {
  const timeZone = state.resolvedBirth.timezone;
  const time = new Date(utcSeconds * 1000).toLocaleTimeString('en-GB', { timeZone, hour12: false });
  return `${time} (${timeZone})`;
}

// Helper: format a UTC timestamp (seconds) as a YYYY-MM-DD date at the birth place
function birthPlaceDate(utcSeconds) {
  return new Date(utcSeconds * 1000).toLocaleDateString('en-CA', { timeZone: state.resolvedBirth.timezone });
}

// Helper: English weekday of a UTC timestamp (seconds) at the birth place
function birthPlaceWeekday(utcSeconds) {
  return new Date(utcSeconds * 1000).toLocaleDateString('en-US', { timeZone: state.resolvedBirth.timezone, weekday: 'long' });
}

// Helper: "start – end" dates of a dasha period
function dateRange(period) {
  return `${birthPlaceDate(period.start)} – ${birthPlaceDate(period.end)}`;
}

// Helper: a length in years written as years, months and days
function formatYmd(years) {
  return t('dasha.ymd', splitYears(years));
}

// Helper: Determine house number from longitude
function getHouseNumber(longitude) {
  for (let i = 0; i < 12; i++) {
    const cusp = state.houses.cusps[i];
    const nextCusp = state.houses.cusps[(i + 1) % 12];
    if (cusp < nextCusp) {
      if (longitude >= cusp && longitude < nextCusp) {
        return i + 1;
      }
    } else {
      // Crosses 360/0 boundary
      if (longitude >= cusp || longitude < nextCusp) {
        return i + 1;
      }
    }
  }
  return 1; // Fallback
}

function renderForm() {
  // Form is already in HTML, just wire up the logic
  updateAdvancedTabs();
}