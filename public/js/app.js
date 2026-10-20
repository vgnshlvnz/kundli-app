// Kundli Calculator - Main Application
// Single-page vanilla JS app for Vedic birth chart calculation

import { resolveBirth, searchLocations, localToUtc } from './kundli/geo/index.js';
import { computePlanets } from './kundli/ephemeris/index.js';
import { calculateHouses } from './kundli/houses/index.js';
import { computeVimshottariDasha, getNakshatra } from './kundli/dasha/index.js';
import { calculatePanchanga } from './kundli/panchanga/index.js';
import { kpLords, signLord, significators } from './kundli/kp/index.js';
import { computeVarga } from './kundli/vargas/index.js';

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
let manualToggle, manualLatInput, manualLonInput, manualTzInput;
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
  manualToggle = document.getElementById('manual-toggle');
  manualLatInput = document.getElementById('manual-lat');
  manualLonInput = document.getElementById('manual-lon');
  manualTzInput = document.getElementById('manual-tz');
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

  // Populate timezone select
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    zones.forEach(zone => {
      const opt = document.createElement('option');
      opt.value = zone;
      opt.textContent = zone;
      manualTzInput.appendChild(opt);
    });
    // Default to Asia/Kolkata if available
    if (zones.includes('Asia/Kolkata')) {
      manualTzInput.value = 'Asia/Kolkata';
    }
  } catch (e) {
    console.warn('Intl.supportedValuesOf not available, timezone list incomplete');
  }

  // Event listeners
  formEl.addEventListener('submit', handleSubmit);
  locationInput.addEventListener('input', () => {
    // Typing invalidates a previously chosen location
    for (const key of ['locationId', 'latitude', 'longitude', 'timezone']) delete locationInput.dataset[key];
    debouncedSearch();
  });
  locationInput.addEventListener('keydown', handleLocationKeys);
  manualToggle.addEventListener('change', toggleManualCoords);
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
      showLocationError(`No places match "${query}". Try another spelling or enter coordinates manually.`);
    }
  } catch (e) {
    console.error('Location search failed:', e);
    locationDropdown.classList.add('hidden');
    showLocationError('Location search is unavailable right now. Enter coordinates manually instead.');
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
      badge.textContent = 'centroid';
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

function toggleManualCoords(e) {
  const isManual = e.target.checked;
  const manualSection = document.getElementById('manual-coords-section');
  if (isManual) {
    manualSection.classList.remove('hidden');
  } else {
    manualSection.classList.add('hidden');
    locationInput.value = '';
    delete locationInput.dataset.locationId;
  }
}

async function updateUtcOffset() {
  if (!manualToggle.checked && locationInput.dataset.timezone) {
    try {
      // Estimate offset by converting a test date
      const testDate = dateInput.value || '2000-01-01';
      const testTime = timeInput.value || '12:00:00';
      const localTimeStr = `${testDate}T${testTime}`;
      const tz = locationInput.dataset.timezone;
      // Try conversion to get offset (we'll use the actual convert for calculation)
      utcOffsetEl.textContent = `Timezone: ${tz}`;
    } catch (e) {
      utcOffsetEl.textContent = '';
    }
  } else if (manualToggle.checked && manualTzInput.value) {
    utcOffsetEl.textContent = `Timezone: ${manualTzInput.value}`;
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
    if (manualToggle.checked) {
      input.latitude = parseFloat(manualLatInput.value);
      input.longitude = parseFloat(manualLonInput.value);
      input.timezone = manualTzInput.value;
    } else if (picked.locationId) {
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
    utcOffsetEl.textContent = `Timezone: ${state.resolvedBirth.timezone} (resolved)`;

    // Render all tabs
    renderRasiTab();
    renderNavamsaTab();
    renderPlanetsTab();
    renderVimshottariTab();
    renderPanchangaTab();
    renderKpTab();

    // Show results
    resultsEl.classList.remove('hidden');
    switchTab('rasi');

  } catch (e) {
    console.error('Calculation failed:', e);
    locationError.textContent = e.message;
    locationError.classList.remove('hidden');
  }
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
  const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  let html = `
    <h3>Rasi Chart (D1)</h3>
    <p><strong>Ascendant (Lagna):</strong> ${signNames[ascSign]} ${(asc - ascSign * 30).toFixed(2)}°</p>
    <table class="chart-table">
      <thead>
        <tr>
          <th>Planet</th>
          <th>Sign</th>
          <th>Degree</th>
          <th>House</th>
          <th>Retrograde</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.planets.forEach(p => {
    const signName = signNames[p.sign];
    const house = getHouseNumber(p.siderealLongitude);
    html += `
      <tr>
        <td>${p.name}</td>
        <td>${signName}</td>
        <td>${p.degreeInSign.toFixed(2)}°</td>
        <td>${house}</td>
        <td>${p.retrograde ? 'Yes' : 'No'}</td>
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
  const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  const d9AscSign = Math.floor(d9.ascendant / 30);

  let html = `
    <h3>Navamsa Chart (D9)</h3>
    <p><strong>Navamsa Ascendant:</strong> ${signNames[d9AscSign]} ${(d9.ascendant % 30).toFixed(2)}°</p>
    <table class="chart-table">
      <thead>
        <tr>
          <th>Planet</th>
          <th>Sign</th>
          <th>Degree</th>
          <th>House</th>
        </tr>
      </thead>
      <tbody>
  `;

  d9.planets.forEach(p => {
    const signName = signNames[p.sign];
    html += `
      <tr>
        <td>${p.name}</td>
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

  const signNames = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  let html = `
    <h3>Planet Positions</h3>
    <table class="chart-table">
      <thead>
        <tr>
          <th>Planet</th>
          <th>Sign</th>
          <th>Degree</th>
          <th>House</th>
          <th>Nakshatra</th>
          <th>Pada</th>
          <th>Speed</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.planets.forEach(p => {
    const signName = signNames[p.sign];
    const house = getHouseNumber(p.siderealLongitude);
    const nakshatra = getNakshatra(p.siderealLongitude);
    // Each nakshatra (13°20') has four padas of 3°20'
    const pada = Math.floor((p.siderealLongitude % (40 / 3)) / (10 / 3)) + 1;
    const speed = Math.abs(p.speed).toFixed(3);
    html += `
      <tr>
        <td>${p.name}</td>
        <td>${signName}</td>
        <td>${p.degreeInSign.toFixed(4)}°</td>
        <td>${house}</td>
        <td>${nakshatra.name}</td>
        <td>${pada}</td>
        <td>${speed}°/day</td>
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

  let html = `
    <h3>Vimshottari Dasha</h3>
    <p><strong>Born:</strong> ${state.dasha.birthYear}</p>
    <p><strong>Moon Nakshatra:</strong> ${state.dasha.moonNakshatra} (Lord: ${state.dasha.moonNakshatraLord})</p>
    <p><strong>Current Mahadasha:</strong> ${state.dasha.currentMahadasha ? state.dasha.currentMahadasha.planet : 'N/A'}</p>
    ${state.dasha.currentBhukti ? `<p><strong>Current Bhukti:</strong> ${state.dasha.currentBhukti.planet}</p>` : ''}
    <h4>Mahadasha Timeline</h4>
    <table class="chart-table">
      <thead>
        <tr>
          <th>Planet</th>
          <th>Start</th>
          <th>End</th>
          <th>Duration (years)</th>
          <th>Current</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.dasha.mahadashas.forEach(md => {
    const startYear = new Date(md.start * 1000).getFullYear();
    const endYear = new Date(md.end * 1000).getFullYear();
    const isCurrent = state.dasha.currentMahadasha && state.dasha.currentMahadasha.planet === md.planet;
    html += `
      <tr${isCurrent ? ' class="current-period"' : ''}>
        <td>${md.planet}</td>
        <td>${startYear}</td>
        <td>${endYear}</td>
        <td>${md.durationYears.toFixed(2)}</td>
        <td>${isCurrent ? 'Yes' : 'No'}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tabs['vimshottari'].innerHTML = html;
}

function renderPanchangaTab() {
  if (!state.panchanga) return;

  const p = state.panchanga;
  let html = `
    <h3>Panchanga</h3>
    <table class="chart-table">
      <tr><th>Tithi</th><td>${p.tithi.name} (${p.tithi.number}) - ${p.tithi.percentage.toFixed(1)}% elapsed</td></tr>
      <tr><th>Paksha</th><td>${p.paksha.english} (${p.paksha.name})</td></tr>
      <tr><th>Nakshatra</th><td>${p.nakshatra.name} (Lord: ${p.nakshatra.lord})</td></tr>
      <tr><th>Yoga</th><td>${p.yoga.name}</td></tr>
      <tr><th>Karana</th><td>${p.karana.name}${p.karana.fixed ? ' (fixed)' : ''}</td></tr>
      <tr><th>Vara</th><td>${p.vara.name} (${p.vara.english})</td></tr>
      ${p.sunriseSunset.sunriseUtc ? `<tr><th>Sunrise</th><td>${birthPlaceTime(p.sunriseSunset.sunriseUtc)}</td></tr>` : ''}
      ${p.sunriseSunset.sunsetUtc ? `<tr><th>Sunset</th><td>${birthPlaceTime(p.sunriseSunset.sunsetUtc)}</td></tr>` : ''}
    </table>
  `;
  tabs['panchanga'].innerHTML = html;
}

function renderKpTab() {
  if (!state.planets || !state.houses) return;

  let html = `
    <h3>KP Astrology</h3>
    <h4>Planet Sub-Lords</h4>
    <table class="chart-table">
      <thead>
        <tr>
          <th>Planet</th>
          <th>Sign</th>
          <th>Star Lord</th>
          <th>Sub Lord</th>
          <th>Sub-Sub Lord</th>
          <th>Sign Lord</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.planets.forEach(p => {
    const lords = kpLords(p.siderealLongitude);
    html += `
      <tr>
        <td>${p.name}</td>
        <td>${lords.sign}</td>
        <td>${lords.star}</td>
        <td>${lords.sub}</td>
        <td>${lords.subSub}</td>
        <td>${lords.signLord}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <h4>House Cusp Sub-Lords</h4>
    <table class="chart-table">
      <thead>
        <tr>
          <th>House</th>
          <th>Cusp</th>
          <th>Sign</th>
          <th>Sign Lord</th>
          <th>Star Lord</th>
          <th>Sub Lord</th>
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
        <td>${lords.sign}</td>
        <td>${lords.signLord}</td>
        <td>${lords.star}</td>
        <td>${lords.sub}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  tabs['kp'].innerHTML = html;
}

// Helper: format a UTC timestamp (seconds) as local time at the birth place
function birthPlaceTime(utcSeconds) {
  const timeZone = state.resolvedBirth.timezone;
  const time = new Date(utcSeconds * 1000).toLocaleTimeString('en-GB', { timeZone, hour12: false });
  return `${time} (${timeZone})`;
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