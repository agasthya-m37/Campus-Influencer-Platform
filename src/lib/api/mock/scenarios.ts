/**
 * Dev-only failure scenarios.
 *
 * Unhappy paths are the ones that go untested until a demo. A toggle turns
 * each into a single click, so the error, conflict and interruption states
 * are things we actually look at.
 */

export interface Scenarios {
  networkError: boolean;
  conflict: boolean;
  validationError: boolean;
  /** Fails the chunk crossing 40% of a video upload. */
  uploadInterruption: boolean;
  /** Marks an uploaded file infected so quarantine UI is reachable. */
  infectedFile: boolean;
  slowNetwork: boolean;
}

const DEFAULTS: Scenarios = {
  networkError: false,
  conflict: false,
  validationError: false,
  uploadInterruption: false,
  infectedFile: false,
  slowNetwork: false,
};

const KEY = "pmcip.scenarios.v1";

let current: Scenarios = { ...DEFAULTS };
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Scenarios>) };
  } catch {
    current = { ...DEFAULTS };
  }
}

export function getScenarios(): Scenarios {
  return current;
}

export function setScenario<K extends keyof Scenarios>(key: K, value: Scenarios[K]) {
  current = { ...current, [key]: value };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // Storage unavailable; the toggle still applies for this session.
    }
  }
  for (const l of listeners) l();
}

export function resetScenarios() {
  current = { ...DEFAULTS };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
  }
  for (const l of listeners) l();
}

export function subscribeScenarios(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
