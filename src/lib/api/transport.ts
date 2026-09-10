/**
 * THE SEAM.
 *
 * Everything above this file speaks in request descriptors addressed by the
 * same path strings the real API uses ("POST /deliverables/:id/submissions").
 * Swapping to a live backend is replacing the one export at the bottom with
 * `httpTransport` — no feature code changes.
 */

import { ApiError } from "@/lib/api/errors";

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiRequest {
  method: Method;
  /** Concrete path with ids substituted, e.g. "/deliverables/dlv_1". */
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Held across retries so a double-tap cannot create two records. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  data: T;
  requestId: string;
}

export type Transport = <T>(req: ApiRequest) => Promise<ApiResponse<T>>;

/**
 * The real transport, kept here so the swap is visibly small. Unused while
 * the mock is active; roughly thirty lines is the whole cost of the seam.
 */
export const httpTransport: Transport = async <T,>(req: ApiRequest) => {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const url = new URL(base + req.path, base || "http://localhost");

  for (const [k, v] of Object.entries(req.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.idempotencyKey ? { "Idempotency-Key": req.idempotencyKey } : {}),
      },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal: req.signal,
    });
  } catch {
    throw new ApiError("network", "Request failed");
  }

  const requestId = response.headers.get("x-request-id") ?? "unknown";
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(kindForStatus(response.status), payload?.message ?? "Request failed", {
      status: response.status,
      fields: payload?.fields,
      requestId,
    });
  }
  return { data: payload as T, requestId };
};

function kindForStatus(status: number) {
  if (status === 404) return "not_found" as const;
  if (status === 403) return "forbidden" as const;
  if (status === 409) return "conflict" as const;
  if (status === 422) return "validation" as const;
  if (status === 429) return "rate_limit" as const;
  return "server" as const;
}

/* ── active transport ───────────────────────────────────────────────── */

import { mockTransport } from "@/lib/api/mock/handlers";

export const transport: Transport = mockTransport;
