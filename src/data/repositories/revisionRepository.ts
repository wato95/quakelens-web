import type { QueryExecutor, QueryRow } from "../query";
import {
  requiredBoolean,
  requiredNumber,
  requiredString,
  requiredStringArray,
  requiredUtcInstant,
} from "../query";
import type { CapturedEventState, RevisionRepository } from "../types";

export function createRevisionRepository(executor: QueryExecutor): RevisionRepository {
  return {
    async getRevisions(eventId: string): Promise<CapturedEventState[]> {
      if (!eventId.trim()) return [];
      const rows = await executor.query(
        `select * from preview_revisions where event_id = ? order by captured_state_number`,
        [eventId],
      );
      return rows.map(mapRevision);
    },
  };
}

function mapRevision(row: QueryRow): CapturedEventState {
  return {
    eventId: requiredString(row, "event_id"),
    eventRevisionId: requiredString(row, "event_revision_id"),
    capturedStateNumber: requiredNumber(row, "captured_state_number"),
    isInitialState: requiredBoolean(row, "is_initial_state"),
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
    changedFields: requiredStringArray(row, "changed_fields"),
    sourceId: requiredString(row, "source_id"),
    licenceId: requiredString(row, "licence_id"),
  };
}
