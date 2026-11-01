// "Clear app cache" control: two levels, run in the visitor's browser.
//
// NOTE: this clears the visitor's browser only. The Cloudflare edge cache is
// NOT touched: purging it needs an API token, which must never be exposed to
// the browser.

// TODO(owner): placeholder keys. No saved-profile storage exists yet; replace
// these with the real keys when the feature lands.
export const LS_ALLOWLIST = {
  exact: ['kundli.settings', 'kundli-language'],
  prefixes: ['kundli.profile.', 'kundli.chart.'],
};
export const CHART_PREFIX = 'kundli.chart.';
export const KNOWN_DB_NAMES = ['kundli'];
const BLOCKED_TIMEOUT_MS = 5000;
const RESULT_KEY = 'cache-reset:result';

/** @param {string[]} keys @param {{exact:string[],prefixes:string[]}} allow */
export function isAllowed(key, allow = LS_ALLOWLIST) {
  return allow.exact.includes(key) || allow.prefixes.some((p) => key.startsWith(p));
}

/** localStorage keys to remove at level 1 (everything not allowlisted). */
export function keysToRemove(keys, allow = LS_ALLOWLIST) {
  return keys.filter((k) => !isAllowed(k, allow));
}

export function countSavedCharts(keys, prefix = CHART_PREFIX) {
  return keys.filter((k) => k.startsWith(prefix)).length;
}

export function confirmText(chartCount) {
  const n = chartCount;
  const charts = `${n} saved chart${n === 1 ? '' : 's'}`;
  return `${charts} will be deleted, along with all saved settings and offline data. This cannot be undone.`;
}

/**
 * @param {{step:string, ok:boolean, detail?:string, error?:string}[]} steps
 * @returns {{ok:boolean, text:string}}
 */
export function summarize(steps) {
  const done = steps.filter((s) => s.ok).map((s) => (s.detail ? `${s.step} (${s.detail})` : s.step));
  const failed = steps.filter((s) => !s.ok).map((s) => `${s.step}: ${s.error}`);
  const parts = [];
  if (done.length) parts.push(`Cleared: ${done.join(', ')}.`);
  if (failed.length) parts.push(`Failed: ${failed.join('; ')}.`);
  return { ok: failed.length === 0, text: parts.join(' ') || 'Nothing to clear.' };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    return { step: name, ok: true, detail: detail || undefined };
  } catch (e) {
    return { step: name, ok: false, error: e && e.message ? e.message : String(e) };
  }
}

/**
 * Run a reset. `env` is injectable for tests; defaults to browser globals.
 * @param {'refresh'|'all'} level
 */
export async function runReset(level, env = globalThis) {
  // Offline-first app: if we can't reach the server, wiping the caches would leave
  // no working app until the user is back online. Check first, destroy nothing on failure.
  const net = await step('Network check', async () => { await env.fetch('/version.json', { cache: 'no-store' }); });
  if (!net.ok) return [net];

  const steps = [];
  steps.push(await step('Cache Storage', async () => {
    const names = await env.caches.keys();
    await Promise.all(names.map((n) => env.caches.delete(n)));
    return `${names.length} cache${names.length === 1 ? '' : 's'}`;
  }));
  steps.push(await step('Service workers', async () => {
    const regs = await env.navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    return `${regs.length}`;
  }));
  steps.push(await step('Session storage', async () => { env.sessionStorage.clear(); }));

  if (level === 'all') {
    steps.push(await step('Local storage', async () => { env.localStorage.clear(); }));
    steps.push(await step('IndexedDB', async () => {
      const idb = env.indexedDB;
      const names = typeof idb.databases === 'function'
        ? (await idb.databases()).map((d) => d.name).filter(Boolean)
        : KNOWN_DB_NAMES;
      await Promise.all(names.map((name) => new Promise((resolve, reject) => {
        const req = idb.deleteDatabase(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error(`could not delete ${name}`));
        // Blocked means another tab holds it open; the delete still completes once that
        // closes, so wait a while before reporting it.
        req.onblocked = () => {
          setTimeout(() => reject(new Error(`${name} is still open in another tab`)), BLOCKED_TIMEOUT_MS);
        };
      })));
      return `${names.length} database${names.length === 1 ? '' : 's'}`;
    }));
  } else {
    steps.push(await step('Local storage', async () => {
      const keys = Object.keys(env.localStorage);
      const doomed = keysToRemove(keys);
      doomed.forEach((k) => env.localStorage.removeItem(k));
      return `${doomed.length} removed, ${keys.length - doomed.length} kept`;
    }));
  }

  steps.push(await step('Clear-Site-Data request', async () => {
    const res = await env.fetch(`/api/clear-site-data${level === 'all' ? '?level=all' : ''}`, { method: 'POST' });
    if (res.status !== 204) throw new Error(`HTTP ${res.status}`);
  }));
  return steps;
}

