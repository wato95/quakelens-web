import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbMvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";

import { asPreviewDataError, PreviewDataError } from "./errors";
import type { PreviewManifest } from "./types";
import type { QueryExecutor, QueryParameter, QueryRow } from "./query";

const FILE_NAMES = {
  events: "ql-preview-events.parquet",
  revisions: "ql-preview-revisions.parquet",
  daily_activity: "ql-preview-daily-activity.parquet",
  places: "ql-preview-places.parquet",
} as const;

const VIEW_NAMES = {
  events: "preview_events",
  revisions: "preview_revisions",
  daily_activity: "preview_daily_activity",
  places: "preview_places",
} as const;

export interface DuckDbPreviewDatabase extends QueryExecutor {
  close(): Promise<void>;
}

export async function initializeDuckDb(
  manifest: PreviewManifest,
): Promise<DuckDbPreviewDatabase> {
  let database: duckdb.AsyncDuckDB | undefined;
  let connection: duckdb.AsyncDuckDBConnection | undefined;
  let worker: Worker | undefined;
  try {
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: duckdbMvpWasm, mainWorker: duckdbMvpWorker },
      eh: { mainModule: duckdbEhWasm, mainWorker: duckdbEhWorker },
    });
    if (!bundle.mainWorker) {
      throw new PreviewDataError(
        "duckdb_initialization",
        "DuckDB-Wasm did not select a worker bundle",
      );
    }
    worker = new Worker(bundle.mainWorker);
    database = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await database.instantiate(bundle.mainModule, null);
    await database.open({
      path: ":memory:",
      query: { castTimestampToDate: true },
    });
    connection = await database.connect();
  } catch (error) {
    worker?.terminate();
    throw asPreviewDataError(
      error,
      "duckdb_initialization",
      "DuckDB-Wasm could not be initialized",
    );
  }

  try {
    for (const logicalName of Object.keys(FILE_NAMES) as Array<
      keyof typeof FILE_NAMES
    >) {
      await database.registerFileURL(
        FILE_NAMES[logicalName],
        manifest.artifacts[logicalName].url.href,
        duckdb.DuckDBDataProtocol.HTTP,
        false,
      );
      await connection.query(
        `create view ${VIEW_NAMES[logicalName]} as select * from read_parquet('${FILE_NAMES[logicalName]}')`,
      );
    }
  } catch (error) {
    await connection.close();
    await database.terminate();
    throw asPreviewDataError(
      error,
      "artifact_registration",
      "One or more preview Parquet artifacts could not be registered",
    );
  }

  return {
    async query(sql: string, parameters: QueryParameter[] = []): Promise<QueryRow[]> {
      try {
        const result = parameters.length
          ? await queryPrepared(connection, sql, parameters)
          : await connection.query(sql);
        return result.toArray().map((row) => row.toJSON() as QueryRow);
      } catch (error) {
        throw asPreviewDataError(error, "query", "The preview data query failed");
      }
    },
    async close(): Promise<void> {
      await connection.close();
      await database.terminate();
    },
  };
}

async function queryPrepared(
  connection: duckdb.AsyncDuckDBConnection,
  sql: string,
  parameters: QueryParameter[],
) {
  const statement = await connection.prepare(sql);
  try {
    return await statement.query(...parameters);
  } finally {
    await statement.close();
  }
}
