import { PreviewDataError } from "./errors";

export type QueryParameter = string | number | boolean | null;
export type QueryRow = Record<string, unknown>;

export interface QueryExecutor {
  query(sql: string, parameters?: QueryParameter[]): Promise<QueryRow[]>;
}

export function requiredString(row: QueryRow, name: string): string {
  const value = row[name];
  if (typeof value !== "string") throw rowError(name, "string", value);
  return value;
}

export function nullableString(row: QueryRow, name: string): string | null {
  const value = row[name];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw rowError(name, "string or null", value);
  return value;
}

export function requiredNumber(row: QueryRow, name: string): number {
  const value = row[name];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") {
    const result = Number(value);
    if (Number.isSafeInteger(result)) return result;
  }
  throw rowError(name, "safe number", value);
}

export function nullableNumber(row: QueryRow, name: string): number | null {
  if (row[name] === null || row[name] === undefined) return null;
  return requiredNumber(row, name);
}

export function requiredBoolean(row: QueryRow, name: string): boolean {
  const value = row[name];
  if (typeof value !== "boolean") throw rowError(name, "boolean", value);
  return value;
}

export function requiredUtcInstant(row: QueryRow, name: string): string {
  const value = row[name];
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString();
  }
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw rowError(name, "timestamp", value);
}

export function requiredUtcDate(row: QueryRow, name: string): string {
  const value = row[name];
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) return date.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  throw rowError(name, "UTC date", value);
}

export function requiredStringArray(row: QueryRow, name: string): string[] {
  const value = row[name];
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    return value;
  if (value && typeof value === "object" && Symbol.iterator in value) {
    const entries = Array.from(value as Iterable<unknown>);
    if (entries.every((entry) => typeof entry === "string")) return entries;
  }
  throw rowError(name, "string array", value);
}

function rowError(name: string, expected: string, value: unknown): PreviewDataError {
  return new PreviewDataError(
    "query",
    `Preview row field ${name} must be a ${expected}; received ${String(value)}`,
  );
}
