# QuakeLens Web

QuakeLens Web is the static-first browser application for QuakeLens. UI V1 explores the
immutable PulseFoundry PF1-208 2026 browser-preview product without requiring a runtime
backend.

QLW-005 adds the PF1-208 daily-activity timeline and shared UTC time navigation to the map and
keyboard-accessible textual event browser. The initial window is the final 30 days of declared
preview coverage, independent of the user's current date. Seven-day, 30-day, 90-day, and full
preview controls re-query both event surfaces consistently. If a new range excludes the selected
event, QuakeLens clears that selection and closes its detail view.

QLW-005a adds direct UTC selection to that shared time window. A timeline click selects one
calendar day, a pointer drag selects an inclusive range in either direction, and labelled UTC
start/end controls provide the equivalent keyboard, screen-reader, and touch workflow. Custom
ranges are clamped to manifest coverage and continue to query events with an exclusive end
boundary; the published activity histogram is not recomputed from the filtered events.

QLW-007 adds repository-backed event location-text, magnitude, depth, event-type, source-status,
and review-status filters. U.S. Census 2024 place search is deliberately separate: selecting a
Census result provides map context only and does not represent global place coverage or official
population exposure. Reset returns to the final 30 days of published coverage.

The browser writes useful state to the query string so a static URL can restore the UTC window,
filters, and selected event. Supported keys are `event`, `range`, `from`, `to`, `minMag`,
`maxMag`, `minDepth`, `maxDepth`, `type`, `status`, `review`, and `q`. Invalid values are ignored
or normalized to manifest coverage, and the preview manifest remains deployment configuration
rather than user-controlled URL state.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Local development

```bash
npm install
npm run data:sync -- ../pulse-foundry
npm run dev
```

Vite prints the local URL when the development server starts.

`data:sync` finds `published/quakelens-preview` beneath the supplied PulseFoundry checkout,
selects the valid immutable build with the latest manifest `generated_at`, validates its four
artifacts (including byte counts and SHA-256), copies it to the gitignored
`public/_preview/builds/<preview_build_id>/` directory, and configures `.env.local`. It never
hard-codes the source checkout path into browser code.

Pin a particular immutable build when needed:

```bash
npm run data:sync -- ../pulse-foundry --build 20260921T204938Z-a14edef9b000
```

The browser starts only from `VITE_QUAKELENS_MANIFEST_URL`. Artifact URLs are resolved relative
to that manifest. For a remotely hosted manifest, its origin must allow browser `GET`, `HEAD`,
and range requests. All `VITE_*` values are public browser configuration and must not contain
secrets.

The basemap defaults to the attribution-bearing OpenFreeMap dark style. Override it without
changing application code when deploying or testing:

```bash
VITE_QUAKELENS_MAP_STYLE_URL=https://example.org/styles/quakelens-dark/style.json
```

The selected style must be compatible with MapLibre and declare all required source/data
attribution. Basemap failure is presented separately from preview-data failure.

## Quality checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:data-sync
npm run build
```

Install the Playwright Chromium browser once, then run the desktop and mobile smoke tests:

```bash
npx playwright install chromium
npm run test:e2e
```

After syncing the neighbouring real PF1-208 publication, run its explicit repository smoke with:

```bash
QLW_REAL_PREVIEW_SMOKE=1 npm run test:e2e -- \
  tests/repository-real-preview.spec.ts --project=desktop-chromium
```

The same opt-in run measures real-catalogue map readiness and verifies that all 19,503 events
reach the clustered MapLibre source:

```bash
QLW_REAL_PREVIEW_SMOKE=1 npm run test:e2e -- \
  tests/map-real-preview.spec.ts --project=desktop-chromium
```

The normal deterministic test suite uses a small committed PF1-208 contract fixture and does not
require PulseFoundry or a live USGS service.

## Design system

Application components consume semantic CSS tokens from `src/styles/`. The reserved
`src/styles/scientific/mmi.css` file is deliberately not imported: MMI colours are not
general application colours and are outside UI V1.

## Preview data boundary

QLW-002 provides the typed manifest loader, browser-local DuckDB-Wasm runtime, and repositories
for events, captured states, populated UTC activity dates, and U.S. Census place context. React
components remain independent of SQL, Arrow, Parquet layout, and local filesystem paths.

QLW-004 uses the event summaries for both the map and paginated textual results. Both surfaces
share one selected-event state, and the selected detail remains independent of captured-history,
places, or unpublished scientific products. QLW-005 loads the published daily activity artifact
once for the declared coverage and issues bounded event queries when the shared UTC window
changes; it does not derive activity from event revisions or invent zero-activity days outside
coverage. Catalogue points, clusters, and timeline bars use the application accent palette;
marker radius alone represents magnitude. A separate unclustered source keeps the selected event
visible when the catalogue reclusters.

QLW-007 keeps filter SQL inside the typed event repository. Filter option values come from the
published event artifact, while query-string parsing and serialization remain independent of
the configured manifest URL. Browser back/forward applies the same shared state used by the map,
timeline, result list, and event detail.

The preview exposes tectonics, shaking, and exposure as `not_in_preview`. Census population is
place context only and is never aggregated or presented as official population exposure.
