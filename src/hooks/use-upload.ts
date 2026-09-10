"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import {
  createUploadSession,
  findResumable,
  type UploadSession,
  type UploadSnapshot,
} from "@/lib/api/mock/upload";

const IDLE: UploadSnapshot = {
  id: "",
  fileName: "",
  totalBytes: 0,
  uploadedBytes: 0,
  progress: 0,
  status: "idle",
  error: null,
  canResume: false,
};

/**
 * Binds an upload session to React.
 *
 * The session lives in state rather than a ref, so nothing reads mutable
 * state during render — the session object itself is stable, and progress
 * arrives through its own subscription.
 */
export function useUpload() {
  const [session, setSession] = useState<UploadSession | null>(null);

  const subscribe = useCallback(
    (listener: () => void) => session?.subscribe(listener) ?? (() => {}),
    [session],
  );

  const getSnapshot = useCallback(
    () => session?.snapshot() ?? IDLE,
    [session],
  );

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => IDLE);

  const begin = useCallback((file: File) => {
    const resumable = findResumable(file.name, file.size);
    const next = createUploadSession(
      file,
      resumable ? { resumeFrom: resumable } : {},
    );
    setSession(next);
    next.start();
    return Boolean(resumable);
  }, []);

  const clear = useCallback(() => {
    session?.abort();
    setSession(null);
  }, [session]);

  return useMemo(
    () => ({
      snapshot,
      hasSession: session !== null,
      // Only meaningful once complete; null while uploading.
      objectUrl: snapshot.status === "complete" ? session?.objectUrl() ?? null : null,
      begin,
      clear,
      pause: () => session?.pause(),
      resume: () => session?.resume(),
      retry: () => session?.retry(),
    }),
    [snapshot, session, begin, clear],
  );
}
