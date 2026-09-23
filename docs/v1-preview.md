# QuakeLens V1 browser preview

QuakeLens V1 is a static browser over one immutable PulseFoundry PF1-208 data product. It is an analytical preview, not a live earthquake feed and not the final PF-1 scientific publication.

## Pinned release

- Preview build: `20260921T204938Z-a14edef9b000`
- Published event-time coverage: `2026-01-01T00:00:00Z` through `2026-09-01T00:00:00Z` (exclusive)
- Annual partition: 2026
- Expected public URL: `https://wato95.github.io/quakelens-web/`

The application displays coverage from the loaded manifest. It does not infer coverage through the current date and does not interpret unpublished periods as zero activity.

## Available V1 capabilities

- earthquake map, clustering and shared event selection;
- event summary and source metadata;
- captured QuakeLens event-state history;
- published daily seismic activity;
- location-text search, magnitude/depth filters and sortable results;
- query-string share state.

Tectonic setting, shaking and population exposure are explicitly `not_in_preview`. Their selected-event cards are neutral availability statements, not zero values or technical errors. Census place population remains search context and is never aggregated into official exposure.

## Data and performance boundary

The browser starts from `manifest.json`, validates its contract and exposes its four manifest-relative Parquet artifacts through typed DuckDB-Wasm repositories. Events and daily activity register at startup; revisions and places register only when their repositories are first queried. No runtime API, database or private credential is required.

The QLW-008 production verification used a local Pages-like static server, headless Chromium at 1440 × 1000 and the pinned build. A representative cold run reached the summary at approximately 1.5 seconds and a ready clustered map at approximately 2.9 seconds. At map-ready Chromium reported about 15 MiB JavaScript heap used, 30.1 MiB allocated and 1,613 DOM nodes. These local figures are smoke observations rather than public-network service-level guarantees.

Published artifact sizes are:

| Artifact       |   Rows |     Bytes |
| -------------- | -----: | --------: |
| Events         | 19,503 | 1,259,751 |
| Revisions      | 19,537 | 1,240,842 |
| Daily activity |    243 |     1,755 |
| Places         | 32,333 |   620,774 |
| Total          |        | 3,123,122 |

Only events and daily activity were requested before map-ready. Revision and place Parquet registration is deferred to its repository’s first query; the production browser test confirms revisions are first requested when captured history opens. The complete `dist/` tree is approximately 84 MiB because it includes both DuckDB-Wasm runtime variants and workers. Vite reports the expected large-chunk warning for these browser runtimes, but the smoke run did not indicate a need for a runtime backend.

## Known V1 limits

- The preview is historical and immutable rather than live/current.
- Named-place context is limited to the published U.S. Census place artifact.
- Captured states are observations archived by QuakeLens, not a claim about every update USGS ever made.
- Basemap availability depends on the configured attribution-bearing MapLibre style and tile service.
- Later QLW-30X/40X/50X stages will add published scientific products without calculating them in the browser.
