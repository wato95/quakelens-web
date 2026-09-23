#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArguments(process.argv.slice(2));
const distRoot = path.join(projectRoot, "dist");

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    if (!requestUrl.pathname.startsWith(options.basePath)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const relativePath = decodeURIComponent(
      requestUrl.pathname.slice(options.basePath.length),
    );
    const requestedPath = path.resolve(distRoot, relativePath || "index.html");
    if (!requestedPath.startsWith(`${distRoot}${path.sep}`)) {
      response.writeHead(400).end("Invalid path");
      return;
    }
    let filePath = requestedPath;
    let details;
    try {
      details = await stat(filePath);
      if (!details.isFile()) throw new Error("not a file");
    } catch {
      if (path.extname(relativePath)) {
        response.writeHead(404).end("Not found");
        return;
      }
      filePath = path.join(distRoot, "index.html");
      details = await stat(filePath);
    }

    const range = parseRange(request.headers.range, details.size);
    const headers = {
      "Accept-Ranges": "bytes",
      "Content-Type": contentType(filePath),
      "Content-Length": String(range ? range.end - range.start + 1 : details.size),
    };
    if (range) {
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${details.size}`;
      response.writeHead(206, headers);
    } else {
      response.writeHead(200, headers);
    }
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(filePath, range ?? undefined).pipe(response);
  } catch (error) {
    response
      .writeHead(500)
      .end(error instanceof Error ? error.message : "Server error");
  }
});

server.listen(options.port, "127.0.0.1", () => {
  console.log(`Serving dist at http://127.0.0.1:${options.port}${options.basePath}`);
});

function parseArguments(arguments_) {
  const values = [...arguments_];
  let port = 4174;
  let basePath = "/quakelens-web/";
  while (values.length) {
    const option = values.shift();
    if (option === "--port" && values.length) port = Number(values.shift());
    else if (option === "--base" && values.length) basePath = values.shift();
    else throw new Error(`Unknown or incomplete option: ${String(option)}`);
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Port must be an integer between 1 and 65535");
  }
  if (!basePath.startsWith("/") || !basePath.endsWith("/")) {
    throw new Error("Base path must begin and end with /");
  }
  return { port, basePath };
}

function parseRange(value, size) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(value ?? "");
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
    return null;
  }
  return { start, end };
}

function contentType(filePath) {
  const extension = path.extname(filePath);
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".wasm": "application/wasm",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    }[extension] ?? "application/octet-stream"
  );
}
