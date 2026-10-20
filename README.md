# Vedic Kundli Calculator

Browser-based Vedic astrology suite: graha positions, houses, Vimshottari dasha,
panchanga, KP sub-lords and vargas. All chart maths runs in the browser in plain
JavaScript on top of [astronomy.js](public/vendor/astronomy.js). A Cloudflare
Worker serves the static site and a small location-search API backed by D1.

- **Ayanamsa:** Lahiri, Raman, Krishnamurti
- **House systems:** Whole sign, Equal, Placidus

## Layout

| Path | Contents |
|------|----------|
| `public/index.html`, `public/css/`, `public/js/app.js` | Web UI |
| `public/js/kundli/ephemeris/` | Planet positions, ayanamsa, tropical → sidereal |
| `public/js/kundli/houses/` | Ascendant, MC and house cusps |
| `public/js/kundli/dasha/` | Vimshottari mahadasha / bhukti |
| `public/js/kundli/panchanga/` | Tithi, nakshatra, yoga, karana, vara, sunrise |
| `public/js/kundli/kp/` | KP sign / star / sub lords and significators |
| `public/js/kundli/vargas/` | Divisional charts (D2, D3, D10, D30, …) |
| `public/js/kundli/geo/` | Birth resolution: location lookup, timezone, local → UTC |
| `public/js/kundli/contracts/` | Shared type contracts |
| `src/worker.js` | Worker: `/api/health`, `/api/locations?q=`, `/api/locations/:id` |
| `migrations/` | D1 schema and seed locations |
| `tests/` | `node:test` suites, one folder per module |

Each module exposes its public API from its `index.js`; other modules and the UI
import only from there.

## Requirements

- Node.js 22+
- npm

## Setup

```sh
npm install
npm run db:local     # create and seed the local D1 location database
npm run dev          # wrangler dev → http://localhost:8787
```

## Testing

### Automated: `npm test`

```sh
npm test
```

Runs every `tests/**/*.test.js` with Node's built-in test runner
(`node:test` + `node:assert`, no other test dependencies). The suites cover each
module, including golden-chart checks against reference software output.

The whole suite must pass before a branch is merged.

### Manual: web UI

[`tests/web/CHECKLIST.md`](tests/web/CHECKLIST.md) lists the browser checks
(form, location autocomplete, chart rendering) to run against `npm run dev`.

## Development workflow

Each module is developed in its own git worktree on a `feat/<module>` branch:

```sh
./scripts/wt.sh new <module>    # create worktree + feat/<module>
./scripts/wt.sh list
./scripts/wt.sh rm <module>
```

Rules for module work:

- Change only `public/js/kundli/<module>/` and `tests/<module>/`.
- Import other modules only through their `index.js`.
- Every route or behaviour change comes with a test.

## Deployment

Deploys run from CI only ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)),
never from a developer machine. Every PR and push runs `npm test` and a bundle
check. A pull request into `master` then applies D1 migrations and deploys to
staging; merging into `master` does the same for production.

`wrangler.jsonc` is the only Wrangler config. Top level is production and
`env.staging` is staging; each has its own D1 database.

One-time setup before the first deploy:

1. Create both D1 databases and paste each `database_id` into `wrangler.jsonc`
   (production at the top level, staging under `env.staging`).
2. In GitHub → Settings → Environments, create `staging` and `production`, each
   with the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
