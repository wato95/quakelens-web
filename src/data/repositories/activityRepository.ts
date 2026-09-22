import type { QueryExecutor, QueryParameter, QueryRow } from "../query";
import { requiredNumber, requiredUtcDate } from "../query";
import type { ActivityRange, ActivityRepository, DailyActivity } from "../types";

export function createActivityRepository(executor: QueryExecutor): ActivityRepository {
  return {
    async getDailyActivity(range: ActivityRange = {}): Promise<DailyActivity[]> {
      const clauses: string[] = [];
      const parameters: QueryParameter[] = [];
      if (range.startDateInclusive) {
        clauses.push("activity_date_utc >= ?");
        parameters.push(range.startDateInclusive);
      }
      if (range.endDateExclusive) {
        clauses.push("activity_date_utc < ?");
        parameters.push(range.endDateExclusive);
      }
      const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
      const rows = await executor.query(
        `select activity_date_utc, event_count, max_magnitude from preview_daily_activity ${where} order by activity_date_utc`,
        parameters,
      );
      return rows.map(mapActivity);
    },
  };
}

function mapActivity(row: QueryRow): DailyActivity {
  return {
    activityDateUtc: requiredUtcDate(row, "activity_date_utc"),
    eventCount: requiredNumber(row, "event_count"),
    maxMagnitude: requiredNumber(row, "max_magnitude"),
  };
}
