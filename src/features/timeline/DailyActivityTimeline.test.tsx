import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { deriveTimeWindow } from "../../app/timeRange";
import type { CoverageWindow, DailyActivity } from "../../data/types";
import { DailyActivityTimeline } from "./DailyActivityTimeline";

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

const activity: DailyActivity[] = [
  { activityDateUtc: "2026-08-01", eventCount: 4, maxMagnitude: 4.1 },
  { activityDateUtc: "2026-08-31", eventCount: 9, maxMagnitude: 5.3 },
];

describe("DailyActivityTimeline", () => {
  it("labels the chart, current UTC range and active preset", () => {
    render(
      <DailyActivityTimeline
        activity={activity}
        coverage={coverage}
        timeRangePreset="30d"
        timeWindow={deriveTimeWindow(coverage, "30d")}
        onTimeRangeChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole("figure", {
        name: "Daily earthquake activity across published preview coverage",
      }),
    ).toHaveAccessibleDescription(/highest recorded daily count is 9/i);
    expect(screen.getByText("02 Aug 2026 – 31 Aug 2026 UTC")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("provides keyboard-operable range controls", async () => {
    const user = userEvent.setup();
    const onTimeRangeChange = vi.fn();
    render(
      <DailyActivityTimeline
        activity={activity}
        coverage={coverage}
        timeRangePreset="30d"
        timeWindow={deriveTimeWindow(coverage, "30d")}
        onTimeRangeChange={onTimeRangeChange}
      />,
    );

    const sevenDays = screen.getByRole("button", { name: "7 days" });
    sevenDays.focus();
    await user.keyboard("{Enter}");

    expect(onTimeRangeChange).toHaveBeenCalledWith("7d");
  });
});
