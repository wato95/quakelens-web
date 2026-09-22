import { isUtcDate, TIME_RANGE_PRESETS, type TimeRangePreset } from "../app/timeRange";
import { DEFAULT_BROWSE_FILTERS, type BrowseState } from "./browseState";

const NUMBER_KEYS = ["minMag", "maxMag", "minDepth", "maxDepth"] as const;

export function parseUrlState(search: string): BrowseState {
  const parameters = new URLSearchParams(search);
  const range = parameters.get("range");
  const from = parameters.get("from");
  const to = parameters.get("to");
  const timeRange =
    from && to && isUtcDate(from) && isUtcDate(to)
      ? { kind: "custom" as const, startDateInclusive: from, endDateInclusive: to }
      : isTimeRangePreset(range)
        ? { kind: "preset" as const, preset: range }
        : DEFAULT_BROWSE_FILTERS.timeRange;

  return {
    selectedEventId: cleanText(parameters.get("event")) || null,
    filters: {
      timeRange,
      minimumMagnitude: parseFiniteNumber(parameters.get(NUMBER_KEYS[0])),
      maximumMagnitude: parseFiniteNumber(parameters.get(NUMBER_KEYS[1])),
      minimumDepthKm: parseFiniteNumber(parameters.get(NUMBER_KEYS[2])),
      maximumDepthKm: parseFiniteNumber(parameters.get(NUMBER_KEYS[3])),
      eventType: cleanText(parameters.get("type")),
      status: cleanText(parameters.get("status")),
      reviewStatus: cleanText(parameters.get("review")),
      placeQuery: cleanText(parameters.get("q")),
    },
  };
}

export function serializeUrlState(state: BrowseState): string {
  const parameters = new URLSearchParams();
  const { filters } = state;
  if (state.selectedEventId) parameters.set("event", state.selectedEventId);
  if (filters.timeRange.kind === "custom") {
    parameters.set("from", filters.timeRange.startDateInclusive);
    parameters.set("to", filters.timeRange.endDateInclusive);
  } else if (filters.timeRange.preset !== "30d") {
    parameters.set("range", filters.timeRange.preset);
  }
  setNumber(parameters, "minMag", filters.minimumMagnitude);
  setNumber(parameters, "maxMag", filters.maximumMagnitude);
  setNumber(parameters, "minDepth", filters.minimumDepthKm);
  setNumber(parameters, "maxDepth", filters.maximumDepthKm);
  setText(parameters, "type", filters.eventType);
  setText(parameters, "status", filters.status);
  setText(parameters, "review", filters.reviewStatus);
  setText(parameters, "q", filters.placeQuery);
  const value = parameters.toString();
  return value ? `?${value}` : "";
}

function parseFiniteNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: string | null): string {
  return value?.trim().slice(0, 200) ?? "";
}

function isTimeRangePreset(value: string | null): value is TimeRangePreset {
  return TIME_RANGE_PRESETS.some((preset) => preset === value);
}

function setNumber(parameters: URLSearchParams, key: string, value: number | null) {
  if (value !== null && Number.isFinite(value)) parameters.set(key, String(value));
}

function setText(parameters: URLSearchParams, key: string, value: string) {
  if (value) parameters.set(key, value);
}
