import rawManifest from "../../tests/fixtures/tectonic-preview/manifest.json";
import { parsePreviewManifest } from "../data/manifest";
import type { TectonicClassification } from "../data/types";

export const tectonicManifest = parsePreviewManifest(
  rawManifest,
  new URL("https://example.test/build/manifest.json"),
);
export function makeTectonicClassification(
  overrides: Partial<TectonicClassification> = {},
): TectonicClassification {
  return {
    eventId: "us-test",
    eventRevisionId: "a".repeat(64),
    classificationStatus: "CLASSIFIED",
    tectonicRegime: "ACTIVE",
    tectonicEnvironment: "ACTIVE_SHALLOW_CRUST",
    sourceDomain: "CONTINENTAL",
    depthDomain: "SHALLOW",
    classificationConfidence: "HIGH",
    classificationMethod: "STREC_PINNED_INTERIOR_POLICY_V1",
    classificationReasonCode: "ELIGIBLE_ACTIVE_SHALLOW_INTERIOR",
    allen2012Applicable: true,
    classificationRunId: "b".repeat(64),
    strecRunId: "c".repeat(64),
    identity: tectonicManifest.tectonics!.identity,
    sourceId: "usgs_strec",
    licenceId: "usgs-public-domain",
    ...overrides,
  };
}
export function makeTectonicManifestJson() {
  return structuredClone(rawManifest);
}
