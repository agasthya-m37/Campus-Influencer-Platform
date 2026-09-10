"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced auto-save (F-ONB-02).
 *
 * Deliberately *not* blur-based. On Android, dismissing the keyboard does not
 * reliably fire blur before the page is backgrounded, so a blur-triggered
 * save loses the field the creator just typed — which is exactly the data
 * loss the wizard exists to prevent.
 *
 * Instead: save 800ms after the last keystroke, and flush on step change and
 * on pagehide/visibilitychange, which do fire when an app is backgrounded.
 */
export function useAutosave<T>(
  save: (values: T) => Promise<unknown>,
  { delay = 800 }: { delay?: number } = {},
) {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<T | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const values = pending.current;
    if (values === null) return;
    pending.current = null;

    setState("saving");
    try {
      await saveRef.current(values);
      setState("saved");
      setSavedAt(new Date());
    } catch {
      // Kept quiet on purpose: a failed autosave should not interrupt typing.
      // The values stay in the form, and the next save attempt retries.
      setState("error");
    }
  }, []);

  const schedule = useCallback(
    (values: T) => {
      pending.current = values;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  // Backgrounding the app must not lose the last keystroke.
  useEffect(() => {
    const onHide = () => {
      if (pending.current !== null) void flush();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { schedule, flush, state, savedAt };
}
