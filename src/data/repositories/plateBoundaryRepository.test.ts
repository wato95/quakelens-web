import { webcrypto, createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import geometry from "../../../tests/fixtures/tectonic-preview/references/tectonic_plate_boundaries.geojson?raw";
import {
  createPlateBoundaryRepository,
  parsePlateBoundaries,
} from "./plateBoundaryRepository";
import { tectonicManifest } from "../../test/tectonicFixture";

beforeEach(() => vi.stubGlobal("crypto", webcrypto));
afterEach(() => vi.unstubAllGlobals());
const collection = JSON.parse(geometry);
const reference = tectonicManifest.plateBoundaries!;
describe("plate-boundary display repository", () => {
  it("loads verified manifest-relative geometry once independently of DuckDB", async () => {
    const fetcher = vi.fn(async () => new Response(geometry));
    const repository = createPlateBoundaryRepository(reference, fetcher);
    const [a, b] = await Promise.all([
      repository.getPlateBoundaries(),
      repository.getPlateBoundaries(),
    ]);
    expect(a).toBe(b);
    expect(a.features).toHaveLength(3);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(reference.url);
  });
  it.each(["hash", "bytes", "http", "json"])(
    "rejects %s failure and permits retry",
    async (mode) => {
      const content = mode === "json" ? "invalid JSON" : geometry;
      const ref = {
        ...reference,
        ...(mode === "hash" ? { sha256: "a".repeat(64) } : {}),
        ...(mode === "bytes" ? { bytes: 1 } : {}),
        ...(mode === "json"
          ? {
              bytes: content.length,
              sha256: createHash("sha256").update(content).digest("hex"),
            }
          : {}),
      };
      const fetcher = vi.fn(
        async () => new Response(content, { status: mode === "http" ? 404 : 200 }),
      );
      const repository = createPlateBoundaryRepository(ref, fetcher);
      await expect(repository.getPlateBoundaries()).rejects.toMatchObject({
        code: "reference_load",
      });
      await expect(repository.getPlateBoundaries()).rejects.toMatchObject({
        code: "reference_load",
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it("preserves antimeridian-split lines and rejects unsplit longitude jumps", () => {
    expect(parsePlateBoundaries(collection, 3)).toEqual(collection);
    const invalid = structuredClone(collection);
    invalid.features[0].geometry.coordinates = [
      [170, 10],
      [-170, 12],
    ];
    expect(() => parsePlateBoundaries(invalid, 3)).toThrow(/Invalid/);
  });
  it.each([NaN, Infinity, 181])(
    "rejects non-finite/out-of-range longitude %s",
    (longitude) => {
      const invalid = structuredClone(collection);
      invalid.features[0].geometry.coordinates[0][0] = longitude;
      expect(() => parsePlateBoundaries(invalid, 3)).toThrow();
    },
  );
});
