"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

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

/** Binds an upload session to React without leaking timer state into render. */
export function useUpload() {
  const sessionRef = useRef<UploadSession | null>(null);
  const [, force] = useState(0);

  const subscribe = useCallback((listener: () => void) => {
    return sessionRef.current?.subscribe(listener) ?? (() => {});
  }, []);

  const snapshot = useSyncExternalStore(
    subscribe,
    () => sessionRef.current?.snapshot() ?? IDLE,
    () => IDLE,
  );

  const begin = useCallback((file: File) => {
    const resumable = findResumable(file.name, file.size);
    sessionRef.current = createUploadSession(
      file,
      resumable ? { resumeFrom: resumable } : {},
    );
    force((n) => n + 1);
    sessionRef.current.start();
    return Boolean(resumable);
  }, []);

  const clear = useCallback(() => {
    sessionRef.current?.abort();
    sessionRef.current = null;
    force((n) => n + 1);
  }, []);

  return {
    snapshot,
    hasSession: sessionRef.current !== null,
    objectUrl: sessionRef.current?.objectUrl() ?? null,
    begin,
    clear,
    pause: () => sessionRef.current?.pause(),
    resume: () => sessionRef.current?.resume(),
    retry: () => sessionRef.current?.retry(),
  };
}
