/**
 * Jittered latency by operation class.
 *
 * Real delays matter: without them every screen renders instantly during
 * development, and the loading and pending states get discovered at demo
 * time instead of being designed.
 */

export type OpClass = "read" | "write" | "auth" | "upload_init" | "export";

const RANGE: Record<OpClass, [number, number]> = {
  read: [120, 320],
  write: [350, 700],
  auth: [700, 1100],
  upload_init: [300, 500],
  export: [900, 1600],
};

export function delayFor(op: OpClass): Promise<void> {
  const [min, max] = RANGE[op];
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function classify(method: string, path: string): OpClass {
  if (path.startsWith("/auth/")) return "auth";
  if (path.includes("/uploads")) return "upload_init";
  if (path.includes("/exports")) return "export";
  return method === "GET" ? "read" : "write";
}
