import { describe, expect, it } from "vitest";

import { mapIds, mapTheme, magnitudeRadiusExpression } from "../../theme/mapTheme";
import { earthquakeLayers, placeContextLayers } from "./mapLayers";

describe("earthquake map layers", () => {
  it("uses built-in clustering and a separate selected-event hierarchy", () => {
    expect(earthquakeLayers.map((layer) => layer.id)).toEqual([
      mapIds.clustersLayer,
      mapIds.clusterCountLayer,
      mapIds.eventsLayer,
      mapIds.selectedHaloLayer,
      mapIds.selectedEventLayer,
    ]);
    const selectedLayer = earthquakeLayers.at(-1);
    expect(
      selectedLayer && "source" in selectedLayer ? selectedLayer.source : null,
    ).toBe(mapIds.selectedSource);
  });

  it("sizes ordinary points by magnitude with the design-system thresholds", () => {
    expect(magnitudeRadiusExpression).toEqual([
      "step",
      ["get", "magnitude"],
      2.5,
      3,
      4,
      4,
      6,
      5,
      8,
      6,
      11,
      7,
      14,
    ]);
  });

  it("draws points only with the centralized application map palette", () => {
    const serializedLayers = JSON.stringify([
      ...earthquakeLayers,
      ...placeContextLayers,
    ]);
    for (const color of Object.values(mapTheme)) {
      if (color === mapTheme.background) continue;
      expect(serializedLayers).toContain(color);
    }
    expect(serializedLayers).not.toMatch(/mmi|depth|exposure/i);
  });
});
