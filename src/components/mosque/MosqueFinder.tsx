"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import { Mosque, formatDistance, getSearchRadius, haversineDistance } from "@/lib/mosques";
import { CITIES } from "@/lib/cities";
import { MosqueIcon, MapPinIcon, SearchIcon } from "@/components/ui/Icons";

function NavigationIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function CrosshairIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
  const city = CITIES.find((c) => c.name === norm);
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
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key: string, data: Mosque[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage full or unavailable
  }
}

// --- Accuracy display ---
function AccuracyBadge({ accuracy }: { accuracy: number }) {
  let color: string;
  let label: string;
  if (accuracy <= 50) {
    color = "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30";
    label = `GPS akurat ±${Math.round(accuracy)}m`;
  } else if (accuracy <= 300) {
    color = "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30";
    label = `WiFi ±${Math.round(accuracy)}m`;
  } else {
    color = "text-red-500 bg-red-50 dark:text-red-400 dark:bg-red-900/30";
    label = `Akurasi rendah ±${Math.round(accuracy)}m`;
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGps, setIsGps] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [customRadius, setCustomRadius] = useState<number | null>(null);

  // Track the coords, accuracy, and source of the last fetch
  const lastFetchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchAccuracyRef = useRef<number | null>(null);
  const lastFetchWasGpsRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settledRef = useRef<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof CITIES>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Initialize coords from store or city lookup
  useEffect(() => {
    if (userCoords) {
      setCoords(userCoords);
      setIsGps(true);
    } else {
      const cityCoords = getCoordsFromCityName(location.cityName);
      if (cityCoords) {
        setCoords(cityCoords);
        setIsGps(false);
      }
    }
  }, [userCoords, location.cityName]);

  // Search cities
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toUpperCase();
    const results = CITIES.filter((c) => c.name.includes(q)).slice(0, 8);
    setSearchResults(results);
  }, [searchQuery]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  // B3 fix: settle uses ref flag + clears both timer and watch atomically
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
        // B3 fix: ignore callbacks after settled
        if (settledRef.current) return;

        const posAccuracy = pos.coords.accuracy;
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Update UI progressively (but don't trigger fetch yet — detecting is true)
        setUserCoords(newCoords);
        setCoords(newCoords);
        setIsGps(true);
        setAccuracy(posAccuracy);
        setGpsError(null);

        // Stop when accuracy is good enough — settle sets detecting=false, which triggers fetch
        if (posAccuracy <= 100) {
          settle();
        }
      },
      (err) => {
        // B3 fix: ignore error callbacks after settled (e.g. timer already fired)
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
    setCoords({ lat: city.lat, lng: city.lng });
    setIsGps(false);
    setAccuracy(null);
    setCustomRadius(null);
    setSearchQuery("");
    setShowSearch(false);
  };

  // B2 fix: fetchMosques takes all needed params explicitly, no dependency on changing state
  const fetchMosques = useCallback(async (
    targetCoords: { lat: number; lng: number },
    currentAccuracy: number | null,
    forceRefresh?: boolean,
    gpsSource?: boolean,
    radiusOverride?: number,
  ) => {
    if (isOffline) {
      setError("Anda sedang offline. Periksa koneksi internet Anda.");
      return;
    }

    const radius = radiusOverride || getSearchRadius(currentAccuracy);
    const cacheKey = getCacheKey(targetCoords.lat, targetCoords.lng, radius);
    const radiusLabel = radius >= 1000 ? `${radius / 1000} km` : `${radius} m`;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCached(cacheKey);
      if (cached) {
        setMosques(cached);
        setError(cached.length === 0 ? `Tidak ada masjid ditemukan dalam radius ${radiusLabel}. Coba perbesar radius atau pindah lokasi.` : null);
        lastFetchCoordsRef.current = targetCoords;
        lastFetchAccuracyRef.current = currentAccuracy;
        lastFetchWasGpsRef.current = !!gpsSource;
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/mosques?lat=${targetCoords.lat}&lng=${targetCoords.lng}&radius=${radius}`);
      if (!res.ok) {
        setError(`Server error (${res.status}). Coba lagi nanti.`);
        return;
      }
      const data = await res.json();

      if (data.status && data.data) {
        setMosques(data.data);
        setCache(cacheKey, data.data);
        lastFetchCoordsRef.current = targetCoords;
        lastFetchAccuracyRef.current = currentAccuracy;
        lastFetchWasGpsRef.current = !!gpsSource;
        if (data.data.length === 0) {
          setError(`Tidak ada masjid ditemukan dalam radius ${radiusLabel}. Coba perbesar radius atau pindah lokasi.`);
        }
      } else {
        setError(data.error || "Server gagal memuat data masjid. Coba tekan Refresh.");
      }
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [isOffline]);

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
      const radiusChanged = getSearchRadius(accuracy) !== getSearchRadius(prevAccuracy);

      // Skip fetch if position didn't move much AND accuracy didn't improve significantly
      if (dist < 200 && !accuracyImproved && !radiusChanged) return;
    }

    fetchMosques(coords, accuracy, switchingToGps, isGps);
  }, [coords, accuracy, detecting, isGps, fetchMosques]);

  const googleMapsSearchUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=masjid&center=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=masjid`;

  const radius = customRadius || getSearchRadius(accuracy);
  const MAX_RADIUS = 10000;

  const handleExpandRadius = () => {
    if (!coords) return;
    const newRadius = Math.min(radius * 2, MAX_RADIUS);
    setCustomRadius(newRadius);
    fetchMosques(coords, accuracy, true, isGps, newRadius);
  };

  return (
    <div className="space-y-3">
      {/* Header + Controls */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MosqueIcon size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Masjid Terdekat
            </h2>
          </div>
          {coords && !loading && (
            <button
              type="button"
              onClick={() => fetchMosques(coords, accuracy, true, isGps)}
              className="cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              Refresh
            </button>
          )}
        </div>

        {/* GPS detect / cancel button — U1 fix */}
        {detecting ? (
          <div className="mb-3 flex gap-2">
            <div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Mendeteksi lokasi...
            </div>
            <button
              type="button"
              onClick={cancelGps}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={detectGps}
            className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            <CrosshairIcon size={14} />
            {isGps ? "Perbarui Lokasi GPS" : "Gunakan Lokasi GPS"}
          </button>
        )}

        {gpsError && (
          <p className="mb-3 text-[11px] text-red-500 dark:text-red-400">{gpsError}</p>
        )}

        {/* Search input */}
        <div ref={searchRef} className="relative mb-3">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            placeholder="Cari kota untuk lokasi masjid..."
            className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 py-2.5 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
          />
          {showSearch && searchResults.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-100 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              {searchResults.map((city) => (
                <li key={city.name}>
                  <button
                    type="button"
                    onClick={() => handleSelectCity(city)}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                  >
                    <MapPinIcon size={12} className="shrink-0 text-slate-300 dark:text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {city.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Location info */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
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
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Radius: {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
            </span>
          </div>
        )}

        {!isGps && coords && (
          <p className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
            Aktifkan GPS untuk hasil yang lebih akurat.
          </p>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && mosques.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <MosqueIcon size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
          {coords && (
            <button
              type="button"
              onClick={() => fetchMosques(coords, accuracy, true, isGps)}
              className="mt-3 cursor-pointer rounded-lg bg-emerald-50 px-4 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Mosque list */}
      {!loading && mosques.length > 0 && (
        <div className="space-y-2">
          {mosques.map((mosque, i) => (
            <div
              key={mosque.id}
              className="animate-fade-in rounded-xl border border-slate-100 bg-white px-4 py-3 transition-colors hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-bold text-slate-800 dark:text-white">
                    {mosque.name}
                  </h3>
                  {mosque.address && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-400 dark:text-slate-500">
                      {mosque.address}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {formatDistance(mosque.distance)}
                </span>
              </div>
              <div className="mt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
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
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 py-3 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50"
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
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-4 text-xs font-semibold text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
        >
          <ExternalLinkIcon size={14} />
          Cari lebih banyak di Google Maps
        </a>
      )}
    </div>
  );
}
