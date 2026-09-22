import { describe, expect, it } from "vitest";

import {
  DEFAULT_BROWSE_FILTERS,
  describeActiveFilters,
  toRepositoryFilters,
} from "./browseState";

describe("browse state", () => {
  it("maps only active constraints to repository filters", () => {
    expect(
      toRepositoryFilters(
        {
          ...DEFAULT_BROWSE_FILTERS,
          minimumMagnitude: 4,
          maximumDepthKm: 30,
          eventType: "earthquake",
          placeQuery: "Alaska",
        },
        {
          startTimeInclusive: "2026-01-01T00:00:00.000Z",
          endTimeExclusive: "2026-02-01T00:00:00.000Z",
        },
      ),
    ).toEqual({
      startTimeInclusive: "2026-01-01T00:00:00.000Z",
      endTimeExclusive: "2026-02-01T00:00:00.000Z",
      minimumMagnitude: 4,
      maximumMagnitude: undefined,
      minimumDepthKm: undefined,
      maximumDepthKm: 30,
      eventType: "earthquake",
      status: undefined,
      reviewStatus: undefined,
      placeQuery: "Alaska",
    });
  });

  it("describes active constraints for an informative empty state", () => {
    expect(
      describeActiveFilters({
        ...DEFAULT_BROWSE_FILTERS,
        placeQuery: "Fiji",
        minimumMagnitude: 6,
      }),
    ).toEqual(["event text “Fiji”", "magnitude at least 6"]);
  });
});
