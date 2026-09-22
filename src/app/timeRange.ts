import type { CoverageWindow, EventFilters } from "../data/types";

export const TIME_RANGE_PRESETS = ["7d", "30d", "90d", "full"] as const;

export type TimeRangePreset = (typeof TIME_RANGE_PRESETS)[number];

export type TimeRangeSelection =
  | { kind: "preset"; preset: TimeRangePreset }
  | {
      kind: "custom";
      startDateInclusive: string;
      endDateInclusive: string;
    };

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
const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function resolveTimeRangeSelection(
  coverage: CoverageWindow,
  selection: TimeRangeSelection,
): { selection: TimeRangeSelection; timeWindow: TimeWindow } {
  if (selection.kind === "preset") {
    return {
      selection,
      timeWindow: deriveTimeWindow(coverage, selection.preset),
    };
  }

  const bounds = getCoverageDateBounds(coverage);
  const firstDate = clampUtcDate(requireUtcDate(selection.startDateInclusive), bounds);
  const secondDate = clampUtcDate(requireUtcDate(selection.endDateInclusive), bounds);
  const startDateInclusive = firstDate < secondDate ? firstDate : secondDate;
  const endDateInclusive = firstDate < secondDate ? secondDate : firstDate;
  const start = Math.max(
    Date.parse(coverage.eventTimeStartInclusive),
    parseUtcDate(startDateInclusive),
  );
  const end = Math.min(
    Date.parse(coverage.eventTimeEndExclusive),
    parseUtcDate(endDateInclusive) + MILLISECONDS_PER_DAY,
  );

  return {
    selection: { kind: "custom", startDateInclusive, endDateInclusive },
    timeWindow: {
      startTimeInclusive: new Date(start).toISOString(),
      endTimeExclusive: new Date(end).toISOString(),
    },
  };
}

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

export function getTimeWindowUtcDates(window: TimeWindow): {
  startDateInclusive: string;
  endDateInclusive: string;
} {
  return {
    startDateInclusive: utcDate(window.startTimeInclusive),
    endDateInclusive: utcDate(
      new Date(Date.parse(window.endTimeExclusive) - 1).toISOString(),
    ),
  };
}

export function getCoverageDateBounds(coverage: CoverageWindow): {
  minimum: string;
  maximum: string;
} {
  return {
    minimum: utcDate(coverage.eventTimeStartInclusive),
    maximum: utcDate(
      new Date(Date.parse(coverage.eventTimeEndExclusive) - 1).toISOString(),
    ),
  };
}

export function isUtcDate(value: string): boolean {
  if (!UTC_DATE_PATTERN.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
  );
}

function requireUtcDate(value: string): string {
  if (!isUtcDate(value)) {
    throw new RangeError(`Invalid UTC calendar date: ${value}`);
  }
  return value;
}

function parseUtcDate(value: string): number {
  return Date.parse(`${value}T00:00:00Z`);
}

function clampUtcDate(
  value: string,
  bounds: ReturnType<typeof getCoverageDateBounds>,
): string {
  if (value < bounds.minimum) return bounds.minimum;
  if (value > bounds.maximum) return bounds.maximum;
  return value;
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
