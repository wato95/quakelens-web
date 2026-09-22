import type { EventFilters } from "../data/types";
import type { TimeRangeSelection, TimeWindow } from "../app/timeRange";

export interface BrowseFilters {
  timeRange: TimeRangeSelection;
  minimumMagnitude: number | null;
  maximumMagnitude: number | null;
  minimumDepthKm: number | null;
  maximumDepthKm: number | null;
  eventType: string;
  status: string;
  reviewStatus: string;
  placeQuery: string;
}

export interface BrowseState {
  filters: BrowseFilters;
  selectedEventId: string | null;
}

export const DEFAULT_BROWSE_FILTERS: BrowseFilters = {
  timeRange: { kind: "preset", preset: "30d" },
  minimumMagnitude: null,
  maximumMagnitude: null,
  minimumDepthKm: null,
  maximumDepthKm: null,
  eventType: "",
  status: "",
  reviewStatus: "",
  placeQuery: "",
};

export const DEFAULT_BROWSE_STATE: BrowseState = {
  filters: DEFAULT_BROWSE_FILTERS,
  selectedEventId: null,
};

export function toRepositoryFilters(
  filters: BrowseFilters,
  timeWindow: TimeWindow,
): EventFilters {
  return {
    startTimeInclusive: timeWindow.startTimeInclusive,
    endTimeExclusive: timeWindow.endTimeExclusive,
    minimumMagnitude: filters.minimumMagnitude ?? undefined,
    maximumMagnitude: filters.maximumMagnitude ?? undefined,
    minimumDepthKm: filters.minimumDepthKm ?? undefined,
    maximumDepthKm: filters.maximumDepthKm ?? undefined,
    eventType: filters.eventType || undefined,
    status: filters.status || undefined,
    reviewStatus: filters.reviewStatus || undefined,
    placeQuery: filters.placeQuery || undefined,
  };
}

export function describeActiveFilters(filters: BrowseFilters): string[] {
  const descriptions: string[] = [];
  if (filters.placeQuery) descriptions.push(`event text “${filters.placeQuery}”`);
  if (filters.minimumMagnitude !== null)
    descriptions.push(`magnitude at least ${filters.minimumMagnitude}`);
  if (filters.maximumMagnitude !== null)
    descriptions.push(`magnitude at most ${filters.maximumMagnitude}`);
  if (filters.minimumDepthKm !== null)
    descriptions.push(`depth at least ${filters.minimumDepthKm} km`);
  if (filters.maximumDepthKm !== null)
    descriptions.push(`depth at most ${filters.maximumDepthKm} km`);
  if (filters.eventType) descriptions.push(`event type ${filters.eventType}`);
  if (filters.status) descriptions.push(`source status ${filters.status}`);
  if (filters.reviewStatus) descriptions.push(`review status ${filters.reviewStatus}`);
  return descriptions;
}

export function browseFiltersEqual(left: BrowseFilters, right: BrowseFilters): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
