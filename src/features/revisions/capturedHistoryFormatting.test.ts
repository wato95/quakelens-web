import { describe, expect, it } from "vitest";

import { makeCapturedState } from "../../test/capturedStateFixture";
import { buildCapturedHistory } from "./capturedHistoryFormatting";

describe("captured history formatting", () => {
  it("orders states and describes supported published field changes", () => {
    const initial = makeCapturedState({
      magnitude: 5.8,
      magnitudeType: "mb",
      depthKm: 12,
      latitude: 35.1,
      longitude: -120.4,
      status: "automatic",
      reviewStatus: "automatic",
      placeDescription: "10 km E of Testville",
    });
    const changed = makeCapturedState({
      capturedStateNumber: 2,
      isInitialState: false,
      eventRevisionId: "revision-2",
      sourceUpdatedAt: "2026-08-31T12:04:00.000Z",
      magnitude: 5.9,
      magnitudeType: "mww",
      depthKm: 10.4,
      latitude: 35.2,
      longitude: -120.5,
      status: "reviewed",
      reviewStatus: "reviewed",
      placeDescription: "12 km E of Testville",
      changedFields: [
        "magnitude",
        "magnitude_type",
        "depth_km",
        "longitude",
        "latitude",
        "status",
        "review_status",
        "place_description",
      ],
    });

    const entries = buildCapturedHistory([changed, initial]);

    expect(entries.map((entry) => entry.title)).toEqual([
      "Initial captured state",
      "Captured state 2",
    ]);
    expect(entries[1]?.descriptions).toEqual([
      "Magnitude changed 5.8 → 5.9",
      "Magnitude type changed mb → mww",
      "Depth changed 12.0 km → 10.4 km",
      "Location changed 35.1000° N, 120.4000° W → 35.2000° N, 120.5000° W",
      "Source status changed automatic → reviewed",
      "Review status changed automatic → reviewed",
      "Place changed 10 km E of Testville → 12 km E of Testville",
    ]);
  });

  it("labels a source-update-only state without inventing a parameter change", () => {
    const entries = buildCapturedHistory([
      makeCapturedState(),
      makeCapturedState({
        capturedStateNumber: 2,
        isInitialState: false,
        eventRevisionId: "revision-2",
        sourceUpdatedAt: "2026-08-31T12:05:00.000Z",
        changedFields: ["source_updated_at"],
      }),
    ]);

    expect(entries[1]?.descriptions).toEqual(["Source update observed"]);
    expect(entries[1]?.descriptions.join(" ")).not.toMatch(/magnitude|depth|location/i);
  });

  it("does not describe a declared field when its displayed value did not change", () => {
    const entries = buildCapturedHistory([
      makeCapturedState(),
      makeCapturedState({
        capturedStateNumber: 2,
        isInitialState: false,
        eventRevisionId: "revision-2",
        changedFields: ["magnitude"],
      }),
    ]);

    expect(entries[1]?.descriptions).toEqual(["Source update observed"]);
  });
});
