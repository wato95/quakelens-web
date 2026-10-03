import { PreviewDataError } from "./errors";
import type {
  ExcludedPartition,
  LicenceAttribution,
  PreviewArtifact,
  CoreArtifactName,
  StaticReference,
  TectonicPublication,
  PlateBoundaryReference,
  PreviewArtifactName,
  PreviewCapabilities,
  PreviewManifest,
  SourceAttribution,
} from "./types";

const PRODUCT_KIND = "quakelens-browser-preview";
const SCHEMA_VERSIONS = ["1", "2"] as const;
const BUILD_ID_PATTERN = /^\d{8}T\d{6}Z-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const ARTIFACT_CONTRACTS = {
  event_tectonics: "pf1-307-preview-event-tectonics-v1",
  events: "pf1-207-preview-events-v1",
  revisions: "pf1-207-preview-revisions-v1",
  daily_activity: "pf1-207-preview-daily-activity-v1",
  places: "places-parquet-v2",
} as const;

export const TECTONIC_COLUMNS = [
  "event_id",
  "event_revision_id",
  "classification_status",
  "tectonic_regime",
  "tectonic_environment",
  "source_domain",
  "depth_domain",
  "classification_confidence",
  "classification_method",
  "classification_reason_code",
  "allen_2012_applicable",
  "classification_run_id",
  "strec_run_id",
  "classifier_version",
  "policy_version",
  "evidence_snapshot_version",
  "strec_version",
  "package_sha256",
  "config_sha256",
  "runtime_lock_sha256",
  "reference_bundle_version",
  "source_id",
  "licence_id",
] as const;

const REQUIRED_COLUMNS: Record<PreviewArtifactName, readonly string[]> = {
  event_tectonics: TECTONIC_COLUMNS,
  events: [
    "event_id",
    "event_revision_id",
    "event_time",
    "source_updated_at",
    "magnitude",
    "magnitude_type",
    "longitude",
    "latitude",
    "depth_km",
    "status",
    "event_type",
    "review_status",
    "place_description",
    "captured_state_count",
    "source_id",
    "licence_id",
  ],
  revisions: [
    "event_id",
    "event_revision_id",
    "captured_state_number",
    "is_initial_state",
    "event_time",
    "source_updated_at",
    "magnitude",
    "magnitude_type",
    "longitude",
    "latitude",
    "depth_km",
    "status",
    "event_type",
    "review_status",
    "place_description",
    "changed_fields",
    "source_id",
    "licence_id",
  ],
  daily_activity: ["activity_date_utc", "event_count", "max_magnitude"],
  places: [
    "place_id",
    "name",
    "place_type",
    "country_code",
    "admin1_code",
    "admin1_name",
    "latitude",
    "longitude",
    "population_context",
    "population_year",
    "population_source_id",
    "source_id",
    "source_vintage",
    "raw_snapshot_sha256",
  ],
};

type JsonObject = Record<string, unknown>;

function object(value: unknown, path: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalid(`${path} must be an object`);
  }
  return value as JsonObject;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw invalid(`${path} must be an array`);
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw invalid(`${path} must be a string`);
  return value;
}

function number(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw invalid(`${path} must be a number`);
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw invalid(`${path} must be a boolean`);
  return value;
}

function instant(value: unknown, path: string): string {
  const result = string(value, path);
  if (!result.endsWith("Z") || Number.isNaN(Date.parse(result))) {
    throw invalid(`${path} must be a UTC timestamp`);
  }
  return result;
}

function invalid(message: string): PreviewDataError {
  return new PreviewDataError(
    "manifest_invalid",
    `Invalid preview manifest: ${message}`,
  );
}

export function resolveArtifactUrl(manifestUrl: URL, relativePath: string): URL {
  if (
    relativePath.startsWith("/") ||
    relativePath.includes(":") ||
    relativePath.includes("\\") ||
    relativePath.includes("?") ||
    relativePath.includes("#") ||
    relativePath.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw invalid(`artifact path is not a contained portable path: ${relativePath}`);
  }
  const resolved = new URL(relativePath, manifestUrl);
  const buildDirectory = new URL("./", manifestUrl);
  if (
    resolved.origin !== buildDirectory.origin ||
    !resolved.href.startsWith(buildDirectory.href)
  ) {
    throw invalid(`artifact path escapes the preview build: ${relativePath}`);
  }
  return resolved;
}

