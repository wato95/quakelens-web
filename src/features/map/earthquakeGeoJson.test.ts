import { describe, expect, it } from "vitest";

import { makeEvent } from "../../test/eventFixture";
import {
  eventsToFeatureCollection,
  selectedEventFeatureCollection,
} from "./earthquakeGeoJson";

describe("earthquake GeoJSON", () => {
  it("maps typed event summaries without adding scientific interpretations", () => {
    const collection = eventsToFeatureCollection([makeEvent()]);

    expect(collection.features[0]).toEqual({
      type: "Feature",
      id: "us-test",
      geometry: { type: "Point", coordinates: [-120.5, 35.2] },
      properties: {
        eventId: "us-test",
        eventTime: "2026-08-31T12:00:00.000Z",
        magnitude: 6.2,
        magnitudeType: "mww",
        placeDescription: "Test location",
      },
    });
    expect(collection.features[0]?.properties).not.toHaveProperty("mmi");
    expect(collection.features[0]?.properties).not.toHaveProperty("exposure");
  });

  it("rejects invalid published geometry instead of silently hiding it", () => {
    expect(() =>
      eventsToFeatureCollection([makeEvent({ eventId: "bad", latitude: 91 })]),
    ).toThrow("Invalid map coordinates for event bad");
  });

  it("keeps the selected event in a separate unclustered collection", () => {
    expect(selectedEventFeatureCollection(makeEvent()).features).toHaveLength(1);
    expect(selectedEventFeatureCollection(null).features).toEqual([]);
  });
});
