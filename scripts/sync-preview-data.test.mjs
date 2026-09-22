import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PreviewSyncError,
  selectPreviewBuild,
  syncPreviewData,
  updateEnvLocal,
} from "./sync-preview-data.mjs";

test("selects the valid build with the latest manifest generated_at", async () => {
  const root = await fixtureRoot();
  await createBuild(root, "20260101T000000Z-aaaaaaaaaaaa", "2026-02-01T00:00:00Z");
  await createBuild(root, "20260102T000000Z-bbbbbbbbbbbb", "2026-01-01T00:00:00Z");

  const selected = await selectPreviewBuild(
    path.join(root, "published/quakelens-preview"),
  );
  assert.equal(selected.manifest.preview_build_id, "20260101T000000Z-aaaaaaaaaaaa");
});

test("syncs an explicit immutable build and preserves other local env values", async () => {
  const root = await fixtureRoot();
  const projectRoot = path.join(root, "web");
  const buildId = "20260101T000000Z-aaaaaaaaaaaa";
  await createBuild(root, buildId, "2026-01-01T00:00:00Z");
  await mkdir(projectRoot, { recursive: true });
  await writeFile(
    path.join(projectRoot, ".env.local"),
    "UNCHANGED=yes\nVITE_QUAKELENS_MANIFEST_URL=/old\n",
  );

  const first = await syncPreviewData({ pulseFoundryRoot: root, buildId, projectRoot });
  const second = await syncPreviewData({
    pulseFoundryRoot: root,
    buildId,
    projectRoot,
  });
  assert.equal(first.reused, false);
  assert.equal(second.reused, true);
  assert.match(
    await readFile(path.join(projectRoot, ".env.local"), "utf8"),
    /UNCHANGED=yes/,
  );
  assert.match(
    await readFile(path.join(projectRoot, ".env.local"), "utf8"),
    new RegExp(buildId),
  );
});

test("rejects artifact traversal and hash mismatches", async () => {
  const root = await fixtureRoot();
  const buildId = "20260101T000000Z-aaaaaaaaaaaa";
  const manifestPath = await createBuild(root, buildId, "2026-01-01T00:00:00Z");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.artifacts[0].relative_path = "../outside.parquet";
  await writeFile(manifestPath, JSON.stringify(manifest));

  await assert.rejects(
    selectPreviewBuild(path.join(root, "published/quakelens-preview"), buildId),
    (error) =>
      error instanceof PreviewSyncError && /portable and contained/.test(error.message),
  );
});

test("adds the manifest variable to a fresh env file", async () => {
  const root = await fixtureRoot();
  const envPath = path.join(root, ".env.local");
  await updateEnvLocal(envPath, "./_preview/builds/example/manifest.json");
  assert.equal(
    await readFile(envPath, "utf8"),
    "VITE_QUAKELENS_MANIFEST_URL=./_preview/builds/example/manifest.json\n",
  );
});

async function fixtureRoot() {
  return mkdtemp(path.join(os.tmpdir(), "quakelens-sync-test-"));
}

async function createBuild(root, buildId, generatedAt) {
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
  const manifestPath = path.join(buildDirectory, "manifest.json");
  await writeFile(
    manifestPath,
    JSON.stringify({
      product_kind: "quakelens-browser-preview",
      preview_schema_version: "1",
      preview_build_id: buildId,
      generated_at: generatedAt,
      artifacts: entries,
    }),
  );
  return manifestPath;
}
