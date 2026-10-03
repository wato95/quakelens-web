import { describe, expect, it, vi } from "vitest";

import { PreviewDataError } from "./errors";
import {
  loadPreviewManifest,
  parsePreviewManifest,
  resolveArtifactUrl,
} from "./manifest";
import { makeTectonicManifestJson } from "../test/tectonicFixture";
import { makePreviewManifest } from "../test/previewManifestFixture";

const manifestUrl = new URL(
  "https://example.test/quakelens/builds/20260921T204938Z-a14edef9b000/manifest.json",
);

describe("preview manifest", () => {
  it("parses coverage and resolves every artifact relative to its immutable manifest", () => {
    const manifest = parsePreviewManifest(makePreviewManifest(), manifestUrl);

    expect(manifest.previewBuildId).toBe("20260921T204938Z-a14edef9b000");
    expect(manifest.includedCoverage.eventTimeEndExclusive).toBe(
      "2026-09-01T00:00:00Z",
    );
    expect(manifest.capabilities.exposure).toBe("not_in_preview");
    expect(manifest.artifacts.events.url.href).toBe(
      "https://example.test/quakelens/builds/20260921T204938Z-a14edef9b000/events/year=2026/events.parquet",
    );
  });

  it.each([
    "../events.parquet",
    "/events.parquet",
    "https://other.test/events.parquet",
    "a\\b.parquet",
  ])("rejects a non-contained artifact path: %s", (relativePath) => {
    expect(() => resolveArtifactUrl(manifestUrl, relativePath)).toThrow(
      /contained|escapes/,
    );
  });

  it("reports unsupported product and schema versions distinctly", () => {
    const product = makePreviewManifest();
    product.product_kind = "pf1-release";
    expectPreviewError(
      () => parsePreviewManifest(product, manifestUrl),
      "unsupported_schema",
    );

    const schema = makePreviewManifest();
    schema.preview_schema_version = "3";
    expectPreviewError(
      () => parsePreviewManifest(schema, manifestUrl),
      "unsupported_schema",
    );
  });

  it("reports HTTP failures with the manifest URL", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404, statusText: "Missing" }));
    await expect(loadPreviewManifest(manifestUrl, fetcher)).rejects.toMatchObject({
      code: "manifest_load",
      message: expect.stringContaining(manifestUrl.href),
    });
  });
});

function expectPreviewError(callback: () => unknown, code: string): void {
  try {
    callback();
    throw new Error("Expected callback to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(PreviewDataError);
    expect((error as PreviewDataError).code).toBe(code);
  }
}

describe("PF1-307 manifest", () => {
  it("discovers tectonics, validation and cartographic references separately", () => {
    const manifest = parsePreviewManifest(makeTectonicManifestJson(), manifestUrl);
    expect(manifest.previewSchemaVersion).toBe("2");
    expect(manifest.capabilities.tectonics).toBe("available");
    expect(manifest.artifacts.event_tectonics?.url.href).toBe(
      new URL("tectonics/event_tectonics.parquet", manifestUrl).href,
    );
    expect(manifest.plateBoundaries?.url.href).toBe(
      new URL("references/tectonic_plate_boundaries.geojson", manifestUrl).href,
    );
    expect(manifest.tectonics?.validationScope).toBe(
      "curated_regression_not_global_validation",
    );
    expect(manifest.plateBoundaries?.provenance.upstreamModel).toBe("PB2002");
  });
  it("requires complete exact-event coverage", () => {
    const raw = makeTectonicManifestJson();
    raw.tectonics.preview_event_coverage.missing_or_invalid_preview_events = 1;
    expect(() => parsePreviewManifest(raw, manifestUrl)).toThrow(/coverage/);
  });
  it("rejects missing tectonics, duplicate artifacts and unsupported physical schema", () => {
    const raw = makeTectonicManifestJson();
    raw.artifacts.pop();
    expect(() => parsePreviewManifest(raw, manifestUrl)).toThrow();
    const duplicate = makeTectonicManifestJson();
    duplicate.artifacts[4] = duplicate.artifacts[0];
    expect(() => parsePreviewManifest(duplicate, manifestUrl)).toThrow();
    const schema = makeTectonicManifestJson();
    schema.artifacts[4].columns[0].physical_type = "INTEGER";
    expect(() => parsePreviewManifest(schema, manifestUrl)).toThrow(/physical/);
  });
  it("rejects escaping references and missing PB2002 licence attribution", () => {
    const raw = makeTectonicManifestJson();
    raw.references[0].relative_path = "../boundary.geojson";
    expect(() => parsePreviewManifest(raw, manifestUrl)).toThrow(/contained/);
    const licence = makeTectonicManifestJson();
    licence.sources_and_attribution.licences = [];
    expect(() => parsePreviewManifest(licence, manifestUrl)).toThrow(/attribution/);
  });
});
