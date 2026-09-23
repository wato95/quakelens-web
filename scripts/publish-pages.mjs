#!/usr/bin/env node

import { cp, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildPreviewRelease, runCommand } from "./build-preview-release.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!options.publish) {
    throw new Error(
      "Publication requires the explicit --publish flag; use release:build to create dist without pushing",
    );
  }

  const trackedStatus = await capture("git", [
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);
  if (trackedStatus.trim()) {
    throw new Error("Commit or stash tracked changes before publishing GitHub Pages");
  }

  for (const script of [
    "lint",
    "format:check",
    "typecheck",
    "test",
    "test:data-sync",
    "test:release",
  ]) {
    await runCommand("npm", ["run", script], projectRoot);
  }

  const release = await buildPreviewRelease({
    pulseFoundryRoot: options.pulseFoundryRoot,
    buildId: options.buildId,
    basePath: options.basePath,
    projectRoot,
  });
  const remoteUrl = (await capture("git", ["remote", "get-url", "origin"])).trim();
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "quakelens-pages-"));
  const publishRoot = path.join(temporaryRoot, "site");

  try {
    await cp(path.join(projectRoot, "dist"), publishRoot, { recursive: true });
    await runCommand("git", ["init", "--initial-branch=gh-pages"], publishRoot);
    await runCommand("git", ["add", "."], publishRoot);
    await runCommand(
      "git",
      [
        "-c",
        "user.name=QuakeLens Release",
        "-c",
        "user.email=quakelens-release@users.noreply.github.com",
        "commit",
        "-m",
        `build(pages): publish preview ${release.buildId}`,
      ],
      publishRoot,
    );
    await runCommand("git", ["remote", "add", "origin", remoteUrl], publishRoot);
    await runCommand(
      "git",
      ["push", "--force", "origin", "HEAD:gh-pages"],
      publishRoot,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log(`Published ${release.buildId} to ${remoteUrl}#gh-pages`);
}

function parseArguments(arguments_) {
  const values = [...arguments_];
  const pulseFoundryRoot = values.shift();
  if (!pulseFoundryRoot) {
    throw new Error(
      "Usage: npm run release:publish -- <pulse-foundry-root> --build <id> [--base /quakelens-web/] --publish",
    );
  }
  let buildId;
  let basePath = "/quakelens-web/";
  let publish = false;
  while (values.length) {
    const option = values.shift();
    if (option === "--build" && values.length) buildId = values.shift();
    else if (option === "--base" && values.length) basePath = values.shift();
    else if (option === "--publish") publish = true;
    else throw new Error(`Unknown or incomplete option: ${String(option)}`);
  }
  if (!buildId) throw new Error("An explicit immutable --build id is required");
  return { pulseFoundryRoot, buildId, basePath, publish };
}

async function capture(command, arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} exited with ${code ?? signal}`));
    });
  });
}

main().catch((error) => {
  console.error(`Pages publication failed: ${error.message}`);
  process.exitCode = 1;
});
