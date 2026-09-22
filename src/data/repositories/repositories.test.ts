import { describe, expect, it } from "vitest";

import type { QueryExecutor, QueryParameter, QueryRow } from "../query";
import { createActivityRepository } from "./activityRepository";
import { createEarthquakeRepository } from "./earthquakeRepository";
import { createPlaceRepository } from "./placeRepository";
import { createRevisionRepository } from "./revisionRepository";

const eventRow: QueryRow = {
  event_id: "us-test",
  event_revision_id: "revision-2",
  event_time: new Date("2026-08-31T12:00:00Z"),
  source_updated_at: new Date("2026-08-31T12:03:00Z"),
  magnitude: 6.2,
  magnitude_type: "mww",
  longitude: -120.5,
  latitude: 35.2,
  depth_km: 8.1,
  status: "reviewed",
  event_type: "earthquake",
  review_status: "reviewed",
  place_description: "Test location",
  captured_state_count: 2n,
  source_id: "usgs_earthquakes",
  licence_id: "usgs-public-domain",
};

describe("typed preview repositories", () => {
  it("builds bounded event filters and maps Arrow-like values", async () => {
    const executor = new RecordingExecutor([eventRow]);
    const repository = createEarthquakeRepository(executor);
    const events = await repository.getEvents({
      minimumMagnitude: 5,
      reviewStatus: "reviewed",
      limit: 5,
    });

    expect(executor.parameters).toEqual([5, "reviewed", 5]);
    expect(events[0]).toMatchObject({
      eventId: "us-test",
      eventTime: "2026-08-31T12:00:00.000Z",
      capturedStateCount: 2,
    });
  });

  it("returns null for an unknown event", async () => {
    expect(
      await createEarthquakeRepository(new RecordingExecutor([])).getEvent("missing"),
    ).toBeNull();
  });

  it("keeps event text search and categorical options in the repository layer", async () => {
    const searchExecutor = new RecordingExecutor([eventRow]);
    await createEarthquakeRepository(searchExecutor).getEvents({
      placeQuery: " Pacific ",
      eventType: "earthquake",
    });
    expect(searchExecutor.sql).toContain(
      "contains(lower(place_description), lower(?))",
    );
    expect(searchExecutor.parameters).toEqual(["earthquake", "Pacific", 50_000]);

    const optionExecutor = new RecordingExecutor([
      { filter_kind: "event_type", filter_value: "earthquake" },
      { filter_kind: "status", filter_value: "reviewed" },
      { filter_kind: "review_status", filter_value: "automatic" },
    ]);
    await expect(
      createEarthquakeRepository(optionExecutor).getFilterOptions(),
    ).resolves.toEqual({
      eventTypes: ["earthquake"],
      statuses: ["reviewed"],
      reviewStatuses: ["automatic"],
    });
  });

  it("loads captured states lazily with explicit change fields", async () => {
    const executor = new RecordingExecutor([
      {
        ...eventRow,
        captured_state_number: 2n,
        is_initial_state: false,
        changed_fields: ["magnitude"],
      },
    ]);
    const revisions = await createRevisionRepository(executor).getRevisions("us-test");
    expect(executor.sql).toContain("where event_id = ?");
    expect(executor.sql).toContain("order by captured_state_number");
    expect(executor.parameters).toEqual(["us-test"]);
    expect(revisions[0]).toMatchObject({
      capturedStateNumber: 2,
      changedFields: ["magnitude"],
    });
  });

  it("maps populated UTC activity dates without filling absent days", async () => {
    const executor = new RecordingExecutor([
      {
        activity_date_utc: new Date("2026-01-02T00:00:00Z"),
        event_count: 3n,
        max_magnitude: 4.2,
      },
    ]);
    const activity = await createActivityRepository(executor).getDailyActivity({
      startDateInclusive: "2026-01-01",
      endDateExclusive: "2026-09-01",
    });
    expect(executor.parameters).toEqual(["2026-01-01", "2026-09-01"]);
    expect(activity).toEqual([
      { activityDateUtc: "2026-01-02", eventCount: 3, maxMagnitude: 4.2 },
    ]);
  });

  it("keeps Census population explicitly contextual and bounds place results", async () => {
    const executor = new RecordingExecutor([
      {
        place_id: "123",
        name: "Paris",
        place_type: "incorporated place",
        country_code: "US",
        admin1_code: "48",
        admin1_name: "Texas",
        latitude: 33.66,
        longitude: -95.55,
        population_context: 24530n,
        population_year: 2024,
        population_source_id: "us_census_gazetteer_places",
        source_id: "us_census_gazetteer_places",
        source_vintage: "2024",
      },
    ]);
    const places = await createPlaceRepository(executor).searchPlaces(" Paris ", 1000);
    expect(executor.parameters).toEqual(["Paris", "Paris", 50]);
    expect(places[0]).toMatchObject({ name: "Paris", populationContext: 24530 });
  });
});

class RecordingExecutor implements QueryExecutor {
  sql = "";
  parameters: QueryParameter[] = [];

  constructor(private readonly rows: QueryRow[]) {}

  async query(sql: string, parameters: QueryParameter[] = []): Promise<QueryRow[]> {
    this.sql = sql;
    this.parameters = parameters;
    return this.rows;
  }
}
