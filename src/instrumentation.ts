import type { Instrumentation } from "next";
import { log, errorMessage } from "@/lib/log";

// Runs once when a server instance starts
export function register() {
  log("info", {
    event: "server_start",
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    region: process.env.VERCEL_REGION ?? "local",
  });
}

// Every unhandled error while rendering or in a route handler. Only the route
// pattern is logged, not the request path (which can carry coordinates).
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  log("error", {
    event: "request_error",
    method: request.method,
    route: context.routePath,
    kind: context.routeType,
    digest: (error as { digest?: string }).digest,
    error: errorMessage(error),
  });
};
