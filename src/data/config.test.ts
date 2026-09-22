import { describe, expect, it } from "vitest";

import { getConfiguredManifestUrl } from "./config";

describe("preview configuration", () => {
  it("resolves a Pages-safe relative configured URL", () => {
    expect(
      getConfiguredManifestUrl(
        "./data/manifest.json",
        "https://example.test/quakelens/index.html",
      ).href,
    ).toBe("https://example.test/quakelens/data/manifest.json");
  });

  it("explains how to recover from missing configuration", () => {
    expect(() => getConfiguredManifestUrl("", "https://example.test/")).toThrow(
      /npm run data:sync/,
    );
  });
});
