import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPreviewRelease, normalizeBasePath } from "./build-preview-release.mjs";

test("packages one validated immutable build after the production build", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "quakelens-release-test-"));
  const projectRoot = path.join(root, "web");
  const buildId = "20260101T000000Z-aaaaaaaaaaaa";
  await createBuild(root, buildId);
  await mkdir(projectRoot, { recursive: true });
  let environment;

  const result = await buildPreviewRelease({
    pulseFoundryRoot: root,
    buildId,
    basePath: "/quakelens-web/",
    projectRoot,
    runBuild: async (options) => {
      environment = options.environment;
      await mkdir(path.join(projectRoot, "dist"), { recursive: true });
    },
  });

  assert.deepEqual(environment, {
    VITE_BASE_PATH: "/quakelens-web/",
    VITE_QUAKELENS_MANIFEST_URL: `./data/quakelens-preview/builds/${buildId}/manifest.json`,
  });
  assert.equal(result.buildId, buildId);
  assert.equal(
    JSON.parse(await readFile(path.join(result.destination, "manifest.json"), "utf8"))
      .preview_build_id,
    buildId,
  );
});

test("rejects an unsafe Pages base path", () => {
  assert.throws(() => normalizeBasePath("quakelens-web"), /begin and end/);
  assert.throws(() => normalizeBasePath("/../"), /cannot contain/);
});

async function createBuild(root, buildId) {
  const buildDirectory = path.join(root, "published/quakelens-preview/builds", buildId);
  const artifacts = [
    ["events", "events/year=2026/events.parquet"],
    ["revisions", "revisions/year=2026/revisions.parquet"],
    ["daily_activity", "activity/daily.parquet"],
    ["places", "places/places.parquet"],
  ];
  const entries = [];
  for (const [logicalName, relativePath] of artifacts) {
    const data = Buffer.from(`${buildId}:${logicalName}`);
    const artifactPath = path.join(buildDirectory, ...relativePath.split("/"));
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, data);
    entries.push({
      logical_name: logicalName,
      relative_path: relativePath,
      bytes: data.length,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  }
  await writeFile(
    path.join(buildDirectory, "manifest.json"),
    JSON.stringify({
      product_kind: "quakelens-browser-preview",
      preview_schema_version: "1",
      preview_build_id: buildId,
      generated_at: "2026-01-01T00:00:00Z",
      artifacts: entries,
    }),
  );
}
