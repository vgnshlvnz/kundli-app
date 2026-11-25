// Pure functions that turn API data and labels into HTML strings. No DOM access, so they run under node:test.
// Labels come from GET /api/labels; codes in the chart response (rasi, graha, dignity, category) are keys into them.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function label(labels, key, fallback = "") {
  return labels[key] ?? fallback ?? key;
}

const DASH = "—";

function list(labels, group, codes) {
  return codes.map((c) => escapeHtml(label(labels, `${group}.${c}`, c))).join(", ");
}

function bhavaPair(ws, chalit) {
  return ws === chalit ? `${ws}` : `${ws} / ${chalit}`;
}

/** The dignity cell: the dignity, and the relationship to the sign lord when the dignity is not itself a kshetra. */
export function dignityCell(labels, row) {
  const main = escapeHtml(label(labels, `dignity.${row.dignity}`, row.dignity));
  if (row.kshetra && !row.dignity.endsWith("_KSHETRA")) {
    return `${main}<span class="detail">${escapeHtml(label(labels, `dignity.${row.kshetra}`, row.kshetra))}</span>`;
  }
  return main;
}

export function combustCell(labels, row) {
  if (!row.combust) return DASH;
  const yes = escapeHtml(label(labels, "ui.YES", "Yes"));
  return `${yes}<span class="detail">${row.sun_distance.toFixed(1)}° ${escapeHtml(label(labels, "ui.SUN_DISTANCE"))}</span>`;
}

export function categoriesCell(labels, row) {
  const ws = list(labels, "category", row.categories_whole_sign);
  if (!row.bhava_differs) return ws;
  const chalit = list(labels, "category", row.categories_chalit);
  return `${ws}<span class="detail">${escapeHtml(label(labels, "ui.BHAVA_CHALIT"))}: ${chalit}</span>`;
}

export const COLUMNS = [
  "ui.GRAHA", "ui.RASI", "ui.DEGREE", "ui.NAKSHATRA", "ui.RETROGRADE", "ui.COMBUST", "ui.BHAVA_WHOLE_SIGN",
  "ui.BHAVA_CHALIT", "ui.CATEGORIES", "ui.DIGNITY", "ui.LORD_OF", "ui.DISPOSITOR",
];

export function grahaRow(labels, row) {
  const cells = [
    `<th scope="row">${escapeHtml(label(labels, `graha.${row.graha}`, row.graha))}</th>`,
    `<td>${escapeHtml(label(labels, `rasi.${row.rasi}`, row.rasi))}</td>`,
    `<td class="num">${escapeHtml(row.degree)}</td>`,
    `<td>${escapeHtml(label(labels, `nakshatra.${row.nakshatra}`, row.nakshatra))} ${row.pada}</td>`,
    `<td class="mark">${row.retrograde ? escapeHtml(label(labels, "ui.RETROGRADE_MARK", "R")) : DASH}</td>`,
    `<td>${combustCell(labels, row)}</td>`,
    `<td class="num">${row.bhava_whole_sign}</td>`,
    `<td class="num">${row.bhava_chalit}${row.bhava_differs ? ' <span class="differs-mark" title="' +
      escapeHtml(label(labels, "ui.CHALIT_DIFFERS")) + '">≠</span>' : ""}</td>`,
    `<td>${categoriesCell(labels, row)}</td>`,
    `<td>${dignityCell(labels, row)}</td>`,
    `<td class="num">${row.lord_of.length ? row.lord_of.join(", ") : DASH}</td>`,
    `<td>${escapeHtml(label(labels, `graha.${row.dispositor}`, row.dispositor))} ` +
      `<span class="detail-inline">(${bhavaPair(row.dispositor_bhava_whole_sign, row.dispositor_bhava_chalit)})</span></td>`,
  ];
  const cls = row.bhava_differs ? ' class="differs"' : "";
  return `<tr data-graha="${escapeHtml(row.graha)}"${cls}>${cells.join("")}</tr>`;
}

export function lagnaRow(labels, lagna) {
  const lord = escapeHtml(label(labels, `graha.${lagna.lord}`, lagna.lord));
  const cells = [
    `<th scope="row">${escapeHtml(label(labels, "ui.LAGNA", "Lagna"))}</th>`,
    `<td>${escapeHtml(label(labels, `rasi.${lagna.rasi}`, lagna.rasi))}</td>`,
    `<td class="num">${escapeHtml(lagna.degree)}</td>`,
    `<td>${escapeHtml(label(labels, `nakshatra.${lagna.nakshatra}`, lagna.nakshatra))} ${lagna.pada}</td>`,
    `<td class="mark">${DASH}</td>`, `<td>${DASH}</td>`, `<td class="num">1</td>`, `<td class="num">1</td>`,
    `<td>${DASH}</td>`, `<td>${DASH}</td>`, `<td>${DASH}</td>`,
    `<td>${escapeHtml(label(labels, "ui.LAGNA_LORD"))}: ${lord} ` +
      `<span class="detail-inline">(${bhavaPair(lagna.lord_bhava_whole_sign, lagna.lord_bhava_chalit)})</span></td>`,
  ];
  return `<tr class="lagna" data-graha="LAGNA">${cells.join("")}</tr>`;
}

export function placementTable(labels, data) {
  const head = COLUMNS.map((k) => `<th scope="col">${escapeHtml(label(labels, k, k))}</th>`).join("");
  const body = [lagnaRow(labels, data.lagna), ...data.rows.map((r) => grahaRow(labels, r))].join("");
  return `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

const ERROR_LABELS = {
  nonexistent_time: "ui.ERR_NONEXISTENT_TIME",
  place_not_usable: "ui.ERR_PLACE_NOT_USABLE",
  date_out_of_range: "ui.ERR_DATE_OUT_OF_RANGE",
};

/** A user-facing message for an API error response body (FastAPI's {detail: ...}). */
export function errorMessage(labels, body) {
  const detail = body && body.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail)) {
    const key = ERROR_LABELS[detail.code];
    return { text: label(labels, key || "ui.ERR_GENERIC"), detail: detail.message || "" };
  }
  const first = Array.isArray(detail) && detail[0];
  return { text: label(labels, "ui.ERR_GENERIC"), detail: first ? `${first.loc?.slice(-1)[0]}: ${first.msg}` : "" };
}

export function placeOption(place) {
  const note = place.usable ? "" : ` — ${place.note || ""}`;
  return `${place.label}${note}`;
}
