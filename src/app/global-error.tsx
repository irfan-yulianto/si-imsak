"use client";

// This page replaces the root layout, so it brings the app's styles itself
import "./globals.css";
import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";
import ErrorScreen from "@/components/ui/ErrorScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);

  return (
    // Root layout (and its theme script) isn't rendered here — use the app's default dark theme
    <html lang="id" className="dark">
      <body>
        <ErrorScreen onRetry={reset} />
      </body>
    </html>
  );
}
