import { MYQURAN_API_BASE, REQUEST_TIMEOUT } from "@/lib/constants";
import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request.headers.get("x-forwarded-for"));
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { status: false, data: [], error: "Too many requests" },
      { status: 429 }
    );
  }

  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ status: false, data: [] });
  }

  // Sanitize: allow only letters, spaces, dots, and common Indonesian characters
  const sanitized = q.replace(/[^a-zA-Z\s.\-']/g, "").trim();
  if (sanitized.length < 2 || sanitized.length > 50) {
    return NextResponse.json({ status: false, data: [] });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${MYQURAN_API_BASE}/kota/cari/${encodeURIComponent(sanitized)}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
      signal: controller.signal,
    });

    // v3 API returns 404 for "not found" — treat as empty results, not an error
    if (res.status === 404) {
      return NextResponse.json({ status: true, data: [] });
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
    return NextResponse.json(safeData);
  } catch {
    return NextResponse.json(
      { status: false, data: [] },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
