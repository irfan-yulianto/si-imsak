import { BUILD_ID } from "@/lib/constants";

export type LogLevel = "info" | "warn" | "error";

/**
 * One JSON line per event, so the Vercel log view can filter on any field
 * (e.g. `"route":"schedule"` or `"level":"error"`). Never log coordinates, IPs or
 * search terms here; route names, ids and counts are enough to debug.
 */
export function log(level: LogLevel, fields: Record<string, unknown>): void {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), version: BUILD_ID, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** The message of anything thrown, without stack traces or request data */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
