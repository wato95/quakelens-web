import { getConfiguredManifestUrl } from "./config";
import { initializeDuckDb } from "./duckdb";
import { loadPreviewManifest } from "./manifest";
import { createActivityRepository } from "./repositories/activityRepository";
import { createEarthquakeRepository } from "./repositories/earthquakeRepository";
import { createPlaceRepository } from "./repositories/placeRepository";
import { createRevisionRepository } from "./repositories/revisionRepository";
import type { PreviewDataSession } from "./types";
import type { QueryExecutor, QueryParameter, QueryRow } from "./query";
import type { DuckDbPreviewDatabase } from "./duckdb";
import type { PreviewArtifactName } from "./types";

export async function createPreviewDataSession(
  manifestUrl: URL = getConfiguredManifestUrl(),
): Promise<PreviewDataSession> {
  const manifest = await loadPreviewManifest(manifestUrl);
  const database = await initializeDuckDb(manifest);
  return {
    manifest,
    repositories: {
      earthquakes: createEarthquakeRepository(database),
      revisions: createRevisionRepository(lazyArtifact(database, "revisions")),
      activity: createActivityRepository(database),
      places: createPlaceRepository(lazyArtifact(database, "places")),
    },
    close: () => database.close(),
  };
}

function lazyArtifact(
  database: DuckDbPreviewDatabase,
  logicalName: PreviewArtifactName,
): QueryExecutor {
  return {
    async query(sql: string, parameters?: QueryParameter[]): Promise<QueryRow[]> {
      await database.ensureArtifact(logicalName);
      return database.query(sql, parameters);
    },
  };
}
