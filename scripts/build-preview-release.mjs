#!/usr/bin/env node

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readAndValidateBuild, selectPreviewBuild } from "./sync-preview-data.mjs";

export async function buildPreviewRelease({
  pulseFoundryRoot,
  buildId,
  basePath,
  projectRoot,
  runBuild = runViteBuild,
}) {
  const publicationRoot = path.resolve(
    pulseFoundryRoot,
    "published",
    "quakelens-preview",
  );
  const selected = await selectPreviewBuild(publicationRoot, buildId);
  const normalizedBasePath = normalizeBasePath(basePath);
  const relativeManifestUrl = `./data/quakelens-preview/builds/${selected.manifest.preview_build_id}/manifest.json`;

  await runBuild({
    projectRoot,
    environment: {
      VITE_BASE_PATH: normalizedBasePath,
      VITE_QUAKELENS_MANIFEST_URL: relativeManifestUrl,
    },
  });

  const destination = path.join(
    projectRoot,
    "dist",
    "data",
    "quakelens-preview",
    "builds",
    selected.manifest.preview_build_id,
  );
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(destination);
  await copyFile(
    path.join(selected.buildDirectory, "manifest.json"),
    path.join(destination, "manifest.json"),
  );
  for (const artifact of selected.manifest.artifacts) {
    const source = path.join(selected.buildDirectory, artifact.relative_path);
    const target = path.join(destination, artifact.relative_path);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  await readAndValidateBuild(destination);

  return {
    buildId: selected.manifest.preview_build_id,
    destination,
    manifestUrl: relativeManifestUrl,
    basePath: normalizedBasePath,
  };
}

export function normalizeBasePath(value) {
  const basePath = value?.trim() || "/quakelens-web/";
  if (!basePath.startsWith("/") || !basePath.endsWith("/") || basePath.includes("..")) {
    throw new Error("Pages base path must begin and end with / and cannot contain ..");
  }
  return basePath.replace(/\/{2,}/g, "/");
}

async function runViteBuild({ projectRoot, environment }) {
  await runCommand("npm", ["run", "build"], projectRoot, environment);
}

export async function runCommand(command, arguments_, cwd, environment = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd,
      env: { ...process.env, ...environment },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

function parseArguments(arguments_) {
  const values = [...arguments_];
  const pulseFoundryRoot = values.shift();
  if (!pulseFoundryRoot) {
    throw new Error(
      "Usage: npm run release:build -- <pulse-foundry-root> --build <preview-build-id> [--base /quakelens-web/]",
    );
  }
  let buildId;
  let basePath = "/quakelens-web/";
  while (values.length) {
    const option = values.shift();
    if (option === "--build" && values.length) buildId = values.shift();
    else if (option === "--base" && values.length) basePath = values.shift();
    else throw new Error(`Unknown or incomplete option: ${String(option)}`);
  }
  if (!buildId) throw new Error("An explicit immutable --build id is required");
  return { pulseFoundryRoot, buildId, basePath };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await buildPreviewRelease({ ...arguments_, projectRoot });
  console.log(`Built QuakeLens release for ${result.buildId}`);
  console.log(`Pages base: ${result.basePath}`);
  console.log(`Packaged manifest: ${result.manifestUrl}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`Release build failed: ${error.message}`);
    process.exitCode = 1;
  });
}
