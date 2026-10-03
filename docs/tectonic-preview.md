# QLW-301 tectonic preview

The release candidate uses immutable PF1-307 build `20261002T231905Z-ac54a170acfa`, schema version `2`, with 19,503 events covering January–August 2026. Original schema-v1 PF1-208 previews remain supported. Publication to the unchanged Pages URL requires explicit authorization after review; this document does not claim the candidate is live.

## Data contract and presentation

The browser discovers `event_tectonics` through `artifacts`, scientific identity/validation metadata through `tectonics`, and the PB2002 display reference through `references`. All file URLs resolve relative to the selected manifest. Unsupported versions, incomplete preview coverage, incompatible column types and missing required metadata are rejected at the boundary.

`getTectonicClassification(eventId, eventRevisionId)` performs a parameterized exact lookup bounded to two rows. Exactly one result is required. Missing or duplicate rows, incompatible identity, unsupported values and read failures become recoverable data errors. Row scientific identity must match the manifest; classification/STREC run hashes are checked against the published identity formulas. The browser does not execute the classifier or applicability policy.

The compact Parquet registers on the first selected-event query and shares the existing one-registration guard. No tectonic query is made for `not_in_preview`. A selected-event change remounts the card by build/event/revision identity; disposed requests cannot overwrite the new selection. Captured history remains separate inspection and does not replace the primary published current revision.

Public labels live in `tectonicFormatting.ts`:

| Published environment       | Public label                        |
| --------------------------- | ----------------------------------- |
| `ACTIVE_SHALLOW_CRUST`      | Active shallow crust                |
| `ACTIVE_DEEP`               | Active deep                         |
| `STABLE`                    | Stable tectonic setting             |
| `SUBDUCTION`                | Subduction                          |
| `VOLCANIC`                  | Volcanic setting                    |
| Completed `UNKNOWN` outcome | Could not be classified confidently |

Published confidence is independent of outcome: `HIGH` means “High confidence”, `LOW` means “Low confidence”, and `UNKNOWN` means “Confidence not established”. A classified result with unknown confidence remains classified. No confidence probability is derived. Completed unknown outcomes are neutral scientific uncertainty, distinct from an unavailable capability or technical error.

The tectonic card shows only its heading and the published setting (or neutral unknown outcome). A separate “View tectonic details” button, matching the captured-history disclosure pattern, expands confidence, method, explanation and provenance. The details expose method, reason, classifier/policy/STREC versions, reference bundle and run/revision identities, with a manifest-relative validation report link. The validation scope is curated regression, not independent global scientific validation. Raw STREC weights are absent. Tectonic applicability is not public Allen authorization; shaking and exposure remain unavailable.

## Plate-boundary cartography

The published reference contains 241 PB2002 line features and measures 162,684 bytes. Its fetch is independent of DuckDB and event selection. A shared pending request verifies the declared byte count/hash before validating GeoJSON LineString coordinates, feature count, properties and antimeridian separation. Invalid or unsplit geometry is rejected rather than repaired into new scientific information.

MapLibre draws a thin neutral dashed line below all earthquake layers, using `mapTheme.plateBoundary`. Existing marker, selection, clustering and navigation behavior is retained. The layer defaults on; its accessible checkbox stores visible/hidden state in session storage and preserves it across refreshes in the same tab. Disabled storage falls back to in-memory state.

The footer’s “PB2002 source and licence” reference disclosure credits Bird (2003), DOI `10.1029/2001GC000252`, GIS conversion by Hugo Ahlenius/Nordpil and GeoJSON by csterling/fraxen/tectonicplates. It links the pinned source and Open Data Commons Attribution License 1.0 and retains the attribution notice. The map-layer box contains only the layer toggle and its loading/error controls. Boundary data is fetched from the publication, never from GitHub at runtime. Attribution links are available for deliberate user navigation.

Fetch, integrity, geometry or source/layer failures expose “Plate boundaries unavailable” with retry; core browsing and tectonic detail remain usable. Boundary proximity, causality and nearest-boundary distance are never computed. The display reference is distinct from STREC/Slab2 scientific evidence.

## Verification and fixtures

`tests/fixtures/tectonic-preview` is a deliberately small synthetic test publication, built on the existing two-event browser fixture. Classifications and three boundary lines are synthetic; they are not production scientific results. Manifest scientific/source identities use the published contract. Production data stays in gitignored local preview/build output.

The original schema-v1 fixture still exercises unavailable capabilities. Focused tests cover contract rejection, exact and duplicate/missing queries, run identity mismatch, classified/unknown/error states, retry, stale-request suppression, boundary integrity/geometry checks, subordinate MapLibre registration, keyboard toggling, session persistence, attribution, failure isolation, mobile detail and URL refresh.

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:data-sync
npm run test:release
npm run test:e2e

npm run data:sync -- ../pulse-foundry --build 20261002T231905Z-ac54a170acfa
QLW_REAL_PREVIEW_SMOKE=1 npm run test:e2e -- \
  tests/tectonic-real-preview.spec.ts tests/map-real-preview.spec.ts
npm run release:build -- ../pulse-foundry \
  --build 20261002T231905Z-ac54a170acfa --base /quakelens-web/
npm run test:e2e:release
```

The world/regional smoke captures MapLibre canvas screenshots and checks visible boundary rendering against the hidden layer. Geometry tests reject longitude jumps over 180 degrees. Real-preview tests attach performance observations and screenshots; these local measurements are not public-network guarantees.

No dependencies were added. The centralized map theme gains one neutral cartography colour and layer/source identifiers; existing application tokens and CSS Modules govern presentation. Later shaking, exposure, scientific filters and the full Data & Method drawer remain outside QLW-301.
