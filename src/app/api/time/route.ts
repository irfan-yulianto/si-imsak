import { NO_STORE } from "@/lib/constants";
import type { TimeResponse } from "@/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server clock for client time sync. Same-origin, so it needs no third-party
 * service and stays inside the CSP. Never cached — a cached timestamp is wrong.
 */
export function GET() {
  return NextResponse.json<TimeResponse>({ now: Date.now() }, { headers: { "Cache-Control": NO_STORE } });
}
