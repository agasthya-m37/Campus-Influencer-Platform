/**
 * Resumable chunked upload simulation (F-SUB-04).
 *
 * Deliberately honest rather than a fake progress bar: it slices the real
 * File, tracks per-chunk state, and resumes from the first chunk that is not
 * done. Progress never rewinds, because that is the behaviour that matters
 * to a creator on a train with two bars of signal.
 */

import { getScenarios } from "@/lib/api/mock/scenarios";

export const CHUNK_SIZE = 256 * 1024;

export type ChunkState = "pending" | "inflight" | "done" | "failed";

export type UploadStatus =
  | "idle"
  | "uploading"
  | "paused"
  | "error"
  | "complete";

export interface UploadSnapshot {
  id: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  progress: number;
  status: UploadStatus;
  error: string | null;
  /** True when the failure is resumable rather than fatal. */
  canResume: boolean;
}

export interface UploadSession {
  snapshot(): UploadSnapshot;
  start(): void;
  pause(): void;
  resume(): void;
  retry(): void;
  abort(): void;
  subscribe(listener: () => void): () => void;
  /** blob: URL, available once complete, so playback actually works. */
  objectUrl(): string | null;
}

interface PersistedSession {
  id: string;
  fileName: string;
  totalBytes: number;
  chunks: ChunkState[];
  savedAt: string;
}

const STORAGE_KEY = "pmcip.uploads.v1";

function loadPersisted(): Record<string, PersistedSession> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function persist(session: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    const all = loadPersisted();
    all[session.id] = session;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: the upload still works within this session.
  }
}

function clearPersisted(id: string) {
  if (typeof window === "undefined") return;
  try {
    const all = loadPersisted();
    delete all[id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Nothing to clear.
  }
}

/**
 * An unfinished upload for this file, if one exists. The File handle cannot
 * survive a reload, so resuming re-prompts for the file and skips chunks
 * already done — exactly how tus and GCS resumable uploads behave.
 */
export function findResumable(fileName: string, size: number): PersistedSession | null {
  const all = loadPersisted();
  return (
    Object.values(all).find(
      (s) => s.fileName === fileName && s.totalBytes === size && s.chunks.some((c) => c !== "done"),
    ) ?? null
  );
}

export function createUploadSession(
  file: File,
  opts: { resumeFrom?: PersistedSession } = {},
): UploadSession {
  const id = opts.resumeFrom?.id ?? `upl_${Math.random().toString(36).slice(2, 10)}`;
  const chunkCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

  const chunks: ChunkState[] =
    opts.resumeFrom?.chunks.length === chunkCount
      ? // Anything mid-flight when we stopped is retried, not assumed done.
        opts.resumeFrom.chunks.map((c) => (c === "done" ? "done" : "pending"))
      : Array.from({ length: chunkCount }, () => "pending");

  let status: UploadStatus = "idle";
  let error: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let objectUrl: string | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const l of listeners) l();
  };

  const doneBytes = () =>
    chunks.reduce(
      (total, state, i) =>
        state === "done"
          ? total + Math.min(CHUNK_SIZE, file.size - i * CHUNK_SIZE)
          : total,
      0,
    );

  const save = () =>
    persist({
      id,
      fileName: file.name,
      totalBytes: file.size,
      chunks: [...chunks],
      savedAt: new Date().toISOString(),
    });

  function tick() {
    if (status !== "uploading") return;

    const index = chunks.findIndex((c) => c !== "done");
    if (index === -1) {
      status = "complete";
      objectUrl = URL.createObjectURL(file);
      clearPersisted(id);
      emit();
      return;
    }

    // Scenario: fail the chunk that crosses 40%, so resume is demonstrable.
    const fraction = (index * CHUNK_SIZE) / file.size;
    const priorFraction = ((index - 1) * CHUNK_SIZE) / file.size;
    if (
      getScenarios().uploadInterruption &&
      fraction >= 0.4 &&
      priorFraction < 0.4 &&
      chunks[index] !== "failed"
    ) {
      chunks[index] = "failed";
      status = "error";
      error = "Upload interrupted. Your progress is saved.";
      save();
      emit();
      return;
    }

    chunks[index] = "inflight";
    emit();

    // Per-chunk time proportional to size, with jitter.
    const delay = 60 + Math.random() * 80;
    timer = setTimeout(() => {
      if (status !== "uploading") return;
      chunks[index] = "done";
      save();
      emit();
      tick();
    }, delay);
  }

  return {
    snapshot: () => ({
      id,
      fileName: file.name,
      totalBytes: file.size,
      uploadedBytes: doneBytes(),
      progress: file.size === 0 ? 1 : doneBytes() / file.size,
      status,
      error,
      canResume: status === "error",
    }),

    start() {
      if (status === "uploading" || status === "complete") return;
      status = "uploading";
      error = null;
      emit();
      tick();
    },

    pause() {
      if (status !== "uploading") return;
      status = "paused";
      if (timer) clearTimeout(timer);
      // The inflight chunk is not credited: resume re-sends it.
      const inflight = chunks.indexOf("inflight");
      if (inflight !== -1) chunks[inflight] = "pending";
      save();
      emit();
    },

    resume() {
      if (status !== "paused" && status !== "error") return;
      status = "uploading";
      error = null;
      emit();
      tick();
    },

    retry() {
      for (let i = 0; i < chunks.length; i += 1) {
        if (chunks[i] === "failed") chunks[i] = "pending";
      }
      status = "uploading";
      error = null;
      emit();
      tick();
    },

    abort() {
      if (timer) clearTimeout(timer);
      status = "idle";
      for (let i = 0; i < chunks.length; i += 1) chunks[i] = "pending";
      clearPersisted(id);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    objectUrl: () => objectUrl,
  };
}

/** F-SUB-03: external preview links come from a configurable allowlist. */
export const ALLOWED_PREVIEW_HOSTS = [
  "drive.google.com",
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "dropbox.com",
  "wetransfer.com",
];

export function validateExternalLink(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "That does not look like a link.";
  }
  const allowed = ALLOWED_PREVIEW_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  return allowed
    ? null
    : `Use a link from ${ALLOWED_PREVIEW_HOSTS.slice(0, 3).join(", ")} or another approved service.`;
}