function parseArtifact(value: unknown, manifestUrl: URL): PreviewArtifact {
  const raw = object(value, "artifacts[]");
  const logicalName = string(raw.logical_name, "artifacts[].logical_name");
  if (!(logicalName in ARTIFACT_CONTRACTS))
    throw invalid(`unexpected artifact ${logicalName}`);
  const name = logicalName as PreviewArtifactName;
  const contractVersion = string(raw.contract_version, `${name}.contract_version`);
  if (contractVersion !== ARTIFACT_CONTRACTS[name]) {
    throw new PreviewDataError(
      "unsupported_schema",
      `Unsupported ${name} contract ${contractVersion}; expected ${ARTIFACT_CONTRACTS[name]}`,
    );
  }
  const relativePath = string(raw.relative_path, `${name}.relative_path`);
  const sha256 = string(raw.sha256, `${name}.sha256`);
  if (!SHA256_PATTERN.test(sha256))
    throw invalid(`${name}.sha256 must be lowercase SHA-256`);
  const columns = array(raw.columns, `${name}.columns`).map((column, index) => {
    const item = object(column, `${name}.columns[${index}]`);
    return {
      name: string(item.name, `${name}.columns[${index}].name`),
      physicalType: string(
        item.physical_type,
        `${name}.columns[${index}].physical_type`,
      ),
    };
  });
  const columnNames = columns.map((column) => column.name);
  if (columnNames.join("\0") !== REQUIRED_COLUMNS[name].join("\0")) {
    throw new PreviewDataError(
      "unsupported_schema",
      `Unsupported ${name} column schema`,
    );
  }
  if (
    name === "event_tectonics" &&
    columns.some(
      (column) =>
        column.physicalType !==
        (column.name === "allen_2012_applicable" ? "BOOLEAN" : "VARCHAR"),
    )
  ) {
    throw new PreviewDataError(
      "unsupported_schema",
      "Unsupported tectonic physical column types",
    );
  }
  return {
    logicalName: name,
    relativePath,
    url: resolveArtifactUrl(manifestUrl, relativePath),
    contractVersion,
    rows: number(raw.rows, `${name}.rows`),
    bytes: number(raw.bytes, `${name}.bytes`),
    sha256,
    columns,
  };
}

function literal<T extends string>(value: unknown, expected: T, path: string): T {
  if (value !== expected) throw invalid(`${path} must be ${expected}`);
  return expected;
}

function parseCapabilities(value: unknown, version: "1" | "2"): PreviewCapabilities {
  const raw = object(value, "capabilities");
  return {
    events: literal(raw.events, "available", "capabilities.events"),
    revisions: literal(raw.revisions, "captured_history", "capabilities.revisions"),
    places: literal(raw.places, "us_census_2024", "capabilities.places"),
    tectonics: literal(
      raw.tectonics,
      version === "2" ? "available" : "not_in_preview",
      "capabilities.tectonics",
    ),
    shaking: literal(raw.shaking, "not_in_preview", "capabilities.shaking"),
    exposure: literal(raw.exposure, "not_in_preview", "capabilities.exposure"),
  };
}

function parseExcluded(value: unknown): ExcludedPartition[] {
  return array(value, "excluded_or_incomplete_partitions").map((entry, index) => {
    const raw = object(entry, `excluded_or_incomplete_partitions[${index}]`);
    return {
      eventTimeStartInclusive: instant(
        raw.event_time_start_inclusive,
        `excluded[${index}].start`,
      ),
      eventTimeEndExclusive: instant(
        raw.event_time_end_exclusive,
        `excluded[${index}].end`,
      ),
      state: literal(raw.state, "not_published", `excluded[${index}].state`),
      reason: string(raw.reason, `excluded[${index}].reason`),
    };
  });
}

