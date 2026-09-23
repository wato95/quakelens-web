import type { QueryExecutor, QueryParameter, QueryRow } from "../query";
import { requiredNumber, requiredString, requiredUtcInstant } from "../query";
import type {
  EarthquakeRepository,
  EventFilterOptions,
  EventFilters,
  EventSortField,
  EventSummary,
  SortDirection,
} from "../types";

const EVENT_COLUMNS = `
  event_id, event_revision_id, event_time, source_updated_at, magnitude,
  magnitude_type, longitude, latitude, depth_km, status, event_type,
  review_status, place_description, captured_state_count, source_id, licence_id
`;

const SORT_COLUMNS: Record<EventSortField, string> = {
  eventTime: "event_time",
  magnitude: "magnitude",
  depthKm: "depth_km",
  place: "place_description",
  eventType: "event_type",
  status: "status",
};

export function createEarthquakeRepository(
  executor: QueryExecutor,
): EarthquakeRepository {
  return {
    async getEvents(filters: EventFilters = {}): Promise<EventSummary[]> {
      const clauses: string[] = [];
      const parameters: QueryParameter[] = [];
      addFilter(clauses, parameters, "event_time >= ?", filters.startTimeInclusive);
      addFilter(clauses, parameters, "event_time < ?", filters.endTimeExclusive);
      addFilter(clauses, parameters, "magnitude >= ?", filters.minimumMagnitude);
      addFilter(clauses, parameters, "magnitude <= ?", filters.maximumMagnitude);
      addFilter(clauses, parameters, "depth_km >= ?", filters.minimumDepthKm);
      addFilter(clauses, parameters, "depth_km <= ?", filters.maximumDepthKm);
      addFilter(clauses, parameters, "event_type = ?", filters.eventType);
      addFilter(clauses, parameters, "status = ?", filters.status);
      addFilter(clauses, parameters, "review_status = ?", filters.reviewStatus);
      if (filters.placeQuery?.trim()) {
        clauses.push("contains(lower(place_description), lower(?))");
        parameters.push(filters.placeQuery.trim());
      }
      const limit = normalizeLimit(filters.limit, 50_000);
      parameters.push(limit);
      const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
      const sortColumn = SORT_COLUMNS[normalizeSortField(filters.sortField)];
      const sortDirection = normalizeSortDirection(filters.sortDirection);
      const rows = await executor.query(
        `select ${EVENT_COLUMNS} from preview_events ${where} order by ${sortColumn} ${sortDirection}, event_id asc limit ?`,
        parameters,
      );
      return rows.map(mapEvent);
    },

    async getEvent(eventId: string): Promise<EventSummary | null> {
      if (!eventId.trim()) return null;
      const rows = await executor.query(
        `select ${EVENT_COLUMNS} from preview_events where event_id = ? limit 1`,
        [eventId],
      );
      return rows[0] ? mapEvent(rows[0]) : null;
    },

    async getFilterOptions(): Promise<EventFilterOptions> {
      const rows = await executor.query(
        `select 'event_type' as filter_kind, event_type as filter_value from preview_events group by event_type
         union all
         select 'status' as filter_kind, status as filter_value from preview_events group by status
         union all
         select 'review_status' as filter_kind, review_status as filter_value from preview_events group by review_status
         order by filter_kind, filter_value`,
      );
      const options: EventFilterOptions = {
        eventTypes: [],
        statuses: [],
        reviewStatuses: [],
      };
      for (const row of rows) {
        const kind = requiredString(row, "filter_kind");
        const value = requiredString(row, "filter_value");
        if (kind === "event_type") options.eventTypes.push(value);
        if (kind === "status") options.statuses.push(value);
        if (kind === "review_status") options.reviewStatuses.push(value);
      }
      return options;
    },
  };
}

function normalizeSortField(field: EventSortField | undefined): EventSortField {
  return field && field in SORT_COLUMNS ? field : "eventTime";
}

function normalizeSortDirection(direction: SortDirection | undefined): "asc" | "desc" {
  return direction === "asc" ? "asc" : "desc";
}

export function mapEvent(row: QueryRow): EventSummary {
  return {
    eventId: requiredString(row, "event_id"),
    eventRevisionId: requiredString(row, "event_revision_id"),
    eventTime: requiredUtcInstant(row, "event_time"),
    sourceUpdatedAt: requiredUtcInstant(row, "source_updated_at"),
    magnitude: requiredNumber(row, "magnitude"),
    magnitudeType: requiredString(row, "magnitude_type"),
    longitude: requiredNumber(row, "longitude"),
    latitude: requiredNumber(row, "latitude"),
    depthKm: requiredNumber(row, "depth_km"),
    status: requiredString(row, "status"),
    eventType: requiredString(row, "event_type"),
    reviewStatus: requiredString(row, "review_status"),
    placeDescription: requiredString(row, "place_description"),
    capturedStateCount: requiredNumber(row, "captured_state_count"),
    sourceId: requiredString(row, "source_id"),
    licenceId: requiredString(row, "licence_id"),
  };
}

function addFilter(
  clauses: string[],
  parameters: QueryParameter[],
  clause: string,
  value: QueryParameter | undefined,
): void {
  if (value !== undefined) {
    clauses.push(clause);
    parameters.push(value);
  }
}

export function normalizeLimit(limit: number | undefined, maximum: number): number {
  if (limit === undefined) return maximum;
  if (!Number.isInteger(limit) || limit < 1) return 1;
  return Math.min(limit, maximum);
}
