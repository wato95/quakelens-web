import { describe, expect, it } from "vitest";

import {
  DEFAULT_BROWSE_FILTERS,
  DEFAULT_EVENT_SORT,
  applyMagnitudeQuickFilter,
  describeActiveFilters,
  getActiveMagnitudeQuickFilter,
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
      sortField: "eventTime",
      sortDirection: "desc",
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

  it("applies truthful shared magnitude quick filters", () => {
    const customRange = {
      ...DEFAULT_BROWSE_FILTERS,
      minimumMagnitude: 5,
      maximumMagnitude: 6,
    };
    expect(getActiveMagnitudeQuickFilter(customRange)).toBeNull();

    const m6 = applyMagnitudeQuickFilter(customRange, "m6");
    expect(m6).toMatchObject({ minimumMagnitude: 6, maximumMagnitude: null });
    expect(getActiveMagnitudeQuickFilter(m6)).toBe("m6");

    const all = applyMagnitudeQuickFilter(m6, "all");
    expect(all).toMatchObject({ minimumMagnitude: null, maximumMagnitude: null });
    expect(getActiveMagnitudeQuickFilter(all)).toBe("all");
  });

  it("passes an explicit repository sort", () => {
    expect(
      toRepositoryFilters(
        DEFAULT_BROWSE_FILTERS,
        {
          startTimeInclusive: "2026-01-01T00:00:00.000Z",
          endTimeExclusive: "2026-02-01T00:00:00.000Z",
        },
        { field: "magnitude", direction: "asc" },
      ),
    ).toMatchObject({ sortField: "magnitude", sortDirection: "asc" });
    expect(DEFAULT_EVENT_SORT).toEqual({ field: "eventTime", direction: "desc" });
  });
});