function parseSources(value: unknown): {
  sources: SourceAttribution[];
  licences: LicenceAttribution[];
} {
  const registry = object(value, "sources_and_attribution");
  return {
    sources: array(registry.sources, "sources_and_attribution.sources").map(
      (entry, index) => {
        const raw = object(entry, `sources[${index}]`);
        return {
          sourceId: string(raw.source_id, `sources[${index}].source_id`),
          provider: string(raw.provider, `sources[${index}].provider`),
          attribution: string(raw.attribution, `sources[${index}].attribution`),
          sourceUrl: string(raw.source_url, `sources[${index}].source_url`),
          licenceId: string(raw.licence_id, `sources[${index}].licence_id`),
          redistributionNotes: string(
            raw.redistribution_notes,
            `sources[${index}].redistribution_notes`,
          ),
        };
      },
    ),
    licences: array(registry.licences, "sources_and_attribution.licences").map(
      (entry, index) => {
        const raw = object(entry, `licences[${index}]`);
        return {
          licenceId: string(raw.licence_id, `licences[${index}].licence_id`),
          name: string(raw.name, `licences[${index}].name`),
          licenceUrl: string(raw.licence_url, `licences[${index}].licence_url`),
          attributionRequirements: string(
            raw.attribution_requirements,
            `licences[${index}].attribution_requirements`,
          ),
          redistributionNotes: string(
            raw.redistribution_notes,
            `licences[${index}].redistribution_notes`,
          ),
        };
      },
    ),
  };
}

export function parsePreviewManifest(
  value: unknown,
  manifestUrl: URL,
): PreviewManifest {
  const raw = object(value, "manifest");
  if (raw.product_kind !== PRODUCT_KIND) {
    throw new PreviewDataError(
      "unsupported_schema",
      `Unsupported product_kind ${String(raw.product_kind)}; expected ${PRODUCT_KIND}`,
    );
  }
  if (!SCHEMA_VERSIONS.some((version) => version === raw.preview_schema_version)) {
    throw new PreviewDataError(
      "unsupported_schema",
      `Unsupported preview_schema_version ${String(raw.preview_schema_version)}; expected 1 or 2`,
    );
  }
  const version = raw.preview_schema_version as "1" | "2";
  const expectedArtifacts = version === "2" ? 5 : 4;
  const previewBuildId = string(raw.preview_build_id, "preview_build_id");
  if (!BUILD_ID_PATTERN.test(previewBuildId))
    throw invalid("preview_build_id has an invalid format");
  const artifactList = array(raw.artifacts, "artifacts").map((artifact) =>
    parseArtifact(artifact, manifestUrl),
  );
  if (
    artifactList.length !== expectedArtifacts ||
    new Set(artifactList.map((item) => item.logicalName)).size !== expectedArtifacts
  ) {
    throw invalid("artifacts must contain exactly one of each required artifact");
  }
  const artifacts = Object.fromEntries(
    artifactList.map((artifact) => [artifact.logicalName, artifact]),
  ) as PreviewManifest["artifacts"];
  const coreNames: CoreArtifactName[] = [
    "events",
    "revisions",
    "daily_activity",
    "places",
  ];
  if (
    coreNames.some((name) => !artifacts[name]) ||
    (version === "2" && !artifacts.event_tectonics)
  )
    throw invalid("Missing required artifacts");
  if (
    artifacts.event_tectonics &&
    artifacts.event_tectonics.rows !== artifacts.events.rows
  )
    throw invalid("Tectonic row count does not reconcile with events");
  const coverage = object(raw.included_coverage, "included_coverage");
  const attribution = parseSources(raw.sources_and_attribution);
  return {
    productKind: PRODUCT_KIND,
    previewSchemaVersion: version,
    previewBuildId,
    generatedAt: instant(raw.generated_at, "generated_at"),
    manifestUrl,
    includedCoverage: {
      eventTimeStartInclusive: instant(
        coverage.event_time_start_inclusive,
        "coverage.start",
      ),
      eventTimeEndExclusive: instant(coverage.event_time_end_exclusive, "coverage.end"),
      observedMinEventTime: instant(
        coverage.observed_min_event_time,
        "coverage.observed_min",
      ),
      observedMaxEventTime: instant(
        coverage.observed_max_event_time,
        "coverage.observed_max",
      ),
      annualPartition: number(coverage.annual_partition, "coverage.annual_partition"),
      acquisitionStatus: literal(
        coverage.acquisition_status,
        "complete",
        "coverage.acquisition_status",
      ),
      catalogueComplete: boolean(
        coverage.catalogue_complete,
        "coverage.catalogue_complete",
      ),
      detailComplete: boolean(coverage.detail_complete, "coverage.detail_complete"),
    },
    excludedOrIncompletePartitions: parseExcluded(
      raw.excluded_or_incomplete_partitions,
    ),
    capabilities: parseCapabilities(raw.capabilities, version),
    ...(version === "2"
      ? {
          tectonics: parseTectonics(raw.tectonics, manifestUrl, artifacts.events.rows),
          plateBoundaries: parsePlateBoundaries(
            raw.references,
            manifestUrl,
            attribution,
          ),
        }
      : {}),
    artifacts,
    ...attribution,
  };
}

