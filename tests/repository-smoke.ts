import { createPreviewDataSession } from "../src/data/previewDataSession";

const status = document.querySelector<HTMLElement>("#status");
const result = document.querySelector<HTMLElement>("#result");
const configuredManifest = new URLSearchParams(window.location.search).get("manifest");
const manifestUrl = configuredManifest ?? import.meta.env.VITE_QUAKELENS_MANIFEST_URL;

async function smoke(): Promise<void> {
  if (!manifestUrl) throw new Error("No smoke-test manifest URL was configured");
  const resolutionBase = configuredManifest
    ? window.location.href
    : new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const session = await createPreviewDataSession(new URL(manifestUrl, resolutionBase));
  try {
    const events = await session.repositories.earthquakes.getEvents({
      minimumMagnitude: 2.5,
      limit: 10,
    });
    if (!events[0]) throw new Error("Preview returned no events");
    const selected = await session.repositories.earthquakes.getEvent(events[0].eventId);
    const revisions = await session.repositories.revisions.getRevisions(
      events[0].eventId,
    );
    const activity = await session.repositories.activity.getDailyActivity();
    const places = await session.repositories.places.searchPlaces("Paris", 5);
    result!.textContent = JSON.stringify({
      buildId: session.manifest.previewBuildId,
      eventArtifactRows: session.manifest.artifacts.events.rows,
      selectedEventId: selected?.eventId,
      capturedStates: revisions.length,
      activityDays: activity.length,
      matchingPlaces: places.length,
      exposureCapability: session.manifest.capabilities.exposure,
    });
    status!.textContent = "Repository smoke passed";
    document.body.dataset.status = "ready";
  } finally {
    await session.close();
  }
}

smoke().catch((error: unknown) => {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  status!.textContent = message;
  document.body.dataset.status = "error";
});
