// The page: birth form with place search, the chart from the API, and the placement table below it.
// All calculation happens in the API; this file only talks to it over HTTP and renders the results.

import { errorMessage, escapeHtml, placeOption, placementTable } from "./render.js";

const $ = (id) => document.getElementById(id);
const state = { lang: "en", labels: {}, place: null, lastRequest: null, searchTimer: 0, options: [], active: -1 };

async function getJson(url, init) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function t(key, fallback = "") {
  return state.labels[key] ?? fallback;
}

async function setLanguage(lang) {
  state.lang = lang;
  state.labels = (await getJson(`/api/labels?lang=${lang}`)).body;
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll("[data-label]")) el.textContent = t(el.dataset.label, el.textContent);
  for (const el of document.querySelectorAll("[data-label-placeholder]")) el.placeholder = t(el.dataset.labelPlaceholder);
  for (const btn of document.querySelectorAll(".lang button")) btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  document.title = t("ui.APP_TITLE", "Kundli");
  showPlaceInfo();
  if (state.lastRequest) await submit({ ...state.lastRequest, lang });
}

async function loadAyanamsas() {
  const { body } = await getJson("/api/ayanamsas");
  $("ayanamsa").innerHTML = body
    .map((o) => `<option value="${escapeHtml(o.id)}"${o.default ? " selected" : ""}>${escapeHtml(o.name)}</option>`)
    .join("");
}

// --- place search (combobox) -----------------------------------------------------------------------------------

function closeList() {
  $("place-list").hidden = true;
  $("place").setAttribute("aria-expanded", "false");
  state.active = -1;
}

function showOptions(places) {
  state.options = places;
  const list = $("place-list");
  if (!places.length) {
    list.innerHTML = `<li class="empty" role="option" aria-disabled="true">${escapeHtml(t("ui.NO_PLACES"))}</li>`;
  } else {
    list.innerHTML = places
      .map((p, i) => `<li role="option" id="place-opt-${i}" data-index="${i}" aria-disabled="${!p.usable}"` +
        ` class="${p.usable ? "" : "unusable"}">${escapeHtml(placeOption(p))}</li>`)
      .join("");
  }
  list.hidden = false;
  $("place").setAttribute("aria-expanded", "true");
}

function highlight(index) {
  const items = [...$("place-list").querySelectorAll("li[data-index]")];
  if (!items.length) return;
  state.active = (index + items.length) % items.length;
  items.forEach((li, i) => li.classList.toggle("active", i === state.active));
  $("place").setAttribute("aria-activedescendant", items[state.active].id);
  items[state.active].scrollIntoView({ block: "nearest" });
}

function showPlaceInfo() {
  const p = state.place;
  $("place-info").textContent = p ? `${t("ui.TIMEZONE")}: ${p.tz}${p.note ? ` · ${p.note}` : ""}` : "";
}

function choose(index) {
  const p = state.options[index];
  if (!p || !p.usable) return;
  state.place = p;
  $("place").value = p.label;
  showPlaceInfo();
  closeList();
}

function onPlaceInput() {
  state.place = null;
  $("place-info").textContent = "";
  clearTimeout(state.searchTimer);
  const q = $("place").value.trim();
  if (!q) return closeList();
  state.searchTimer = setTimeout(async () => {
    const { body } = await getJson(`/api/places?q=${encodeURIComponent(q)}&limit=12`);
    if ($("place").value.trim() === q) showOptions(body);
  }, 180);
}

function onPlaceKey(e) {
  const open = !$("place-list").hidden;
  if (e.key === "ArrowDown") { e.preventDefault(); if (open) highlight(state.active + 1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); if (open) highlight(state.active - 1); }
  else if (e.key === "Enter" && open && state.active >= 0) { e.preventDefault(); choose(state.active); }
  else if (e.key === "Escape") closeList();
}

// --- chart ---------------------------------------------------------------------------------------------------------

function showMessage(text, detail = "") {
  const box = $("message");
  box.innerHTML = `<p>${escapeHtml(text)}</p>${detail ? `<p class="detail">${escapeHtml(detail)}</p>` : ""}`;
  box.hidden = false;
}

function showFoldChoice(request, choices) {
  const box = $("fold-choice");
  const names = ["ui.FIRST_OCCURRENCE", "ui.SECOND_OCCURRENCE"];
  box.innerHTML = `<legend>${escapeHtml(t("ui.CHOOSE_OCCURRENCE"))}</legend>` + choices
    .map((c) => `<button type="button" data-fold="${c.fold}">${escapeHtml(t(names[c.fold]))} (UTC${escapeHtml(c.utc_offset)})</button>`)
    .join("");
  box.hidden = false;
  box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => submit({ ...request, fold: Number(b.dataset.fold) })));
}

async function submit(request) {
  $("message").hidden = true;
  $("fold-choice").hidden = true;
  $("cast").disabled = true;
  try {
    const { ok, body } = await getJson("/api/chart", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
    });
    if (!ok) {
      if (body.detail?.code === "ambiguous_time") return showFoldChoice(request, body.detail.choices);
      const m = errorMessage(state.labels, body);
      return showMessage(m.text, m.detail);
    }
    state.lastRequest = request;
    $("chart").innerHTML = body.chart_svg;
    $("placements").innerHTML = placementTable(state.labels, body);
    $("warnings").innerHTML = body.warnings.map((w) => `<p><strong>${escapeHtml(t("ui.NOTE"))}:</strong> ${escapeHtml(w)}</p>`).join("");
    $("method").textContent = `${t("ui.AYANAMSA")}: ${body.ayanamsa.name} ${body.ayanamsa.dms} · ${body.chalit_method} · ` +
      `UTC ${body.birth.utc.replace("+00:00", "")} (${body.birth.tz}, UTC${body.birth.utc_offset})`;
    $("result").hidden = false;
  } catch (err) {
    showMessage(t("ui.ERR_GENERIC", "Something went wrong."), String(err));
  } finally {
    $("cast").disabled = false;
  }
}

function onSubmit(e) {
  e.preventDefault();
  if (!state.place) {
    $("place").focus();
    return showMessage(t("ui.SEARCH_PLACE"));
  }
  const time = $("time").value.length === 5 ? `${$("time").value}:00` : $("time").value;
  submit({
    name: $("name").value.trim(), date: $("date").value, time, place_id: state.place.id,
    ayanamsa: $("ayanamsa").value, lang: state.lang,
  });
}

async function init() {
  $("place").addEventListener("input", onPlaceInput);
  $("place").addEventListener("keydown", onPlaceKey);
  $("place-list").addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-index]");
    if (li) { e.preventDefault(); choose(Number(li.dataset.index)); }
  });
  $("place").addEventListener("blur", () => setTimeout(closeList, 120));
  $("birth-form").addEventListener("submit", onSubmit);
  $("print").addEventListener("click", () => window.print());
  for (const btn of document.querySelectorAll(".lang button")) btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
  await Promise.all([loadAyanamsas(), setLanguage(document.documentElement.lang || "en")]);
}

init();
