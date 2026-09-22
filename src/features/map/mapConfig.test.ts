import { describe, expect, it } from "vitest";

import { DEFAULT_MAP_STYLE_URL, getMapStyleUrl } from "./mapConfig";

describe("map configuration", () => {
  it("uses the documented dark basemap by default", () => {
    expect(getMapStyleUrl(undefined)).toBe(DEFAULT_MAP_STYLE_URL);
  });

  it("accepts a deployment-specific style URL", () => {
    expect(getMapStyleUrl(" /map/style.json ")).toBe("/map/style.json");
  });
});
