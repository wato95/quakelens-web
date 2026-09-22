import { PreviewDataError } from "./errors";

export function getConfiguredManifestUrl(
  configuredUrl: string | undefined = import.meta.env.VITE_QUAKELENS_MANIFEST_URL,
  documentUrl: string = window.location.href,
): URL {
  if (!configuredUrl?.trim()) {
    throw new PreviewDataError(
      "configuration",
      "VITE_QUAKELENS_MANIFEST_URL is not configured. Run npm run data:sync or set it in .env.local.",
    );
  }

  try {
    return new URL(configuredUrl, documentUrl);
  } catch (error) {
    throw new PreviewDataError(
      "configuration",
      `VITE_QUAKELENS_MANIFEST_URL is not a valid URL: ${configuredUrl}`,
      { cause: error },
    );
  }
}
