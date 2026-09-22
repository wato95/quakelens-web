import type { QueryExecutor, QueryRow } from "../query";
import {
  nullableNumber,
  nullableString,
  requiredNumber,
  requiredString,
} from "../query";
import type { PlaceRepository, PlaceSearchResult } from "../types";
import { normalizeLimit } from "./earthquakeRepository";

export function createPlaceRepository(executor: QueryExecutor): PlaceRepository {
  return {
    async searchPlaces(query: string, limit = 10): Promise<PlaceSearchResult[]> {
      const normalized = query.trim();
      if (!normalized) return [];
      const rows = await executor.query(
        `select place_id, name, place_type, country_code, admin1_code, admin1_name,
                latitude, longitude, population_context, population_year,
                population_source_id, source_id, source_vintage
         from preview_places
         where contains(lower(name), lower(?))
         order by case when lower(name) = lower(?) then 0 else 1 end,
                  population_context desc nulls last, name, admin1_name
         limit ?`,
        [normalized, normalized, normalizeLimit(limit, 50)],
      );
      return rows.map(mapPlace);
    },
  };
}

function mapPlace(row: QueryRow): PlaceSearchResult {
  return {
    placeId: requiredString(row, "place_id"),
    name: requiredString(row, "name"),
    placeType: requiredString(row, "place_type"),
    countryCode: requiredString(row, "country_code"),
    admin1Code: requiredString(row, "admin1_code"),
    admin1Name: nullableString(row, "admin1_name"),
    latitude: requiredNumber(row, "latitude"),
    longitude: requiredNumber(row, "longitude"),
    populationContext: nullableNumber(row, "population_context"),
    populationYear: nullableNumber(row, "population_year"),
    populationSourceId: nullableString(row, "population_source_id"),
    sourceId: requiredString(row, "source_id"),
    sourceVintage: requiredString(row, "source_vintage"),
  };
}
