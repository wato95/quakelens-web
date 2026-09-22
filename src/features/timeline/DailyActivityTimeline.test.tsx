import { fireEvent, render, screen } from "@testing-library/react";
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

function renderTimeline(onTimeRangeChange = vi.fn()) {
  render(
    <DailyActivityTimeline
      activity={activity}
      coverage={coverage}
      timeRangeSelection={{ kind: "preset", preset: "30d" }}
      timeWindow={deriveTimeWindow(coverage, "30d")}
      onTimeRangeChange={onTimeRangeChange}
    />,
  );
  const chart = screen.getByLabelText("Pointer-selectable UTC activity timeline");
  vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1_000,
    bottom: 52,
    width: 1_000,
    height: 52,
    toJSON: () => ({}),
  });
  return { chart, onTimeRangeChange };
}

describe("DailyActivityTimeline", () => {
  it("labels the chart, current UTC range and active preset", () => {
    renderTimeline();

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
    expect(screen.getByLabelText("Start date (UTC)")).toHaveAttribute(
      "min",
      "2026-01-01",
    );
    expect(screen.getByLabelText("End date (UTC, inclusive)")).toHaveAttribute(
      "max",
      "2026-08-31",
    );
  });

  it("provides keyboard-operable preset and explicit range controls", async () => {
    const user = userEvent.setup();
    const { onTimeRangeChange } = renderTimeline();

    const sevenDays = screen.getByRole("button", { name: "7 days" });
    sevenDays.focus();
    await user.keyboard("{Enter}");
    expect(onTimeRangeChange).toHaveBeenCalledWith({
      kind: "preset",
      preset: "7d",
    });

    fireEvent.change(screen.getByLabelText("Start date (UTC)"), {
      target: { value: "2026-08-12" },
    });
    fireEvent.change(screen.getByLabelText("End date (UTC, inclusive)"), {
      target: { value: "2026-08-16" },
    });
    screen.getByRole("button", { name: "Apply UTC range" }).focus();
    await user.keyboard("{Enter}");
    expect(onTimeRangeChange).toHaveBeenLastCalledWith({
      kind: "custom",
      startDateInclusive: "2026-08-12",
      endDateInclusive: "2026-08-16",
    });
  });

  it("associates textual errors with invalid explicit dates", async () => {
    const user = userEvent.setup();
    renderTimeline();
    const start = screen.getByLabelText("Start date (UTC)");
    const end = screen.getByLabelText("End date (UTC, inclusive)");
    fireEvent.change(start, { target: { value: "2026-08-20" } });
    fireEvent.change(end, { target: { value: "2026-08-12" } });

    await user.click(screen.getByRole("button", { name: "Apply UTC range" }));

    expect(end).toHaveAttribute("aria-invalid", "true");
    expect(end).toHaveAccessibleDescription(
      "End date must be on or after the start date.",
    );
  });

  it("normalizes forward and reverse pointer drags", () => {
    const forward = renderTimeline();
    fireEvent.pointerDown(forward.chart, {
      pointerId: 1,
      button: 0,
      clientX: 100,
    });
    fireEvent.pointerMove(forward.chart, { pointerId: 1, clientX: 300 });
    fireEvent.pointerUp(forward.chart, { pointerId: 1, clientX: 300 });
    expect(forward.onTimeRangeChange).toHaveBeenLastCalledWith({
      kind: "custom",
      startDateInclusive: "2026-01-25",
      endDateInclusive: "2026-03-14",
    });

    forward.onTimeRangeChange.mockClear();
    fireEvent.pointerDown(forward.chart, {
      pointerId: 2,
      button: 0,
      clientX: 300,
    });
    fireEvent.pointerMove(forward.chart, { pointerId: 2, clientX: 100 });
    fireEvent.pointerUp(forward.chart, { pointerId: 2, clientX: 100 });
    expect(forward.onTimeRangeChange).toHaveBeenLastCalledWith({
      kind: "custom",
      startDateInclusive: "2026-01-25",
      endDateInclusive: "2026-03-14",
    });
  });

  it("treats below-threshold movement as a click and cancels partial gestures", () => {
    const { chart, onTimeRangeChange } = renderTimeline();
    fireEvent.pointerDown(chart, { pointerId: 1, button: 0, clientX: 100 });
    fireEvent.pointerMove(chart, { pointerId: 1, clientX: 103 });
    fireEvent.pointerUp(chart, { pointerId: 1, clientX: 103 });
    expect(onTimeRangeChange).toHaveBeenLastCalledWith({
      kind: "custom",
      startDateInclusive: "2026-01-25",
      endDateInclusive: "2026-01-25",
    });

    onTimeRangeChange.mockClear();
    fireEvent.pointerDown(chart, { pointerId: 2, button: 0, clientX: 200 });
    fireEvent.pointerMove(chart, { pointerId: 2, clientX: 400 });
    fireEvent.pointerCancel(chart, { pointerId: 2 });
    expect(onTimeRangeChange).not.toHaveBeenCalled();
  });
});