export async function loadPreviewManifest(
  manifestUrl: URL,
  fetcher: typeof fetch = fetch,
): Promise<PreviewManifest> {
  let response: Response;
  try {
    response = await fetcher(manifestUrl);
  } catch (error) {
    throw new PreviewDataError(
      "manifest_load",
      `Could not load preview manifest: ${manifestUrl}`,
      {
        cause: error,
      },
    );
  }
  if (!response.ok) {
    throw new PreviewDataError(
      "manifest_load",
      `Could not load preview manifest (${response.status} ${response.statusText}): ${manifestUrl}`,
    );
  }
  try {
    return parsePreviewManifest(await response.json(), manifestUrl);
  } catch (error) {
    if (error instanceof PreviewDataError) throw error;
    throw new PreviewDataError(
      "manifest_invalid",
      "Preview manifest is not valid JSON",
      { cause: error },
    );
  }
}

function positiveInteger(value: unknown, path: string): number {
  const result = number(value, path);
  if (!Number.isSafeInteger(result) || result <= 0)
    throw invalid(`${path} must be a positive integer`);
  return result;
}
function hash(value: unknown, path: string): string {
  const result = string(value, path);
  if (!SHA256_PATTERN.test(result))
    throw invalid(`${path} must be a lowercase SHA-256`);
  return result;
}
function staticReference(value: unknown, manifestUrl: URL): StaticReference {
  const raw = object(value, "reference");
  const relativePath = string(raw.relative_path, "reference.relative_path");
  return {
    relativePath,
    url: resolveArtifactUrl(manifestUrl, relativePath),
    schemaVersion: schemaOne(raw.schema_version),
    bytes: positiveInteger(raw.bytes, "reference.bytes"),
    sha256: hash(raw.sha256, "reference.sha256"),
  };
}
function parseTectonics(
  value: unknown,
  manifestUrl: URL,
  eventRows: number,
): TectonicPublication {
  const raw = object(value, "tectonics");
  if (raw.schema_version !== 1) throw invalid("Unsupported tectonics schema_version");
  const identity = object(raw.identity, "tectonics.identity");
  const coverage = object(
    raw.preview_event_coverage,
    "tectonics.preview_event_coverage",
  );
  if (
    coverage.state !== "complete" ||
    coverage.published_preview_events !== eventRows ||
    coverage.completed_preview_events !== eventRows ||
    coverage.missing_or_invalid_preview_events !== 0
  )
    throw invalid("Tectonic preview coverage is incomplete or incompatible");
  const validation = object(raw.validation, "tectonics.validation");
  const evidenceCoverage = object(raw.coverage, "tectonics.coverage");
  literal(validation.logical_name, "tectonic_summary", "validation.logical_name");
  literal(evidenceCoverage.logical_name, "tectonic_coverage", "coverage.logical_name");
  return {
    identity: {
      classifierVersion: literal(
        identity.classifier_version,
        "pf1-strec-runner-v1",
        "classifier_version",
      ),
      policyVersion: literal(
        identity.policy_version,
        "pf1-tectonic-policy-v1",
        "policy_version",
      ),
      evidenceSnapshotVersion: literal(
        identity.evidence_snapshot_version,
        "archived-event-parameters-frozen-gcmt-v1",
        "evidence_snapshot_version",
      ),
      strecVersion: string(identity.strec_version, "strec_version"),
      packageSha256: hash(identity.package_sha256, "package_sha256"),
      configSha256: hash(identity.config_sha256, "config_sha256"),
      runtimeLockSha256: hash(identity.runtime_lock_sha256, "runtime_lock_sha256"),
      referenceBundleVersion: hash(
        identity.reference_bundle_version,
        "reference_bundle_version",
      ),
      referenceManifestSha256: hash(
        identity.reference_manifest_sha256,
        "reference_manifest_sha256",
      ),
      fixtureManifestSha256: hash(
        identity.fixture_manifest_sha256,
        "fixture_manifest_sha256",
      ),
    },
    validation: staticReference(validation, manifestUrl),
    coverage: staticReference(evidenceCoverage, manifestUrl),
    validationScope: literal(
      raw.validation_scope,
      "curated_regression_not_global_validation",
      "validation_scope",
    ),
    publishedPreviewEvents: eventRows,
  };
}
function parsePlateBoundaries(
  value: unknown,
  manifestUrl: URL,
  attribution: { sources: SourceAttribution[]; licences: LicenceAttribution[] },
): PlateBoundaryReference {
  const references = array(value, "references");
  if (references.length !== 1) throw invalid("Expected one plate-boundary reference");
  const raw = object(references[0], "references[0]");
  literal(raw.logical_name, "tectonic_plate_boundaries", "references.logical_name");
  literal(raw.purpose, "cartographic_context_only", "references.purpose");
  const provenance = object(raw.provenance, "references.provenance");
  if (provenance.schema_version !== 1)
    throw invalid("Unsupported boundary provenance schema");
  const sourceId = string(provenance.source_id, "boundary.source_id");
  const licenceId = string(provenance.licence_id, "boundary.licence_id");
  if (
    !attribution.sources.some(
      (source) => source.sourceId === sourceId && source.licenceId === licenceId,
    ) ||
    !attribution.licences.some((licence) => licence.licenceId === licenceId)
  )
    throw invalid("Missing plate-boundary attribution");
  const gitCommit = string(provenance.git_commit, "boundary.git_commit");
  if (!/^[0-9a-f]{40}$/.test(gitCommit))
    throw invalid("Boundary commit must be immutable");
  return {
    ...staticReference(raw, manifestUrl),
    features: positiveInteger(raw.features, "boundary.features"),
    provenance: {
      sourceId,
      licenceId,
      gitCommit,
      sourceUri: string(provenance.source_uri, "boundary.source_uri"),
      sourceRepository: string(
        provenance.source_repository,
        "boundary.source_repository",
      ),
      sourceArtifactPath: string(
        provenance.source_artifact_path,
        "boundary.source_artifact_path",
      ),
      upstreamModel: literal(
        provenance.upstream_model,
        "PB2002",
        "boundary.upstream_model",
      ),
      upstreamCitation: string(
        provenance.upstream_citation,
        "boundary.upstream_citation",
      ),
      upstreamDoi: string(provenance.upstream_doi, "boundary.upstream_doi"),
      acquiredAt: instant(provenance.acquired_at, "boundary.acquired_at"),
      bytes: positiveInteger(provenance.byte_count, "boundary.byte_count"),
      sha256: hash(provenance.sha256, "boundary.sha256"),
    },
  };
}

function schemaOne(value: unknown): 1 {
  if (value !== 1) throw invalid("Unsupported reference schema_version");
  return 1;
}
