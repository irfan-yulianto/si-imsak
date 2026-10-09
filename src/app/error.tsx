"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";
import ErrorScreen from "@/components/ui/ErrorScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportClientError(error), [error]);

  return <ErrorScreen onRetry={reset} />;
}
