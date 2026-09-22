export const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

export function getMapStyleUrl(
  configuredUrl: string | undefined = import.meta.env.VITE_QUAKELENS_MAP_STYLE_URL,
): string {
  return configuredUrl?.trim() || DEFAULT_MAP_STYLE_URL;
}
