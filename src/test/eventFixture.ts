import type { EventSummary } from "../data/types";

export function makeEvent(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    eventId: "us-test",
    eventRevisionId: "revision-1",
    eventTime: "2026-08-31T12:00:00.000Z",
    sourceUpdatedAt: "2026-08-31T12:03:00.000Z",
    magnitude: 6.2,
    magnitudeType: "mww",
    longitude: -120.5,
    latitude: 35.2,
    depthKm: 8.1,
    status: "reviewed",
    eventType: "earthquake",
    reviewStatus: "reviewed",
    placeDescription: "Test location",
    capturedStateCount: 2,
    sourceId: "usgs_earthquakes",
    licenceId: "usgs-public-domain",
    ...overrides,
  };
}
