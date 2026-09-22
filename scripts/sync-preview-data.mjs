#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EXPECTED_PRODUCT = "quakelens-browser-preview";
const EXPECTED_SCHEMA = "1";
const EXPECTED_ARTIFACTS = new Set(["events", "revisions", "daily_activity", "places"]);
const BUILD_PATTERN = /^\d{8}T\d{6}Z-[0-9a-f]{12}$/;

export class PreviewSyncError extends Error {
  constructor(message) {
    super(message);
    this.name = "PreviewSyncError";
  }
}

export async function readAndValidateBuild(buildDirectory) {
  const manifestPath = path.join(buildDirectory, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new PreviewSyncError(
      `Cannot read preview manifest ${manifestPath}: ${error.message}`,
    );
  }
  if (manifest.product_kind !== EXPECTED_PRODUCT) {
    throw new PreviewSyncError(
      `Unsupported product_kind in ${manifestPath}: ${String(manifest.product_kind)}`,
    );
  }
  if (manifest.preview_schema_version !== EXPECTED_SCHEMA) {
    throw new PreviewSyncError(
      `Unsupported preview_schema_version in ${manifestPath}: ${String(manifest.preview_schema_version)}`,
    );
  }
  const directoryBuildId = path.basename(buildDirectory);
  if (
    !BUILD_PATTERN.test(manifest.preview_build_id) ||
    manifest.preview_build_id !== directoryBuildId
  ) {
    throw new PreviewSyncError(
      `Manifest build id ${String(manifest.preview_build_id)} does not match ${directoryBuildId}`,
    );
  }
  const generatedAt = Date.parse(manifest.generated_at);
  if (!Number.isFinite(generatedAt)) {
    throw new PreviewSyncError(
      `Manifest generated_at is invalid: ${String(manifest.generated_at)}`,
    );
  }
  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length !== 4) {
    throw new PreviewSyncError(
      `Manifest ${manifestPath} must declare exactly four artifacts`,
    );
  }
  const names = new Set(manifest.artifacts.map((artifact) => artifact.logical_name));
  if (names.size !== 4 || [...EXPECTED_ARTIFACTS].some((name) => !names.has(name))) {
    throw new PreviewSyncError(
      `Manifest ${manifestPath} does not declare the required artifacts`,
    );
  }

  for (const artifact of manifest.artifacts) {
    const relativePath = validateRelativePath(artifact.relative_path);
    const artifactPath = path.resolve(buildDirectory, ...relativePath.split("/"));
    const relativeToBuild = path.relative(path.resolve(buildDirectory), artifactPath);
    if (relativeToBuild.startsWith("..") || path.isAbsolute(relativeToBuild)) {
      throw new PreviewSyncError(`Artifact path escapes the build: ${relativePath}`);
    }
    let details;
    try {
      details = await stat(artifactPath);
    } catch {
      throw new PreviewSyncError(`Manifest artifact does not exist: ${artifactPath}`);
    }
    if (!details.isFile())
      throw new PreviewSyncError(`Manifest artifact is not a file: ${artifactPath}`);
    if (details.size !== artifact.bytes) {
      throw new PreviewSyncError(
        `Artifact byte count mismatch for ${relativePath}: expected ${artifact.bytes}, found ${details.size}`,
      );
    }
    const digest = await sha256(artifactPath);
    if (digest !== artifact.sha256) {
      throw new PreviewSyncError(`Artifact SHA-256 mismatch for ${relativePath}`);
    }
  }
  return { buildDirectory, manifest, generatedAt };
}

