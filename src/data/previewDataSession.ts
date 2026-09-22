import { getConfiguredManifestUrl } from "./config";
import { initializeDuckDb } from "./duckdb";
import { loadPreviewManifest } from "./manifest";
import { createActivityRepository } from "./repositories/activityRepository";
import { createEarthquakeRepository } from "./repositories/earthquakeRepository";
import { createPlaceRepository } from "./repositories/placeRepository";
import { createRevisionRepository } from "./repositories/revisionRepository";
import type { PreviewDataSession } from "./types";

export async function createPreviewDataSession(
  manifestUrl: URL = getConfiguredManifestUrl(),
): Promise<PreviewDataSession> {
  const manifest = await loadPreviewManifest(manifestUrl);
  const database = await initializeDuckDb(manifest);
  return {
    manifest,
    repositories: {
      earthquakes: createEarthquakeRepository(database),
      revisions: createRevisionRepository(database),
      activity: createActivityRepository(database),
      places: createPlaceRepository(database),
    },
    close: () => database.close(),
  };
}
