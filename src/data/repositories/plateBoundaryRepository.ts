import type { FeatureCollection, LineString } from "geojson";
import { PreviewDataError } from "../errors";
import type { PlateBoundaryReference } from "../types";

export type PlateBoundaries = FeatureCollection<LineString, Record<string, string>>;

export function createPlateBoundaryRepository(
  reference: PlateBoundaryReference,
  fetcher: typeof fetch = fetch,
) {
  let pending: Promise<PlateBoundaries> | undefined;
  return {
    getPlateBoundaries(): Promise<PlateBoundaries> {
      pending ??= load();
      return pending;
    },
  };
  async function load(): Promise<PlateBoundaries> {
    try {
      const response = await fetcher(reference.url);
      if (!response.ok) throw new Error(`Boundary HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const hash = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      if (bytes.byteLength !== reference.bytes || hash !== reference.sha256)
        throw new Error("Boundary content integrity mismatch");
      return parsePlateBoundaries(
        JSON.parse(new TextDecoder().decode(bytes)),
        reference.features,
      );
    } catch (cause) {
      pending = undefined;
      throw new PreviewDataError(
        "reference_load",
        "Plate boundaries could not be loaded",
        { cause },
      );
    }
  }
}

export function parsePlateBoundaries(
  value: unknown,
  features: number,
): PlateBoundaries {
  const collection = object(value);
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    collection.features.length !== features
  )
    throw invalid();
  const lines = collection.features.map((value: unknown) => {
    const feature = object(value);
    const geometry = object(feature.geometry);
    const properties = object(feature.properties);
    if (
      feature.type !== "Feature" ||
      geometry.type !== "LineString" ||
      !Array.isArray(geometry.coordinates) ||
      geometry.coordinates.length < 2
    )
      throw invalid();
    const coordinates = geometry.coordinates.map((value: unknown) => {
      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        !value.every(
          (coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate),
        ) ||
        Math.abs(value[0]) > 180 ||
        Math.abs(value[1]) > 90
      )
        throw invalid();
      return [value[0], value[1]] as [number, number];
    });
    for (let i = 1; i < coordinates.length; i++) {
      if (Math.abs(coordinates[i][0] - coordinates[i - 1][0]) > 180) throw invalid();
    }
    const names = ["name", "plate_a", "plate_b", "boundary_type", "source"];
    const typedProperties: Record<string, string> = {};
    for (const name of names) {
      if (typeof properties[name] !== "string") throw invalid();
      typedProperties[name] = properties[name];
    }
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates },
      properties: typedProperties,
    };
  });
  return { type: "FeatureCollection", features: lines };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
}
function invalid() {
  return new PreviewDataError(
    "data_integrity",
    "Invalid plate-boundary display geometry",
  );
}
