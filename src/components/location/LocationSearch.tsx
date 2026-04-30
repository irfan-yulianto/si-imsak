"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Location } from "@/types";
import { searchCities, getSchedule } from "@/lib/api";
import { getTimezone } from "@/lib/timezone";
import { useStore } from "@/store/useStore";
import { SearchIcon, MapPinIcon } from "@/components/ui/Icons";
import { detectAndUpdateLocation } from "@/lib/detect-location";

export default function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const location = useStore((s) => s.location);
  const setLocation = useStore((s) => s.setLocation);
  const setSchedule = useStore((s) => s.setSchedule);
  const setScheduleLoading = useStore((s) => s.setScheduleLoading);
  const setScheduleError = useStore((s) => s.setScheduleError);
  const setViewMonth = useStore((s) => s.setViewMonth);
  const setCountdownSchedule = useStore((s) => s.setCountdownSchedule);
  const setIsOffline = useStore((s) => s.setIsOffline);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [setIsOffline]);

  const fetchSchedule = useCallback(
    async (cityId: string, daerah: string, loc: Location) => {
      const now = new Date();
      setScheduleLoading(true);
      try {
        const res = await getSchedule(cityId, now.getFullYear(), now.getMonth() + 1);
        if (res.status && res.data?.jadwal) {
          const tz = getTimezone(res.data.daerah || daerah);
          setLocation({ ...loc, daerah: res.data.daerah || daerah }, tz);
          setSchedule(res.data.jadwal);
          setCountdownSchedule(res.data.jadwal);
          setViewMonth(now.getMonth() + 1, now.getFullYear());
        } else {
          setScheduleError("Data jadwal tidak tersedia");
        }
      } catch {
        setScheduleError(
          navigator.onLine
            ? "Gagal memuat jadwal. Coba lagi nanti."
            : "Anda sedang offline. Periksa koneksi internet Anda."
        );
      }
    },
    [setLocation, setSchedule, setScheduleLoading, setScheduleError, setViewMonth, setCountdownSchedule]
  );

  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    const result = await detectAndUpdateLocation();
    setIsDetecting(false);
    if (result.success) {
      setShowLocationPrompt(false);
    } else {
      setShowLocationPrompt(false);
      if (result.error?.includes("ditolak")) {
        setScheduleError("Izin lokasi ditolak. Gunakan pencarian manual di atas.");
      }
    }
  }, [setScheduleError]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const savedLocation = localStorage.getItem("selectedLocation");
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          // Validate saved data has required fields
          if (!parsed.id || !parsed.lokasi) {
            localStorage.removeItem("selectedLocation");
            // Fall through to default location below
          } else if (/^\d+$/.test(parsed.id)) {
            // Backward compat: detect old v2 numeric IDs and clear them
            localStorage.removeItem("selectedLocation");
            // Fall through to default location below
          } else {
            fetchSchedule(parsed.id, parsed.daerah || "", parsed);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse saved location", e);
          try {
            localStorage.removeItem("selectedLocation");
          } catch (e2) {
            console.warn("Failed to remove invalid selected location", e2);
          }
        }
      }

      // No saved location — show permission prompt (re-prompt after 7 days)
      const dismissed = localStorage.getItem("locationPermissionDismissed");
      if (!dismissed) {
        setShowLocationPrompt(true);
      } else {
        try {
          const dismissedAt = Number(dismissed);
          if (dismissedAt && Date.now() - dismissedAt > 7 * 24 * 3600000) {
            localStorage.removeItem("locationPermissionDismissed");
            setShowLocationPrompt(true);
          }
        } catch (e) {
          console.warn("Failed to process dismissed location prompt", e);
        }
      }
    } catch (e) {
      // localStorage unavailable (Safari private mode)
      console.warn("localStorage unavailable, showing location prompt", e);
      setShowLocationPrompt(true);
    }

    fetchSchedule(location.cityId, location.province, {
      id: location.cityId,
      lokasi: location.cityName,
      daerah: location.province,
    });
  }, [fetchSchedule, location.cityId, location.cityName, location.province]);

  // Auto-refresh: check every hour if month changed
  useEffect(() => {
    let lastMonth = new Date().getMonth();
    const interval = setInterval(() => {
      const currentMonth = new Date().getMonth();
      if (currentMonth !== lastMonth) {
        lastMonth = currentMonth;
        let savedLocation: string | null = null;
        try {
          savedLocation = localStorage.getItem("selectedLocation");
        } catch (e) {
          console.warn("Failed to get selected location for auto-refresh", e);
        }
        if (savedLocation) {
          try {
            const parsed = JSON.parse(savedLocation);
            if (parsed.id && parsed.lokasi) {
              fetchSchedule(parsed.id, parsed.daerah || "", parsed);
            }
          } catch (e) {
            console.warn("Failed to parse saved location for auto-refresh", e);
          }
        }
      }
    }, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await searchCities(query, controller.signal);
        if (!controller.signal.aborted) {
          const data = res.status && res.data ? res.data : [];
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([]);
          setIsOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (city: Location) => {
    setQuery("");
    setIsOpen(false);
    try {
      localStorage.setItem("selectedLocation", JSON.stringify(city));
      localStorage.removeItem("detectedKecamatan"); // clean up legacy key
    } catch (e) {
      console.warn("Failed to save selected location", e);
    }
    fetchSchedule(city.id, city.daerah || "", city);
  };

  const handleDismissPrompt = () => {
    setShowLocationPrompt(false);
    try {
      localStorage.setItem("locationPermissionDismissed", String(Date.now()));
    } catch (e) {
      console.warn("Failed to save location dismissal", e);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[260px]">
      {/* Location permission prompt */}
      {showLocationPrompt && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-lg dark:border-emerald-800 dark:bg-emerald-900/40">
          <p className="mb-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
            Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={detectLocation}
              disabled={isDetecting}
              className="flex-1 cursor-pointer rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isDetecting ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Mendeteksi...
                </span>
              ) : (
                "Gunakan Lokasi"
              )}
            </button>
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="cursor-pointer rounded-md px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-800/50"
            >
              Nanti
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              setQuery("");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Cari kota..."
          aria-label="Cari kota"
          className="w-full rounded-lg border border-slate-200/80 bg-slate-50/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 placeholder-slate-400 transition-all focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:border-slate-600/80 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-emerald-500 dark:focus:bg-slate-800"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}
      </div>

      {isOpen && (
        <ul className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-slate-100 bg-white py-1 shadow-xl shadow-black/[0.08] dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
          {results.length > 0 ? (
            results.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                >
                  <MapPinIcon size={14} className="shrink-0 text-slate-300 dark:text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {city.lokasi}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2.5 text-center text-xs text-slate-400 dark:text-slate-500">
              Kota tidak ditemukan
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
