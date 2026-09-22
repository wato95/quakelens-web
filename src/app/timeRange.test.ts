import { describe, expect, it } from "vitest";

import type { CoverageWindow } from "../data/types";
import {
  deriveTimeWindow,
  formatTimeWindowUtc,
  getCoverageDateBounds,
  isUtcDate,
  resolveTimeRangeSelection,
  timeWindowContains,
  toActivityRange,
} from "./timeRange";

const coverage: CoverageWindow = {
  eventTimeStartInclusive: "2026-01-01T00:00:00Z",
  eventTimeEndExclusive: "2026-09-01T00:00:00Z",
  observedMinEventTime: "2026-01-01T00:03:02Z",
  observedMaxEventTime: "2026-08-31T23:16:53Z",
  annualPartition: 2026,
  acquisitionStatus: "complete",
  catalogueComplete: true,
  detailComplete: true,
};

describe("UTC time windows", () => {
  it("derives the default 30 days from the exclusive coverage end", () => {
    expect(deriveTimeWindow(coverage, "30d")).toEqual({
      startTimeInclusive: "2026-08-02T00:00:00.000Z",
      endTimeExclusive: "2026-09-01T00:00:00Z",
    });
  });

  it("clamps presets to the published coverage start", () => {
    const shortCoverage = {
      ...coverage,
      eventTimeStartInclusive: "2026-08-20T00:00:00Z",
    };

    expect(deriveTimeWindow(shortCoverage, "90d").startTimeInclusive).toBe(
      "2026-08-20T00:00:00.000Z",
    );
  });

  it("uses UTC arithmetic across a daylight-saving boundary", () => {
    const dstCoverage = {
      ...coverage,
      eventTimeStartInclusive: "2026-01-01T00:00:00Z",
      eventTimeEndExclusive: "2026-04-01T00:00:00Z",
    };

    expect(deriveTimeWindow(dstCoverage, "30d").startTimeInclusive).toBe(
      "2026-03-02T00:00:00.000Z",
    );
  });

  it("preserves exclusive boundaries for activity and selection", () => {
    const window = deriveTimeWindow(coverage, "7d");

    expect(toActivityRange(window)).toEqual({
      startDateInclusive: "2026-08-25",
      endDateExclusive: "2026-09-01",
    });
    expect(timeWindowContains(window, "2026-08-25T00:00:00Z")).toBe(true);
    expect(timeWindowContains(window, "2026-09-01T00:00:00Z")).toBe(false);
    expect(formatTimeWindowUtc(window)).toBe("25 Aug 2026 – 31 Aug 2026 UTC");
  });

  it("creates a single UTC day with an exclusive next-day boundary", () => {
    expect(
      resolveTimeRangeSelection(coverage, {
        kind: "custom",
        startDateInclusive: "2026-08-12",
        endDateInclusive: "2026-08-12",
      }),
    ).toEqual({
      selection: {
        kind: "custom",
        startDateInclusive: "2026-08-12",
        endDateInclusive: "2026-08-12",
      },
      timeWindow: {
        startTimeInclusive: "2026-08-12T00:00:00.000Z",
        endTimeExclusive: "2026-08-13T00:00:00.000Z",
      },
    });
  });

  it("normalizes reverse ranges and clamps them to published coverage", () => {
    expect(
      resolveTimeRangeSelection(coverage, {
        kind: "custom",
        startDateInclusive: "2027-01-01",
        endDateInclusive: "2025-12-01",
      }),
    ).toEqual({
      selection: {
        kind: "custom",
        startDateInclusive: "2026-01-01",
        endDateInclusive: "2026-08-31",
      },
      timeWindow: {
        startTimeInclusive: "2026-01-01T00:00:00.000Z",
        endTimeExclusive: "2026-09-01T00:00:00.000Z",
      },
    });
  });

  it("exposes strict UTC date validation and inclusive coverage bounds", () => {
    expect(getCoverageDateBounds(coverage)).toEqual({
      minimum: "2026-01-01",
      maximum: "2026-08-31",
    });
    expect(isUtcDate("2026-02-28")).toBe(true);
    expect(isUtcDate("2026-02-29")).toBe(false);
    expect(isUtcDate("08/12/2026")).toBe(false);
  });
});