async function fetchVersion() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const v = await res.json();
    return v.version;
  } catch {
    return 'unknown';
  }
}

function el(tag, attrs = {}, text) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  if (text) e.textContent = text;
  return e;
}

export async function mount(root = document.getElementById('cache-reset-mount')) {
  if (!root) return;
  // Stylesheet is injected here so index.html needs only the one script + mount element.
  if (!document.querySelector('link[data-cache-reset]')) {
    const link = el('link', { rel: 'stylesheet', href: '/css/cache-reset.css', 'data-cache-reset': '' });
    document.head.append(link);
  }
  root.classList.add('cache-reset');
  const heading = el('h3', {}, 'App cache');
  const versionLine = el('p', { class: 'cache-reset__version' });
  const refreshBtn = el('button', { type: 'button', class: 'btn btn-secondary cache-reset__btn' }, 'Refresh app data');
  const refreshHint = el('p', { class: 'cache-reset__hint' }, 'Clears offline files and temporary data. Keeps your saved charts and settings.');
  const resetBtn = el('button', { type: 'button', class: 'btn btn-secondary cache-reset__btn cache-reset__danger' }, 'Reset everything');
  const confirmBox = el('div', { class: 'cache-reset__confirm hidden', role: 'alertdialog', 'aria-labelledby': 'cache-reset-confirm-text' });
  const confirmText_ = el('p', { id: 'cache-reset-confirm-text' });
  const confirmYes = el('button', { type: 'button', class: 'btn btn-primary cache-reset__btn' }, 'Yes, delete everything');
  const confirmNo = el('button', { type: 'button', class: 'btn btn-secondary cache-reset__btn' }, 'Cancel');
  const spinner = el('span', { class: 'cache-reset__spinner hidden', 'aria-hidden': 'true' });
  const toast = el('div', { class: 'cache-reset__toast hidden', role: 'status', 'aria-live': 'polite' });
  confirmBox.append(confirmText_, confirmYes, confirmNo);
  root.append(heading, versionLine, refreshBtn, refreshHint, resetBtn, confirmBox, spinner, toast);

  const buttons = [refreshBtn, resetBtn, confirmYes, confirmNo];
  const busy = (on) => {
    buttons.forEach((b) => { b.disabled = on; });
    spinner.classList.toggle('hidden', !on);
    root.setAttribute('aria-busy', String(on));
  };
  const showToast = (text, ok) => {
    toast.textContent = text;
    toast.classList.remove('hidden');
    toast.classList.toggle('cache-reset__toast--error', !ok);
  };

  const current = await fetchVersion();
  versionLine.textContent = `Version ${current}`;

  // Result of a reset that just reloaded the page.
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (raw) {
      sessionStorage.removeItem(RESULT_KEY);
      const r = JSON.parse(raw);
      showToast(`${r.text} Version ${r.before} → ${current}.`, true);
    }
  } catch { /* storage unavailable: no toast */ }

  async function go(level) {
    busy(true);
    confirmBox.classList.add('hidden');
    toast.classList.add('hidden');
    const before = await fetchVersion();
    const steps = await runReset(level);
    const { ok, text } = summarize(steps);
    busy(false);
    if (!ok) { showToast(text, false); return; }
    try { sessionStorage.setItem(RESULT_KEY, JSON.stringify({ text, before })); } catch { /* ignore */ }
    location.replace(location.pathname);
  }

  refreshBtn.addEventListener('click', () => go('refresh'));
  resetBtn.addEventListener('click', () => {
    confirmText_.textContent = confirmText(countSavedCharts(Object.keys(localStorage)));
    confirmBox.classList.remove('hidden');
    confirmNo.focus();
  });
  confirmNo.addEventListener('click', () => { confirmBox.classList.add('hidden'); resetBtn.focus(); });
  confirmYes.addEventListener('click', () => go('all'));
  confirmBox.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { confirmBox.classList.add('hidden'); resetBtn.focus(); }
  });
}

if (typeof document !== 'undefined') mount();
