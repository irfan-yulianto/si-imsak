"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useStore } from "@/store/useStore";
import { Mosque, formatDistance, getSearchRadius, haversineDistance } from "@/lib/mosques";
import { roundCoord } from "@/lib/constants";
import { CITIES, CITY_MAP } from "@/lib/cities";
import { MosqueIcon, MapPinIcon, SearchIcon } from "@/components/ui/Icons";
import CityCombobox from "@/components/ui/CityCombobox";

function NavigationIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CrosshairIcon({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}

function getCoordsFromCityName(cityName: string): { lat: number; lng: number } | null {
  const norm = cityName.toUpperCase().trim();
  const city = CITY_MAP.get(norm);
  return city ? { lat: city.lat, lng: city.lng } : null;
}

// --- Cache utilities ---
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lng: number, radius: number): string {
  const snapLat = lat.toFixed(2);
  const snapLng = lng.toFixed(2);
  return `mosques_${snapLat}_${snapLng}_r${radius}`;
}

function getCached(key: string): Mosque[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key: string, data: Mosque[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full or unavailable
  }
}

// --- Accuracy display ---
function AccuracyBadge({ accuracy }: { accuracy: number }) {
  let color: string;
  let label: string;
  if (accuracy <= 50) {
    color = "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
    label = `GPS akurat ±${Math.round(accuracy)}m`;
  } else if (accuracy <= 300) {
    color = "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30";
    label = `Akurasi sedang ±${Math.round(accuracy)}m`;
  } else {
    color = "text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/30";
    label = `Akurasi rendah ±${Math.round(accuracy)}m`;
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

export default function MosqueFinder() {
  const location = useStore((s) => s.location);
  const userCoords = useStore((s) => s.userCoords);
  const setUserCoords = useStore((s) => s.setUserCoords);
  const isOffline = useStore((s) => s.isOffline);

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // Where to search: the GPS position in the store, else the selected city's centre.
  // A city picked in the search box below wins until either of those changes.
  const basisKey = `${userCoords ? `${userCoords.lat},${userCoords.lng}` : "-"}|${location.cityName}`;
  const [pickedCity, setPickedCity] = useState<{ basisKey: string; coords: { lat: number; lng: number } } | null>(null);
  const picked = pickedCity?.basisKey === basisKey ? pickedCity.coords : null;
  const coords = useMemo(
    () => picked ?? userCoords ?? getCoordsFromCityName(location.cityName),
    [picked, userCoords, location.cityName]
  );
  const isGps = !picked && !!userCoords;

  // "Perluas Pencarian" applies to the place it was used for
  const coordsKey = coords ? `${coords.lat},${coords.lng}` : "";
  const [radiusChoice, setRadiusChoice] = useState<{ coordsKey: string; radius: number } | null>(null);
  const customRadius = radiusChoice?.coordsKey === coordsKey ? radiusChoice.radius : null;

  // Track the coords, accuracy, radius, and source of the last fetch
  const lastFetchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchAccuracyRef = useRef<number | null>(null);
  const lastFetchRadiusRef = useRef<number | null>(null);
  const lastFetchWasGpsRef = useRef(false);
  // Only the newest search may show its result
  const fetchIdRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Search the local city table (500+ entries — fast enough to filter on every keystroke)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (q.length < 2) return [];
    const results: typeof CITIES = [];
    for (let i = 0; i < CITIES.length; i++) {
      if (CITIES[i].name.includes(q)) {
        results.push(CITIES[i]);
        if (results.length === 8) break;
      }
    }
    return results;
  }, [searchQuery]);

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      settledRef.current = true;
    };
  }, []);

  // Settle uses ref flag + clears both timer and watch atomically
  const cancelGps = useCallback(() => {
    settledRef.current = true;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (settleTimerRef.current !== null) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    setDetecting(false);
  }, []);

  const detectGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Perangkat tidak mendukung GPS.");
      return;
    }

    // Cancel any existing watch first
    cancelGps();

    setDetecting(true);
    setGpsError(null);
    settledRef.current = false;

    const settle = () => {
      if (settledRef.current) return;
      cancelGps(); // cancelGps now sets settledRef.current = true
    };

    // Auto-stop after 15 seconds
    settleTimerRef.current = setTimeout(settle, 15000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Ignore callbacks after settled
        if (settledRef.current) return;

        const posAccuracy = pos.coords.accuracy;
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Update UI progressively (but don't trigger fetch yet — detecting is true)
        setUserCoords(newCoords);
        setAccuracy(posAccuracy);
        setGpsError(null);

        // Stop when accuracy is good enough — settle sets detecting=false, which triggers fetch
        if (posAccuracy <= 100) {
          settle();
        }
      },
      (err) => {
        // Ignore error callbacks after settled (e.g. timer already fired)
        if (settledRef.current) return;
        settle();
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("Izin lokasi ditolak. Buka pengaturan browser atau gunakan pencarian kota di bawah.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError("Lokasi tidak tersedia. Pastikan GPS aktif.");
        } else {
          setGpsError("Gagal mendeteksi lokasi. Coba lagi.");
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }, [setUserCoords, cancelGps]);

  const handleSelectCity = (city: (typeof CITIES)[number]) => {
    setPickedCity({ basisKey, coords: { lat: city.lat, lng: city.lng } });
    setAccuracy(null);
    setSearchQuery("");
  };

  // fetchMosques takes all needed params explicitly, no dependency on changing state
  const fetchMosques = useCallback(async (
    targetCoords: { lat: number; lng: number },
    currentAccuracy: number | null,
    forceRefresh?: boolean,
    gpsSource?: boolean,
    radiusOverride?: number,
  ) => {
    // Any newer search makes this one's result stale
    const fetchId = ++fetchIdRef.current;
    const isCurrent = () => fetchId === fetchIdRef.current;

    if (isOffline) {
      setLoading(false);
      setError("Anda sedang offline. Periksa koneksi internet Anda.");
      return;
    }

    const radius = radiusOverride || getSearchRadius(currentAccuracy);
    const cacheKey = getCacheKey(targetCoords.lat, targetCoords.lng, radius);
    const radiusLabel = radius >= 1000 ? `${radius / 1000} km` : `${radius} m`;
    const remember = () => {
      lastFetchCoordsRef.current = targetCoords;
      lastFetchAccuracyRef.current = currentAccuracy;
      lastFetchRadiusRef.current = radius;
      lastFetchWasGpsRef.current = !!gpsSource;
    };

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCached(cacheKey);
      if (cached) {
        // The cache is shared by positions up to ~1 km apart: measure from this one
        const results = cached
          .map((m) => ({ ...m, distance: haversineDistance(targetCoords.lat, targetCoords.lng, m.lat, m.lng) }))
          .sort((a, b) => a.distance - b.distance);
        setMosques(results);
        setError(results.length === 0 ? `Tidak ada masjid ditemukan dalam radius ${radiusLabel}. Coba perbesar radius atau pindah lokasi.` : null);
        setLoading(false);
        remember();
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Rounded coords match the server's precision so nearby users hit the same CDN entry
      const url = `/api/mosques?lat=${roundCoord(targetCoords.lat)}&lng=${roundCoord(targetCoords.lng)}&radius=${radius}`;
      let res: Response | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await fetch(url);
        if (!isCurrent()) return;
        if (res.ok || res.status < 500) break;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        if (!isCurrent()) return;
      }
      if (!res || !res.ok) {
        const status = res?.status ?? 0;
        setError(status === 502
          ? "Layanan pencarian masjid sedang sibuk. Coba lagi beberapa saat."
          : status === 429
            ? "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi."
            : "Server sedang bermasalah. Coba lagi nanti.");
        return;
      }
      const data = await res.json();
      if (!isCurrent()) return;

      if (data.status && data.data) {
        // Server distances use rounded coords — recompute from the exact position
        const results: Mosque[] = (data.data as Mosque[])
          .map((m) => ({ ...m, distance: haversineDistance(targetCoords.lat, targetCoords.lng, m.lat, m.lng) }))
          .sort((a, b) => a.distance - b.distance);
        setMosques(results);
        setCache(cacheKey, results);
        remember();
        if (results.length === 0) {
          // Distinct "no results" message
          setError(`Tidak ada masjid ditemukan dalam radius ${radiusLabel}. Coba perbesar radius atau pindah lokasi.`);
        }
      } else {
        // Distinct "API error" message
        setError(data.error || "Server gagal memuat data masjid. Coba tekan Muat Ulang.");
      }
    } catch {
      // Distinct "network error" message
      if (isCurrent()) setError("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [isOffline]);

  const radius = customRadius || getSearchRadius(accuracy);
  const MAX_RADIUS = 10000;

  // Auto-fetch when coords change, but defer during GPS detection to avoid fetching with inaccurate coords.
  // Refetch if: position moved >200m OR accuracy improved significantly OR switching from city→GPS.
  useEffect(() => {
    if (!coords) return;

    // While GPS is still detecting, don't fetch yet — wait for settle or good accuracy
    if (detecting) return;

    // Force refetch when transitioning from city fallback to GPS (bypass distance/cache checks)
    const switchingToGps = isGps && !lastFetchWasGpsRef.current && lastFetchCoordsRef.current !== null;

    if (lastFetchCoordsRef.current && !switchingToGps) {
      const dist = haversineDistance(
        lastFetchCoordsRef.current.lat, lastFetchCoordsRef.current.lng,
        coords.lat, coords.lng
      );
      const prevAccuracy = lastFetchAccuracyRef.current;
      const accuracyImproved = prevAccuracy !== null && accuracy !== null && accuracy < prevAccuracy * 0.5;
      const radiusChanged = radius !== lastFetchRadiusRef.current;

      // Skip fetch if position didn't move much AND accuracy didn't improve significantly
      if (dist < 200 && !accuracyImproved && !radiusChanged) return;
    }

    fetchMosques(coords, accuracy, switchingToGps, isGps, radius);
  }, [coords, accuracy, detecting, isGps, radius, fetchMosques]);

  const googleMapsSearchUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=masjid&center=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=masjid`;

  // Searching the wider radius is left to the effect above
  const handleExpandRadius = () => {
    if (!coords) return;
    setRadiusChoice({ coordsKey, radius: Math.min(radius * 2, MAX_RADIUS) });
  };

  // "Muat Ulang" and "Coba Lagi" search again with the radius on screen
  const refetch = () => {
    if (coords) fetchMosques(coords, accuracy, true, isGps, radius);
  };

  return (
    <div className="space-y-3">
      {/* Header + Controls */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MosqueIcon size={18} className="text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Masjid Terdekat
            </h2>
          </div>
          {coords && !loading && (
            <button
              type="button"
              onClick={refetch}
              aria-label="Muat ulang daftar masjid"
              className="focus-ring min-h-11 cursor-pointer rounded-lg px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              Muat Ulang
            </button>
          )}
        </div>

        {/* GPS detect / cancel button */}
        {detecting ? (
          <div className="mb-3 flex gap-2">
            <div role="status" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">
              <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Mendeteksi lokasi...
            </div>
            <button
              type="button"
              onClick={cancelGps}
              aria-label="Batal mendeteksi lokasi"
              className="focus-ring min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={detectGps}
            className="focus-ring mb-3 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            <CrosshairIcon size={14} />
            {isGps ? "Perbarui Lokasi GPS" : "Gunakan Lokasi GPS"}
          </button>
        )}

        {gpsError && (
          <p role="alert" className="mb-3 text-xs text-red-700 dark:text-red-300">{gpsError}</p>
        )}

        {/* Search input — this and the location below are masked in Clarity recordings */}
        <div data-clarity-mask="True" className="mb-3">
          <CityCombobox
            label="Cari kota untuk lokasi masjid"
            placeholder="Cari kota untuk lokasi masjid..."
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            getKey={(city) => city.name}
            getLabel={(city) => city.name}
            onSelect={handleSelectCity}
          />
        </div>

        {/* Location info */}
        <div data-clarity-mask="True" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <MapPinIcon size={12} />
          <span>
            {isGps ? (
              <>Lokasi GPS ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})</>
            ) : (
              <>Perkiraan lokasi: {location.cityName}</>
            )}
          </span>
        </div>

        {/* Accuracy badge */}
        {isGps && accuracy !== null && (
          <div className="mt-1.5 flex items-center gap-2">
            <AccuracyBadge accuracy={accuracy} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Radius: {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
            </span>
          </div>
        )}

        {!isGps && coords && (
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
            Aktifkan GPS untuk hasil yang lebih akurat.
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div role="status" aria-label="Memuat daftar masjid" className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Stale data warning — shown when refresh failed but old results still available */}
      {!loading && error && mosques.length > 0 && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Gagal memperbarui data. Menampilkan hasil sebelumnya.
          </p>
          {coords && (
            <button
              type="button"
              onClick={refetch}
              aria-label="Coba lagi memperbarui daftar masjid"
              className="focus-ring min-h-11 cursor-pointer rounded-lg px-3 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {!loading && error && mosques.length === 0 && (
        <div role="alert" className="rounded-2xl border border-slate-100 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <MosqueIcon size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          {coords && (
            <button
              type="button"
              onClick={refetch}
              aria-label="Coba lagi mencari masjid"
              className="focus-ring mt-3 min-h-11 cursor-pointer rounded-lg bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Mosque list — nearby mosques reveal the user's area, so masked in Clarity recordings */}
      {!loading && mosques.length > 0 && (
        <div data-clarity-mask="True" className="space-y-2">
          {mosques.map((mosque, i) => (
            <div
              key={mosque.id}
              className="animate-fade-in rounded-xl border border-slate-100 bg-white px-4 py-3 transition-colors hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">
                      {mosque.name}
                    </h3>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      mosque.type === "musholla"
                        ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}>
                      {mosque.type === "musholla" ? "Musholla" : "Masjid"}
                    </span>
                  </div>
                  {mosque.address && (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {mosque.address}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {formatDistance(mosque.distance)}
                </span>
              </div>
              <div className="mt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Navigasi ke ${mosque.name} (buka Google Maps di tab baru)`}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                >
                  <NavigationIcon size={12} />
                  Navigasi
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expand radius button — shown when results are few and radius can be increased */}
      {!loading && coords && mosques.length < 5 && radius < MAX_RADIUS && (
        <button
          type="button"
          onClick={handleExpandRadius}
          className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 py-3 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50"
        >
          <SearchIcon size={14} />
          Perluas Pencarian ({radius >= 1000 ? `${radius / 1000} km` : `${radius} m`} → {Math.min(radius * 2, MAX_RADIUS) >= 1000 ? `${Math.min(radius * 2, MAX_RADIUS) / 1000} km` : `${Math.min(radius * 2, MAX_RADIUS)} m`})
        </button>
      )}

      {/* Google Maps fallback */}
      {!loading && (
        <a
          href={googleMapsSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-4 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
        >
          <ExternalLinkIcon size={14} />
          Cari lebih banyak di Google Maps
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      )}
    </div>
  );
}
