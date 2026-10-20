// Chart rendering
// South Indian chart: fixed signs around a 4x4 grid, Pisces in the top-left corner,
// running clockwise. The Lagna is marked in whichever sign it falls.

const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

// [row, column] of each sign (index 0 = Aries) in the 4x4 grid, 1-based
const SIGN_CELLS = [
  [1, 2], [1, 3], [1, 4], [2, 4], [3, 4], [4, 4],
  [4, 3], [4, 2], [4, 1], [3, 1], [2, 1], [1, 1]
];

const ABBREVIATIONS = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju',
  Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke'
};

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * South Indian chart as an HTML string.
 * @param {Object} chart
 * @param {string} chart.title - Shown in the centre (e.g. "Rasi")
 * @param {string} [chart.subtitle] - Second centre line (e.g. name and birth date)
 * @param {number} chart.ascendantSign - Sign index of the Lagna (0 = Aries)
 * @param {Array<{name: string, sign: number, degree?: number, retrograde?: boolean}>} chart.planets
 * @returns {string} HTML
 */
export function southIndianChart({ title, subtitle = '', ascendantSign, planets }) {
  const cells = SIGN_NAMES.map((signName, sign) => {
    const [row, col] = SIGN_CELLS[sign];
    const isLagna = sign === ascendantSign;
    const here = planets.filter(p => p.sign === sign);
    const items = here.map(p => {
      const abbr = ABBREVIATIONS[p.name] ?? p.name.slice(0, 2);
      const degree = typeof p.degree === 'number' ? ` ${Math.floor(p.degree)}°` : '';
      const retro = p.retrograde ? ' (R)' : '';
      return `<span class="si-planet" title="${escapeHtml(p.name)}">${escapeHtml(abbr)}${degree}${retro}</span>`;
    });
    if (isLagna) items.unshift('<span class="si-planet si-lagna" title="Lagna">Asc</span>');
    const label = [isLagna ? 'Lagna' : '', ...here.map(p => p.name + (p.retrograde ? ' retrograde' : ''))]
      .filter(Boolean).join(', ');
    return `<div class="si-cell${isLagna ? ' si-cell-lagna' : ''}" style="grid-row:${row};grid-column:${col}" ` +
      `aria-label="${escapeHtml(signName + (label ? ': ' + label : ''))}">` +
      `<span class="si-sign">${signName}</span>${items.join('')}</div>`;
  });
  const centre = `<div class="si-centre"><strong>${escapeHtml(title)}</strong>` +
    (subtitle ? `<span>${escapeHtml(subtitle)}</span>` : '') + '</div>';
  return `<div class="si-chart" role="group" aria-label="${escapeHtml(title)} chart, South Indian style">${cells.join('')}${centre}</div>`;
}
