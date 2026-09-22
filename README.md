# QuakeLens Web

QuakeLens Web is the static-first browser application for QuakeLens. UI V1 explores the
immutable PulseFoundry PF1-208 2026 browser-preview product without requiring a runtime
backend.

QLW-001 establishes the React/Vite application shell and design foundation. Its map,
timeline, and event catalogue are intentionally labelled placeholders. Manifest loading,
DuckDB-Wasm, real events, and MapLibre layers belong to later QLW work packets.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Local development

```bash
npm install
npm run dev
```

Vite prints the local URL when the development server starts.

## Quality checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
```

Install the Playwright Chromium browser once, then run the desktop and mobile smoke tests:

```bash
npx playwright install chromium
npm run test:e2e
```

## Design system

Application components consume semantic CSS tokens from `src/styles/`. The reserved
`src/styles/scientific/mmi.css` file is deliberately not imported: MMI colours are not
general application colours and are outside UI V1.

## Preview data boundary

QLW-001 does not load preview data. Later work selects a published manifest through a
browser-visible configuration value such as `VITE_QUAKELENS_MANIFEST_URL`. Local generated
data can be exposed under the gitignored `public/_preview/` path; machine-specific source
paths must never be committed or hard-coded in the application.
