// Unit tests for the DOM-free rendering functions. Run: node --test modules/web/tests/
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COLUMNS, categoriesCell, combustCell, dignityCell, errorMessage, escapeHtml, grahaRow, lagnaRow, placeOption,
  placementTable,
} from "../static/render.js";

const L = {
  "graha.BUDHA": "Mercury", "graha.GURU": "Jupiter", "graha.SHANI": "Saturn", "graha.SURYA": "Sun",
  "rasi.MEENA": "Pisces", "rasi.KUMBHA": "Aquarius", "nakshatra.REVATI": "Revati", "nakshatra.SHATABHISHA": "Shatabhisha",
  "dignity.NEECHA": "Neecha (debilitated)", "dignity.SAMA_KSHETRA": "Sama kshetra (neutral sign)",
  "dignity.SHATRU_KSHETRA": "Shatru kshetra (enemy's sign)",
  "category.PANAPARA": "Panapara", "category.MARAKA": "Maraka", "category.KENDRA": "Kendra", "category.TRIKONA": "Trikona",
  "ui.YES": "Yes", "ui.SUN_DISTANCE": "from the Sun", "ui.RETROGRADE_MARK": "R", "ui.BHAVA_CHALIT": "Bhava chalit",
  "ui.CHALIT_DIFFERS": "Chalit bhava differs", "ui.LAGNA": "Lagna", "ui.LAGNA_LORD": "Lagna lord",
  "ui.ERR_NONEXISTENT_TIME": "Did not exist", "ui.ERR_GENERIC": "Something went wrong",
};

const mercury = {
  graha: "BUDHA", rasi: "MEENA", degree: "14°56′", nakshatra: "REVATI", pada: 4, retrograde: true, combust: true,
  sun_distance: 11.42, bhava_whole_sign: 2, bhava_chalit: 3, bhava_differs: true,
  categories_whole_sign: ["PANAPARA", "MARAKA"], categories_chalit: ["KENDRA"], dignity: "NEECHA",
  kshetra: "SAMA_KSHETRA", lord_of: [5, 8], dispositor: "GURU", dispositor_bhava_whole_sign: 7, dispositor_bhava_chalit: 7,
};

test("escapes HTML", () => {
  assert.equal(escapeHtml(`<a href="x">&'`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  assert.equal(escapeHtml(null), "");
});

test("graha row: cells, retrograde, combust, chalit difference, dignity detail", () => {
  const html = grahaRow(L, mercury);
  assert.match(html, /^<tr data-graha="BUDHA" class="differs">/);
  assert.match(html, /<th scope="row">Mercury<\/th>/);
  assert.match(html, /<td>Pisces<\/td><td class="num">14°56′<\/td><td>Revati 4<\/td>/);
  assert.match(html, /<td class="mark">R<\/td>/);
  assert.match(html, /Yes<span class="detail">11\.4° from the Sun<\/span>/);
  assert.match(html, /<td class="num">2<\/td><td class="num">3 <span class="differs-mark"/);
  assert.match(html, /Neecha \(debilitated\)<span class="detail">Sama kshetra \(neutral sign\)<\/span>/);
  assert.match(html, /<td class="num">5, 8<\/td>/);
  assert.match(html, /Jupiter <span class="detail-inline">\(7\)<\/span>/);
});

test("cells without a value show a dash", () => {
  const plain = { ...mercury, retrograde: false, combust: false, sun_distance: null, bhava_chalit: 2, bhava_differs: false,
    dignity: "SHATRU_KSHETRA", kshetra: "SHATRU_KSHETRA", lord_of: [], dispositor_bhava_chalit: 8 };
  const html = grahaRow(L, plain);
  assert.doesNotMatch(html, /class="differs"/);
  assert.match(html, /<td class="mark">—<\/td><td>—<\/td>/);
  assert.equal(dignityCell(L, plain), "Shatru kshetra (enemy&#39;s sign)");
  assert.match(html, /\(7 \/ 8\)/);
  assert.equal(combustCell(L, plain), "—");
  assert.equal(categoriesCell(L, plain), "Panapara, Maraka");
});

test("categories show the chalit bhava's categories when it differs", () => {
  assert.equal(categoriesCell(L, mercury), 'Panapara, Maraka<span class="detail">Bhava chalit: Kendra</span>');
});

test("lagna row and the whole table", () => {
  const lagna = { rasi: "KUMBHA", degree: "7°37′", nakshatra: "SHATABHISHA", pada: 1, lord: "SHANI",
    lord_bhava_whole_sign: 12, lord_bhava_chalit: 12 };
  assert.match(lagnaRow(L, lagna), /Lagna lord: Saturn <span class="detail-inline">\(12\)<\/span>/);
  const html = placementTable(L, { lagna, rows: [mercury] });
  assert.equal((html.match(/<th scope="col">/g) || []).length, COLUMNS.length);
  assert.equal((html.match(/<tr data-graha=|<tr class="lagna"/g) || []).length, 2);
});

test("error messages", () => {
  assert.deepEqual(errorMessage(L, { detail: { code: "nonexistent_time", message: "server text" } }),
    { text: "Did not exist", detail: "server text" });
  assert.equal(errorMessage(L, { detail: { code: "something_new", message: "x" } }).text, "Something went wrong");
  const validation = errorMessage(L, { detail: [{ loc: ["body", "date"], msg: "invalid date" }] });
  assert.deepEqual(validation, { text: "Something went wrong", detail: "date: invalid date" });
  assert.equal(errorMessage(L, {}).text, "Something went wrong");
});

test("place options name why a place cannot be used", () => {
  assert.equal(placeOption({ label: "Chennai, India", usable: true }), "Chennai, India");
  assert.equal(placeOption({ label: "Malaysia", usable: false, note: "country centre" }), "Malaysia — country centre");
});
