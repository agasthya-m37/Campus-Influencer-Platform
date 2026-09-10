"use client";

/**
 * Data hooks.
 *
 * Return shapes are deliberately React-Query-shaped ({ data, isLoading,
 * error, refetch } and { mutate, isPending, error }). We do not use React
 * Query yet — the mock store already *is* a normalized client cache, and a
 * second cache would need invalidation to stay honest. Keeping the shapes
 * means adopting it when a real backend lands is a change inside this file,
 * not across every container.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ApiError } from "@/lib/api/errors";
import { store } from "@/lib/api/mock/store";

/** Re-renders whenever the mock store mutates. */
function useStoreVersion(): number {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getVersion(),
    () => 0,
  );
}

export interface QueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * Runs `fetcher` on mount, whenever `deps` change, and whenever the store
 * mutates — so a submission made on one screen updates every other screen
 * without an explicit invalidation call.
 */
export function useQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
): QueryResult<T> {
  const version = useStoreVersion();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [nonce, setNonce] = useState(0);
  const hasLoaded = useRef(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    if (hasLoaded.current) setIsRefetching(true);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setError(
          err instanceof ApiError ? err : new ApiError("server", "Request failed"),
        );
      })
      .finally(() => {
        if (cancelled) return;
        hasLoaded.current = true;
        setIsLoading(false);
        setIsRefetching(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { data, isLoading, isRefetching, error, refetch };
}

export interface MutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput | undefined>;
  isPending: boolean;
  error: ApiError | null;
  reset: () => void;
  /** Per-field errors from a 422, for form display. */
  fieldErrors: Record<string, string> | undefined;
}

/**
 * One idempotency key is generated per mutation *attempt* and held across
 * retries of that attempt, so a double-tap on flaky 4G replays rather than
 * creating a second record.
 */
export function useMutation<TInput, TOutput>(
  mutator: (input: TInput, idempotencyKey: string) => Promise<TOutput>,
  options: {
    onSuccess?: (output: TOutput, input: TInput) => void;
    onError?: (error: ApiError) => void;
  } = {},
): MutationResult<TInput, TOutput> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const keyRef = useRef<string | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mutate = useCallback(
    async (input: TInput) => {
      setIsPending(true);
      setError(null);
      keyRef.current ??= crypto.randomUUID();

      try {
        const output = await mutator(input, keyRef.current);
        keyRef.current = null;
        optionsRef.current.onSuccess?.(output, input);
        return output;
      } catch (err: unknown) {
        const apiError =
          err instanceof ApiError ? err : new ApiError("server", "Request failed");
        setError(apiError);
        optionsRef.current.onError?.(apiError);
        // Keep the key so an immediate retry is treated as the same attempt.
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [mutator],
  );

  const reset = useCallback(() => {
    setError(null);
    keyRef.current = null;
  }, []);

  return { mutate, isPending, error, reset, fieldErrors: error?.fields };
}

/** Ensures the store is hydrated from localStorage before first paint. */
export function useHydratedStore() {
  useEffect(() => {
    store.hydrate();
  }, []);
}
