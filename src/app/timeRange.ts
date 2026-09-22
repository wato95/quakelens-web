import type { CoverageWindow, EventFilters } from "../data/types";

export const TIME_RANGE_PRESETS = ["7d", "30d", "90d", "full"] as const;

export type TimeRangePreset = (typeof TIME_RANGE_PRESETS)[number];

export interface TimeWindow {
  startTimeInclusive: string;
  endTimeExclusive: string;
}

const DAYS_BY_PRESET: Record<Exclude<TimeRangePreset, "full">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export function deriveTimeWindow(
  coverage: CoverageWindow,
  preset: TimeRangePreset,
): TimeWindow {
  if (preset === "full") {
    return {
      startTimeInclusive: coverage.eventTimeStartInclusive,
      endTimeExclusive: coverage.eventTimeEndExclusive,
    };
  }

  const coverageStart = Date.parse(coverage.eventTimeStartInclusive);
  const coverageEnd = Date.parse(coverage.eventTimeEndExclusive);
  const requestedStart = coverageEnd - DAYS_BY_PRESET[preset] * MILLISECONDS_PER_DAY;

  return {
    startTimeInclusive: new Date(Math.max(coverageStart, requestedStart)).toISOString(),
    endTimeExclusive: coverage.eventTimeEndExclusive,
  };
}

export function toEventFilters(window: TimeWindow): EventFilters {
  return {
    startTimeInclusive: window.startTimeInclusive,
    endTimeExclusive: window.endTimeExclusive,
  };
}

export function toActivityRange(window: TimeWindow): {
  startDateInclusive: string;
  endDateExclusive: string;
} {
  return {
    startDateInclusive: utcDate(window.startTimeInclusive),
    endDateExclusive: utcDate(window.endTimeExclusive),
  };
}

export function timeWindowContains(window: TimeWindow, instant: string): boolean {
  const value = Date.parse(instant);
  return (
    value >= Date.parse(window.startTimeInclusive) &&
    value < Date.parse(window.endTimeExclusive)
  );
}

export function formatTimeWindowUtc(window: TimeWindow): string {
  const start = formatUtcDate(window.startTimeInclusive);
  const inclusiveEnd = new Date(Date.parse(window.endTimeExclusive) - 1);
  return `${start} – ${formatUtcDate(inclusiveEnd.toISOString())} UTC`;
}

function utcDate(instant: string): string {
  return new Date(instant).toISOString().slice(0, 10);
}

function formatUtcDate(instant: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(instant));
}
