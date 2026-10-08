import { CDN_CACHE_DAY, MYQURAN_API_BASE } from "@/lib/constants";
import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { status: false, data: [], error: "Too many requests" },
      { status: 429 }
    );
  }

  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ status: false, data: [] }, { status: 400 });
  }

  // Sanitize: allow only letters (any script), spaces, dots, hyphens and apostrophes
  const sanitized = q.replace(/[^\p{L}\s.\-']/gu, "").trim();
  if (sanitized.length < 2 || sanitized.length > 50) {
    return NextResponse.json({ status: false, data: [] }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${MYQURAN_API_BASE}/kota/cari/${encodeURIComponent(sanitized)}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
      signal: controller.signal,
    });

    // v3 API returns 404 for "not found" — treat as empty results, not an error
    if (res.status === 404) {
      return NextResponse.json(
        { status: true, data: [] },
        { headers: { "Cache-Control": CDN_CACHE_DAY } }
      );
    }

    if (!res.ok) {
      return NextResponse.json({ status: false, data: [] }, { status: 502 });
    }

    const data = await res.json();
    // Filter upstream response to only include expected fields
    const safeData = {
      status: !!data.status,
      data: Array.isArray(data.data)
        ? data.data.map((c: Record<string, unknown>) => ({
            id: typeof c.id === "string" ? c.id : "",
            lokasi: typeof c.lokasi === "string" ? c.lokasi : "",
            daerah: typeof c.daerah === "string" ? c.daerah : "",
          })).filter((c: { id: string }) => c.id)
        : [],
    };
    return NextResponse.json(safeData, {
      headers: safeData.status ? { "Cache-Control": CDN_CACHE_DAY } : undefined,
    });
  } catch (err) {
    console.error("[cities] Failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: false, data: [] },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
