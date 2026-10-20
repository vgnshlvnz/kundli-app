import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateHouses } from '../../public/js/kundli/houses/index.js';

// Reference values from Swiss Ephemeris 2.10.03 (swe_houses, Placidus).
// ascendant / midheaven are tropical; placidus cusps are sidereal (Lahiri).
const CHARTS = [
  {label: 'Chennai 1990-01-15 10:30 IST', utc: 632379600, longitude: 80.2707, latitude: 13.0827, ascendant: 359.5902, midheaven: 269.6899, placidus: [335.8723, 10.2136, 39.6625, 65.9719, 92.248, 121.6083, 155.8723, 190.2136, 219.6625, 245.9719, 272.248, 301.6083]},
  {label: 'London 2000-03-21 12:00 GMT', utc: 953640000, longitude: -0.1278, latitude: 51.5074, ascendant: 115.9715, midheaven: 359.1072, placidus: [92.1113, 108.128, 127.9556, 155.247, 193.7997, 237.7727, 272.1113, 288.128, 307.9556, 335.247, 13.7997, 57.7727]},
  {label: 'New York 1975-11-05 20:00 EST', utc: 184467600, longitude: -74.006, latitude: 40.7128, ascendant: 96.7435, midheaven: 344.3925, placidus: [73.2238, 92.8637, 114.2657, 140.8728, 175.7774, 216.5683, 253.2238, 272.8637, 294.2657, 320.8728, 355.7774, 36.5683]},
  {label: 'Sydney 2010-08-20 23:15 AEST', utc: 1282310100, longitude: 151.2093, latitude: -33.8688, ascendant: 40.7545, midheaven: 316.2734, placidus: [16.7489, 45.9131, 78.1812, 112.2678, 144.8147, 173.0453, 196.7489, 225.9131, 258.1812, 292.2678, 324.8147, 353.0453]}
];

// Angular difference in arc-minutes
const arcmin = (a, b) => Math.abs(((a - b + 540) % 360) - 180) * 60;

for (const chart of CHARTS) {
  describe(`Houses vs Swiss Ephemeris: ${chart.label}`, () => {
    const birth = { utc: chart.utc, longitude: chart.longitude, latitude: chart.latitude };

    test('ascendant and midheaven within 1\'', () => {
      const h = calculateHouses(birth, 'lahiri', 'placidus');
      assert(arcmin(h.ascendant, chart.ascendant) < 1, `ASC ${h.ascendant} vs ${chart.ascendant}`);
      assert(arcmin(h.midheaven, chart.midheaven) < 1, `MC ${h.midheaven} vs ${chart.midheaven}`);
    });

    test('all 12 Placidus cusps within 1\'', () => {
      const h = calculateHouses(birth, 'lahiri', 'placidus');
      chart.placidus.forEach((expected, i) =>
        assert(arcmin(h.cusps[i], expected) < 1, `Cusp ${i + 1}: ${h.cusps[i]} vs ${expected}`));
    });

    test('whole sign house 1 starts at the Lagna sign', () => {
      const h = calculateHouses(birth, 'lahiri', 'wholesign');
      assert.equal(h.cusps[0], Math.floor(chart.placidus[0] / 30) * 30);
    });
  });
}
