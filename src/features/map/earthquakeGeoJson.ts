import type { Feature, FeatureCollection, Point } from "geojson";

import type { EventSummary } from "../../data/types";

export interface EarthquakeFeatureProperties {
  eventId: string;
  eventTime: string;
  magnitude: number;
  magnitudeType: string;
  placeDescription: string;
}

export type EarthquakeFeature = Feature<Point, EarthquakeFeatureProperties>;
export type EarthquakeFeatureCollection = FeatureCollection<
  Point,
  EarthquakeFeatureProperties
>;

export function eventToFeature(event: EventSummary): EarthquakeFeature {
  if (
    !Number.isFinite(event.longitude) ||
    !Number.isFinite(event.latitude) ||
    event.longitude < -180 ||
    event.longitude > 180 ||
    event.latitude < -90 ||
    event.latitude > 90
  ) {
    throw new Error(`Invalid map coordinates for event ${event.eventId}`);
  }

  return {
    type: "Feature",
    id: event.eventId,
    geometry: {
      type: "Point",
      coordinates: [event.longitude, event.latitude],
    },
    properties: {
      eventId: event.eventId,
      eventTime: event.eventTime,
      magnitude: event.magnitude,
      magnitudeType: event.magnitudeType,
      placeDescription: event.placeDescription,
    },
  };
}

export function eventsToFeatureCollection(
  events: readonly EventSummary[],
): EarthquakeFeatureCollection {
  return {
    type: "FeatureCollection",
    features: events.map(eventToFeature),
  };
}

export function selectedEventFeatureCollection(
  event: EventSummary | null,
): EarthquakeFeatureCollection {
  return {
    type: "FeatureCollection",
    features: event ? [eventToFeature(event)] : [],
  };
}
