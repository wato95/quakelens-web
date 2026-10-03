import { PreviewDataError } from "../errors";
import { TECTONIC_COLUMNS } from "../manifest";
import {
  requiredBoolean,
  requiredString,
  type QueryExecutor,
  type QueryRow,
} from "../query";
import type {
  TectonicClassification,
  TectonicIdentity,
  TectonicRepository,
} from "../types";

export function createTectonicRepository(
  executor: QueryExecutor,
  identity: TectonicIdentity,
): TectonicRepository {
  return {
    async getTectonicClassification(eventId, eventRevisionId) {
      const rows = await executor.query(
        `select ${TECTONIC_COLUMNS.join(", ")} from preview_event_tectonics where event_id = ? and event_revision_id = ? limit 2`,
        [eventId, eventRevisionId],
      );
      if (rows.length !== 1)
        throw integrity(
          "Expected exactly one tectonic result for the selected revision",
        );
      const row = rows[0];
      if (
        requiredString(row, "event_id") !== eventId ||
        requiredString(row, "event_revision_id") !== eventRevisionId
      )
        throw integrity("Tectonic revision identity mismatch");
      const rowIdentity = {
        classifierVersion: requiredString(row, "classifier_version"),
        policyVersion: requiredString(row, "policy_version"),
        evidenceSnapshotVersion: requiredString(row, "evidence_snapshot_version"),
        strecVersion: requiredString(row, "strec_version"),
        packageSha256: requiredString(row, "package_sha256"),
        configSha256: requiredString(row, "config_sha256"),
        runtimeLockSha256: requiredString(row, "runtime_lock_sha256"),
        referenceBundleVersion: requiredString(row, "reference_bundle_version"),
      };
      for (const key of Object.keys(rowIdentity) as (keyof typeof rowIdentity)[]) {
        if (rowIdentity[key] !== identity[key])
          throw integrity(`Incompatible tectonic ${key}`);
      }
      const result: TectonicClassification = {
        eventId,
        eventRevisionId,
        identity: rowIdentity,
        classificationStatus: enumeration(row, "classification_status", [
          "CLASSIFIED",
          "UNKNOWN",
        ]),
        tectonicRegime: enumeration(row, "tectonic_regime", [
          "ACTIVE",
          "STABLE",
          "SUBDUCTION",
          "VOLCANIC",
          "UNKNOWN",
        ]),
        tectonicEnvironment: enumeration(row, "tectonic_environment", [
          "ACTIVE_SHALLOW_CRUST",
          "ACTIVE_DEEP",
          "STABLE",
          "SUBDUCTION",
          "VOLCANIC",
          "UNKNOWN",
        ]),
        sourceDomain: enumeration(row, "source_domain", [
          "CONTINENTAL",
          "OCEANIC",
          "UNKNOWN",
        ]),
        depthDomain: enumeration(row, "depth_domain", [
          "SHALLOW",
          "DEEP",
          "TRANSITION",
          "UNKNOWN",
        ]),
        classificationConfidence: enumeration(row, "classification_confidence", [
          "HIGH",
          "LOW",
          "UNKNOWN",
        ]),
        classificationMethod: enumeration(row, "classification_method", [
          "STREC_PINNED_INTERIOR_POLICY_V1",
        ]),
        classificationReasonCode: enumeration(row, "classification_reason_code", [
          "ELIGIBLE_ACTIVE_SHALLOW_INTERIOR",
          "STREC_FAILED",
          "UNSUPPORTED_STREC",
          "UNKNOWN_REGION",
          "INVALID_FEATURES",
          "OCEANIC",
          "NON_CONTINENTAL",
          "STABLE",
          "SUBDUCTION",
          "VOLCANIC",
          "INVALID_DEPTH",
          "DEEP",
          "TRANSITION",
          "REVIEW_POLICY_FAILED",
        ]),
        allen2012Applicable: requiredBoolean(row, "allen_2012_applicable"),
        classificationRunId: requiredString(row, "classification_run_id"),
        strecRunId: requiredString(row, "strec_run_id"),
        sourceId: enumeration(row, "source_id", ["usgs_strec"]),
        licenceId: enumeration(row, "licence_id", ["usgs-public-domain"]),
      };
      // Verify published identity only; no classifier or applicability policy runs in the browser.
      if (
        !/^[0-9a-f]{64}$/.test(eventRevisionId) ||
        result.classificationRunId !==
          (await identityHash([
            eventRevisionId,
            identity.policyVersion,
            identity.referenceBundleVersion,
            identity.evidenceSnapshotVersion,
          ])) ||
        result.strecRunId !==
          (await identityHash([
            eventRevisionId,
            identity.classifierVersion,
            identity.referenceBundleVersion,
            identity.evidenceSnapshotVersion,
          ]))
      ) {
        throw integrity("Tectonic run identity mismatch");
      }
      return result;
    },
  };
}

function enumeration<const T extends string>(
  row: QueryRow,
  name: string,
  values: readonly T[],
): T {
  const value = requiredString(row, name);
  if (!values.some((candidate) => candidate === value))
    throw integrity(`Unsupported tectonic ${name}`);
  return value as T;
}
function integrity(message: string) {
  return new PreviewDataError("data_integrity", message);
}
export async function identityHash(parts: readonly string[]): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(parts)),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
