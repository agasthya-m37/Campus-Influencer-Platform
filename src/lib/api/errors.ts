/**
 * One normalized error shape, so a single <ErrorState> renders any failure
 * regardless of whether it came from the mock or a real network.
 */

export type ApiErrorKind =
  | "network"
  | "validation"
  | "conflict"
  | "not_found"
  | "forbidden"
  | "rate_limit"
  | "server";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;

  constructor(
    kind: ApiErrorKind,
    message: string,
    opts: { status?: number; fields?: Record<string, string>; requestId?: string } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = opts.status ?? STATUS_FOR[kind];
    this.fields = opts.fields;
    this.requestId = opts.requestId;
  }
}

const STATUS_FOR: Record<ApiErrorKind, number> = {
  network: 0,
  validation: 422,
  conflict: 409,
  /** Out-of-scope reads return 404, never 403: a 403 confirms the record
   *  exists, which leaks other brands' campaigns to a competitor's reviewer. */
  not_found: 404,
  forbidden: 403,
  rate_limit: 429,
  server: 500,
};

/** Copy shown to the user. Never leaks internals. */
export function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case "network":
        return "We could not reach the server. Check your connection and try again.";
      case "validation":
        return error.message || "Some details need fixing.";
      case "conflict":
        return "That was already submitted. Refresh to see the latest.";
      case "not_found":
        return "We could not find that.";
      case "forbidden":
        return "You do not have access to this.";
      case "rate_limit":
        return "Too many attempts. Wait a moment and try again.";
      case "server":
        return "Something went wrong on our side. Try again shortly.";
    }
  }
  return "Something went wrong. Try again.";
}

export function isRetryable(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.kind === "network" || error.kind === "server" || error.kind === "rate_limit")
  );
}
