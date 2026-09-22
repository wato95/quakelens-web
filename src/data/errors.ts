export type PreviewDataErrorCode =
  | "configuration"
  | "manifest_load"
  | "manifest_invalid"
  | "unsupported_schema"
  | "duckdb_initialization"
  | "artifact_registration"
  | "query";

export class PreviewDataError extends Error {
  readonly code: PreviewDataErrorCode;
  readonly cause?: unknown;

  constructor(
    code: PreviewDataErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "PreviewDataError";
    this.code = code;
    this.cause = options?.cause;
  }
}

export function asPreviewDataError(
  error: unknown,
  code: PreviewDataErrorCode,
  message: string,
): PreviewDataError {
  return error instanceof PreviewDataError
    ? error
    : new PreviewDataError(code, message, { cause: error });
}
