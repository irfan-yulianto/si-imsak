type Clarity = (command: string, ...args: string[]) => void;

/**
 * Called by the error pages. The digest matches the server log line written by
 * instrumentation.ts (onRequestError), so a user's report can be traced; Clarity
 * (when enabled) tags the session so it can be found among the recordings.
 */
export function reportClientError(error: Error & { digest?: string }): void {
  const digest = error.digest ?? "client";
  console.error(`[app] ${error.name}: ${error.message} (digest ${digest})`);
  const clarity = (window as unknown as { clarity?: Clarity }).clarity;
  try {
    clarity?.("set", "error_digest", digest);
    clarity?.("event", "app_error");
  } catch {
    // Analytics must never break the error page
  }
}
