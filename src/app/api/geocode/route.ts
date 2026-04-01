import { isRateLimited, extractClientIp } from "@/lib/rate-limit";
import { extractCityFromNominatim, normalizeToMyquranName } from "@/lib/geocode";
import { INDONESIA_BOUNDS } from "@/lib/constants";
import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Si-Imsak/1.0 (jadwal-imsakiyah prayer times app)";

export async function GET(request: NextRequest) {
  const ip = extractClientIp(request.headers.get("x-forwarded-for"));
  if (isRateLimited(ip, 10)) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 429 }
    );
  }

  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || latNum < INDONESIA_BOUNDS.latMin || latNum > INDONESIA_BOUNDS.latMax) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 400 }
    );
  }
  if (isNaN(lngNum) || lngNum < INDONESIA_BOUNDS.lngMin || lngNum > INDONESIA_BOUNDS.lngMax) {
    return NextResponse.json(
      { status: false, city: "" },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `${NOMINATIM_URL}?lat=${latNum}&lon=${lngNum}&format=json&zoom=10&addressdetails=1&accept-language=id`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ status: false, city: "" });
    }

    const data = await res.json();
    const rawCity = extractCityFromNominatim(data.address);

    if (!rawCity) {
      return NextResponse.json({ status: false, city: "" });
    }

    const city = normalizeToMyquranName(rawCity);
    return NextResponse.json({ status: true, city });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ status: false, city: "" });
  }
}