export async function selectPreviewBuild(publicationRoot, explicitBuildId) {
  const buildsDirectory = path.join(publicationRoot, "builds");
  let entries;
  try {
    entries = await readdir(buildsDirectory, { withFileTypes: true });
  } catch {
    throw new PreviewSyncError(
      `Preview publication builds directory does not exist: ${buildsDirectory}`,
    );
  }
  const candidates = entries.filter(
    (entry) => entry.isDirectory() && BUILD_PATTERN.test(entry.name),
  );
  if (explicitBuildId) {
    if (!BUILD_PATTERN.test(explicitBuildId)) {
      throw new PreviewSyncError(`Invalid preview build id: ${explicitBuildId}`);
    }
    if (!candidates.some((entry) => entry.name === explicitBuildId)) {
      throw new PreviewSyncError(`Preview build does not exist: ${explicitBuildId}`);
    }
    return readAndValidateBuild(path.join(buildsDirectory, explicitBuildId));
  }
  if (!candidates.length)
    throw new PreviewSyncError(
      `No immutable preview builds found in ${buildsDirectory}`,
    );

  const valid = [];
  for (const candidate of candidates) {
    try {
      valid.push(
        await readAndValidateBuild(path.join(buildsDirectory, candidate.name)),
      );
    } catch (error) {
      throw new PreviewSyncError(
        `Invalid immutable preview build ${candidate.name}: ${error.message}`,
      );
    }
  }
  valid.sort((left, right) => right.generatedAt - left.generatedAt);
  return valid[0];
}

export async function syncPreviewData({ pulseFoundryRoot, buildId, projectRoot }) {
  const publicationRoot = path.resolve(
    pulseFoundryRoot,
    "published",
    "quakelens-preview",
  );
  const selected = await selectPreviewBuild(publicationRoot, buildId);
  const previewRoot = path.join(projectRoot, "public", "_preview");
  const buildsRoot = path.join(previewRoot, "builds");
  const destination = path.join(buildsRoot, selected.manifest.preview_build_id);
  await mkdir(buildsRoot, { recursive: true });

  let reused = false;
  try {
    const existing = await stat(destination);
    if (existing.isDirectory()) {
      await readAndValidateBuild(destination);
      reused = true;
    }
  } catch (error) {
    if (error instanceof PreviewSyncError) throw error;
  }

  if (!reused) {
    const staging = await mkdtemp(path.join(previewRoot, ".sync-"));
    try {
      const stagedBuild = path.join(staging, selected.manifest.preview_build_id);
      await cp(selected.buildDirectory, stagedBuild, {
        recursive: true,
        errorOnExist: true,
      });
      await readAndValidateBuild(stagedBuild);
      await rename(stagedBuild, destination);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }

  const manifestUrl = `./_preview/builds/${selected.manifest.preview_build_id}/manifest.json`;
  await updateEnvLocal(path.join(projectRoot, ".env.local"), manifestUrl);
  return { selected, destination, manifestUrl, reused };
}

export async function updateEnvLocal(envPath, manifestUrl) {
  let current = "";
  try {
    current = await readFile(envPath, "utf8");
  } catch {
    // A fresh checkout does not have .env.local yet.
  }
  const line = `VITE_QUAKELENS_MANIFEST_URL=${manifestUrl}`;
  const expression = /^VITE_QUAKELENS_MANIFEST_URL=.*$/m;
  const updated = expression.test(current)
    ? current.replace(expression, line)
    : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${line}\n`;
  await writeFile(envPath, updated, "utf8");
}

function validateRelativePath(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new PreviewSyncError(
      `Artifact path is not portable and contained: ${String(value)}`,
    );
  }
  return value;
}

async function sha256(filePath) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) digest.update(chunk);
  return digest.digest("hex");
}

function parseArguments(arguments_) {
  const values = [...arguments_];
  const pulseFoundryRoot = values.shift();
  if (!pulseFoundryRoot) {
    throw new PreviewSyncError(
      "Usage: npm run data:sync -- <pulse-foundry-root> [--build <preview-build-id>]",
    );
  }
  let buildId;
  while (values.length) {
    const option = values.shift();
    if (option === "--build" && values.length) buildId = values.shift();
    else throw new PreviewSyncError(`Unknown or incomplete option: ${String(option)}`);
  }
  return { pulseFoundryRoot, buildId };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await syncPreviewData({ ...arguments_, projectRoot });
  console.log(
    `${result.reused ? "Using" : "Copied"} PF1-208 build ${result.selected.manifest.preview_build_id}`,
  );
  console.log(`Local manifest: ${result.manifestUrl}`);
  console.log(`Configured ${path.join(projectRoot, ".env.local")}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`Preview data sync failed: ${error.message}`);
    process.exitCode = 1;
  });
}
