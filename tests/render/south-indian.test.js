import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { southIndianChart } from '../../public/js/kundli/render/index.js';

// Text content of the cell for a sign, by its fixed grid position
function cell(html, signName) {
  const match = html.match(new RegExp(`<div class="si-cell[^"]*" style="([^"]*)" aria-label="${signName}[^"]*"><span class="si-sign">${signName}</span>(.*?)</div>`));
  assert.ok(match, `cell for ${signName} not found`);
  return { style: match[1], content: match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), raw: match[0] };
}

describe('South Indian chart', () => {
  const html = southIndianChart({
    title: 'Rasi',
    subtitle: 'Test',
    ascendantSign: 11,
    planets: [
      { name: 'Sun', sign: 9, degree: 1.06 },
      { name: 'Mars', sign: 7, degree: 25.98 },
      { name: 'Mercury', sign: 8, degree: 17.84, retrograde: true },
      { name: 'Saturn', sign: 8, degree: 23.56 }
    ]
  });

  test('Signs sit in the fixed South Indian positions', () => {
    assert.equal(cell(html, 'Pisces').style, 'grid-row:1;grid-column:1');
    assert.equal(cell(html, 'Aries').style, 'grid-row:1;grid-column:2');
    assert.equal(cell(html, 'Cancer').style, 'grid-row:2;grid-column:4');
    assert.equal(cell(html, 'Virgo').style, 'grid-row:4;grid-column:4');
    assert.equal(cell(html, 'Sagittarius').style, 'grid-row:4;grid-column:1');
    assert.equal(cell(html, 'Aquarius').style, 'grid-row:2;grid-column:1');
  });

  test('Every sign has exactly one cell', () => {
    assert.equal((html.match(/class="si-cell/g) || []).length, 12);
  });

  test('Lagna is marked in its sign only', () => {
    assert.match(cell(html, 'Pisces').raw, /si-cell-lagna/);
    assert.equal(cell(html, 'Pisces').content, 'Asc');
    assert.equal((html.match(/si-cell-lagna/g) || []).length, 1);
  });

  test('Planets show abbreviation, whole degree and retrograde mark', () => {
    assert.equal(cell(html, 'Capricorn').content, 'Su 1°');
    assert.equal(cell(html, 'Scorpio').content, 'Ma 25°');
    assert.equal(cell(html, 'Sagittarius').content, 'Me 17° (R) Sa 23°');
    assert.equal(cell(html, 'Leo').content, '');
  });

  test('Accessible label lists the cell contents', () => {
    assert.match(cell(html, 'Sagittarius').raw, /aria-label="Sagittarius: Mercury retrograde, Saturn"/);
  });

  test('Title and subtitle are escaped', () => {
    const out = southIndianChart({ title: 'Rasi', subtitle: '<b>x</b>', ascendantSign: 0, planets: [] });
    assert.ok(out.includes('&lt;b&gt;x&lt;/b&gt;'));
    assert.ok(!out.includes('<b>x</b>'));
  });
});

describe('South Indian chart in Tamil', () => {
  const signs = ['மேஷம்', 'ரிஷபம்', 'மிதுனம்', 'கடகம்', 'சிம்மம்', 'கன்னி',
    'துலாம்', 'விருச்சிகம்', 'தனுசு', 'மகரம்', 'கும்பம்', 'மீனம்'];
  const html = southIndianChart({
    title: 'ராசி',
    ascendantSign: 11,
    planets: [{ name: 'புதன்', abbr: 'புத', sign: 8, degree: 17.84, retrograde: true }],
    labels: { signs, asc: 'லக்', lagna: 'லக்னம்', retroMark: '(வ)', retrograde: 'வக்கிரம்', aria: 'ராசி சக்கரம்' }
  });

  test('Uses the given sign names, abbreviations and markers', () => {
    assert.equal(cell(html, 'மீனம்').content, 'லக்');
    assert.equal(cell(html, 'தனுசு').content, 'புத 17° (வ)');
    assert.match(cell(html, 'தனுசு').raw, /aria-label="தனுசு: புதன் வக்கிரம்"/);
    assert.ok(html.includes('aria-label="ராசி சக்கரம்"'));
    assert.ok(!html.includes('Pisces'));
  });
});
