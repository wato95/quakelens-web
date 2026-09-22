import { describe, expect, it, vi } from "vitest";

import { PreviewDataError } from "./errors";
import {
  loadPreviewManifest,
  parsePreviewManifest,
  resolveArtifactUrl,
} from "./manifest";
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
    schema.preview_schema_version = "2";
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
