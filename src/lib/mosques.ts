export interface Mosque {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  address?: string;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
  remark?: string;
}

/**
 * Calculate distance between two coordinates using a fast equirectangular approximation.
 * Returns distance in meters.
 * Optimized for speed over short distances compared to full Haversine.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const dLat = lat2Rad - lat1Rad;

  let dLngDeg = lng2 - lng1;
  if (dLngDeg > 180) dLngDeg -= 360;
  else if (dLngDeg < -180) dLngDeg += 360;
  const dLng = toRad(dLngDeg);

  const x = dLng * Math.cos((lat1Rad + lat2Rad) / 2);
  const y = dLat;
  return Math.sqrt(x * x + y * y) * R;
}

/**
 * Format distance for display: "120 m" or "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Get adaptive search radius based on GPS accuracy.
 */
export function getSearchRadius(accuracy: number | null): number {
  if (!accuracy || accuracy <= 100) return 2000;
  if (accuracy <= 500) return 3000;
  return 4000;
}

/**
 * Build Overpass QL query for mosques within a radius.
 * Uses union of three tag patterns for comprehensive coverage:
 * 1. amenity=place_of_worship + religion=muslim
 * 2. building=mosque
 * 3. place_of_worship=musalla (prayer rooms)
 */
export function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  return `[out:json][timeout:15];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});nwr["building"="mosque"](around:${radius},${lat},${lng});nwr["place_of_worship"="musalla"](around:${radius},${lat},${lng}););out center body qt;`;
}

function getCenter(element: OverpassElement): { lat: number; lng: number } | null {
  if (element.type === "node" && element.lat != null && element.lon != null) {
    return { lat: element.lat, lng: element.lon };
  }
  // Ways and relations have a center property when using "out center"
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

function getMosqueName(tags: Record<string, string> | undefined): string {
  if (!tags) return "Masjid";
  const name = tags.name || tags["name:id"] || tags["name:en"] || tags.old_name;
  if (name) {
    // If name is just "Masjid" and we have an address, append it
    if (name === "Masjid" && (tags["addr:street"] || tags["addr:full"])) {
      return `Masjid (${tags["addr:street"] || tags["addr:full"]})`;
    }
    return name;
  }
  // Default based on type
  if (tags.place_of_worship === "musalla") return "Musholla";
  return "Masjid";
}

/**
 * Parse Overpass API response into Mosque array, sorted by distance.
 * Deduplicates results from union query by type/id key.
 */
export function parseOverpassResponse(
  data: OverpassResponse,
  userLat: number,
  userLng: number,
  limit: number = 20
): Mosque[] {
  if (!data?.elements?.length) return [];

  const seen = new Set<string>();
  const mosques: Mosque[] = [];

  for (const el of data.elements) {
    const key = `${el.type}/${el.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const center = getCenter(el);
    if (!center) continue;

    const name = getMosqueName(el.tags);
    const address = el.tags?.["addr:street"] || el.tags?.["addr:full"] || undefined;

    mosques.push({
      id: key,
      name,
      lat: center.lat,
      lng: center.lng,
      distance: haversineDistance(userLat, userLng, center.lat, center.lng),
      address,
    });
  }

  mosques.sort((a, b) => a.distance - b.distance);
  return mosques.slice(0, limit);
}
