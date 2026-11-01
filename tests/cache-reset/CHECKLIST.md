# Cache reset: manual checklist (`npx wrangler dev`, local only)

Open the app at the dev URL, DevTools > Application.

Status: items marked [x] were verified on 2026-11-01 in headless Chrome 155 (driven over the DevTools protocol) against local `wrangler dev`, plus the curl block. Unticked items still need a human with a real browser (visuals, keyboard, the blocked-IndexedDB path, Network-tab headers).
Note: `kundli-language` is also on the level-1 allowlist and was confirmed kept.

## Seed
In the console:
```js
localStorage.setItem('kundli.settings', '{"a":1}');
localStorage.setItem('kundli.chart.1', 'x'); localStorage.setItem('kundli.chart.2', 'x'); localStorage.setItem('kundli.chart.3', 'x');
localStorage.setItem('junk', '1'); sessionStorage.setItem('tmp', '1');
await caches.open('test-cache');
indexedDB.open('kundli');   // any DB; names are listed via indexedDB.databases()
```
Check: Settings card shows "App cache" and "Version 0.1.0".

## Level 1: Refresh app data
- [ ] Click it. Button disables and spinner shows while running; page reloads.
- [x] Toast shows what was cleared and "Version 0.1.0 → 0.1.0".
- [x] Cache Storage: no `kundli-shell-*` / `test-cache` entries (the SW re-precaches after reload; that is expected).
- [x] Local Storage: `kundli.settings` and `kundli.chart.*` kept; `junk` removed. Session Storage: `tmp` gone.
- [x] IndexedDB `kundli` still present.
- [ ] Network: `clear-site-data` POST returned 204 with `Clear-Site-Data: "cache"`.

## Level 2: Reset everything
- [ ] Re-seed. Click "Reset everything": confirm box says "3 saved charts will be deleted…"; Cancel / Esc closes it.
- [x] Confirm. Local Storage empty, IndexedDB empty, caches gone, SW unregistered then re-registered by the reloaded page.
- [ ] Network: POST `?level=all` returned 204 with `Clear-Site-Data: "cache", "storage"`.

## version.json is never served stale
- [x] With the app loaded and the service worker active (DevTools > Application > Service Workers), edit `public/version.json` to a new version, e.g. `0.1.1`.
- [x] Reload (no reset). "Version" in the App cache card shows `0.1.1`, not the old value.
- [ ] Network tab: `/version.json` is fetched from the network on each load (not "(ServiceWorker)" cache), and Cache Storage has no `/version.json` entry.
- [x] Run Refresh app data: toast shows `Version 0.1.1 → 0.1.1`. Change the file between click and reload to see `old → new`.
- [ ] Go offline (Network > Offline) and reload: the card shows "Version unknown" and nothing breaks.

## Offline safety
- [x] DevTools > Network > Offline, click either button: toast shows "Network check" failed and NOTHING is cleared (caches, SW and storage unchanged, no reload).

## Errors / a11y / theme
- [ ] Block a step (e.g. keep a second tab open holding an IndexedDB connection; the step waits ~5s): toast names the failing step and the page does NOT reload.
- [ ] Tab/Enter/Space operate everything; focus ring visible; confirm focuses Cancel.
- [ ] 375px width: buttons full width. Dark mode (OS setting): colours follow tokens.

## curl (dev URL = http://localhost:8787)
```sh
curl -si -X POST -H 'Origin: http://localhost:8787' http://localhost:8787/api/clear-site-data        # 204, Clear-Site-Data: "cache"
curl -si -X POST -H 'Origin: http://localhost:8787' 'http://localhost:8787/api/clear-site-data?level=all'  # + "storage"
curl -si http://localhost:8787/api/clear-site-data                                                   # 405
curl -si -X POST -H 'Origin: https://evil.test' http://localhost:8787/api/clear-site-data            # 403
```
