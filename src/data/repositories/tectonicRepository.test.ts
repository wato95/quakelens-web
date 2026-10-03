import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTectonicRepository, identityHash } from "./tectonicRepository";
import { tectonicManifest } from "../../test/tectonicFixture";
import type { QueryRow } from "../query";

beforeEach(() => vi.stubGlobal("crypto", webcrypto));
afterEach(() => vi.unstubAllGlobals());
const identity = tectonicManifest.tectonics!.identity;
async function row(): Promise<QueryRow> {
  const eventRevisionId = "a".repeat(64);
  return {
    event_id: "us-test",
    event_revision_id: eventRevisionId,
    classification_status: "CLASSIFIED",
    tectonic_regime: "ACTIVE",
    tectonic_environment: "ACTIVE_SHALLOW_CRUST",
    source_domain: "CONTINENTAL",
    depth_domain: "SHALLOW",
    classification_confidence: "HIGH",
    classification_method: "STREC_PINNED_INTERIOR_POLICY_V1",
    classification_reason_code: "ELIGIBLE_ACTIVE_SHALLOW_INTERIOR",
    allen_2012_applicable: true,
    classification_run_id: await identityHash([
      eventRevisionId,
      identity.policyVersion,
      identity.referenceBundleVersion,
      identity.evidenceSnapshotVersion,
    ]),
    strec_run_id: await identityHash([
      eventRevisionId,
      identity.classifierVersion,
      identity.referenceBundleVersion,
      identity.evidenceSnapshotVersion,
    ]),
    classifier_version: identity.classifierVersion,
    policy_version: identity.policyVersion,
    evidence_snapshot_version: identity.evidenceSnapshotVersion,
    strec_version: identity.strecVersion,
    package_sha256: identity.packageSha256,
    config_sha256: identity.configSha256,
    runtime_lock_sha256: identity.runtimeLockSha256,
    reference_bundle_version: identity.referenceBundleVersion,
    source_id: "usgs_strec",
    licence_id: "usgs-public-domain",
  };
}
describe("tectonic exact-revision repository", () => {
  it("bounds a parameterized lookup by both identities and verifies published provenance", async () => {
    const query = vi.fn().mockResolvedValue([await row()]);
    const result = await createTectonicRepository(
      { query },
      identity,
    ).getTectonicClassification("us-test", "a".repeat(64));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("where event_id = ? and event_revision_id = ? limit 2"),
      ["us-test", "a".repeat(64)],
    );
    expect(result.classificationStatus).toBe("CLASSIFIED");
    expect(result.identity).toMatchObject({ policyVersion: identity.policyVersion });
  });
  it.each([0, 2])("rejects %s matching rows as integrity errors", async (count) => {
    const query = vi.fn().mockResolvedValue(Array.from({ length: count }, () => ({})));
    await expect(
      createTectonicRepository({ query }, identity).getTectonicClassification(
        "us-test",
        "a".repeat(64),
      ),
    ).rejects.toMatchObject({ code: "data_integrity" });
  });
  it.each([
    "event_id",
    "event_revision_id",
    "classifier_version",
    "policy_version",
    "classification_run_id",
    "strec_run_id",
    "reference_bundle_version",
    "classification_status",
    "classification_confidence",
  ])("rejects incompatible %s", async (field) => {
    const data = await row();
    data[field] = "incompatible";
    await expect(
      createTectonicRepository(
        { query: vi.fn().mockResolvedValue([data]) },
        identity,
      ).getTectonicClassification("us-test", "a".repeat(64)),
    ).rejects.toMatchObject({ code: "data_integrity" });
  });
  it("preserves completed unknown and confidence separately", async () => {
    const data = await row();
    Object.assign(data, {
      classification_status: "UNKNOWN",
      classification_confidence: "LOW",
      tectonic_environment: "UNKNOWN",
      classification_reason_code: "TRANSITION",
      allen_2012_applicable: false,
    });
    const result = await createTectonicRepository(
      { query: vi.fn().mockResolvedValue([data]) },
      identity,
    ).getTectonicClassification("us-test", "a".repeat(64));
    expect(result).toMatchObject({
      classificationStatus: "UNKNOWN",
      classificationConfidence: "LOW",
      allen2012Applicable: false,
    });
  });
  it("propagates artifact/query failures rather than fabricating an unknown", async () => {
    const failure = new Error("artifact failed");
    await expect(
      createTectonicRepository(
        { query: vi.fn().mockRejectedValue(failure) },
        identity,
      ).getTectonicClassification("us-test", "a".repeat(64)),
    ).rejects.toBe(failure);
  });
});
