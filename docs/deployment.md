# QuakeLens V1 deployment

QuakeLens V1 is published as a static GitHub Pages site from the `gh-pages` branch. The normal source branch does not contain generated PF1-208 Parquet data.

## Prerequisites

- Node.js 22.12 or newer and the locked npm dependencies;
- a local PulseFoundry checkout containing `published/quakelens-preview/builds/`;
- the immutable build ID selected for release;
- Chromium installed for Playwright verification;
- push access to the repository when publication is requested.

The V1 pinned build is `20260921T204938Z-a14edef9b000`.

## Build the release artifact

```bash
npm run release:build -- \
  ../pulse-foundry \
  --build 20260921T204938Z-a14edef9b000 \
  --base /quakelens-web/
```

The command validates the manifest, artifact paths, byte sizes and SHA-256 digests before use. It then builds with the Pages base path and copies only the selected immutable build into:

```text
dist/data/quakelens-preview/builds/20260921T204938Z-a14edef9b000/
```

The embedded manifest URL is relative to the document, so query-string share URLs continue to resolve beneath `/quakelens-web/`.

Verify the production artifact with:

```bash
npm run test:e2e:release
```

## Publish to GitHub Pages

Publication is deliberately guarded and requires an explicit flag:

```bash
npm run release:publish -- \
  ../pulse-foundry \
  --build 20260921T204938Z-a14edef9b000 \
  --base /quakelens-web/ \
  --publish
```

The command refuses tracked working-tree changes, runs lint, formatting, type, unit and release-tool tests, rebuilds the validated artifact, creates a temporary one-commit `gh-pages` tree and force-updates only the remote `gh-pages` branch. It does not add generated preview data to the source branch.

Configure repository Pages to deploy from the root of `gh-pages`. No Actions secret, API key or runtime backend is required.

## Manual release gate

Before publication:

1. Run the full deterministic and real-preview test commands from the README.
2. Review the production build at desktop, tablet and phone widths.
3. Check keyboard order from header through toolbar, map/text results, timeline, table and event detail.
4. Confirm manifest, Parquet, DuckDB Wasm/worker, JavaScript, CSS and basemap requests resolve without a developer-machine path.
5. Confirm revision Parquet is not requested until captured history opens.
6. Confirm the source branch has no copied publication artifacts.

After publication, open a query-string share URL in a fresh browser session and confirm it restores selection/filter state without a Pages 404.
