"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Location } from "@/types";
import { searchCities, getSchedule } from "@/lib/api";
import { getTimezone } from "@/lib/timezone";
import { useStore } from "@/store/useStore";
import CityCombobox from "@/components/ui/CityCombobox";
import { detectAndUpdateLocation } from "@/lib/detect-location";

export default function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [promptError, setPromptError] = useState("");
  const promptButtonRef = useRef<HTMLButtonElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const location = useStore((s) => s.location);
  const setLocation = useStore((s) => s.setLocation);
  const setSchedule = useStore((s) => s.setSchedule);
  const beginScheduleLoad = useStore((s) => s.beginScheduleLoad);
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
      beginScheduleLoad(cityId, now.getFullYear(), now.getMonth() + 1);
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
    [setLocation, setSchedule, beginScheduleLoad, setScheduleError, setViewMonth, setCountdownSchedule]
  );

  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    setPromptError("");
    const result = await detectAndUpdateLocation();
    setIsDetecting(false);
    if (result.success) {
      setShowLocationPrompt(false);
    } else {
      // Keep the prompt open and explain — the schedule already on screen stays usable
      setPromptError(
        result.error?.includes("ditolak")
          ? "Izin lokasi ditolak. Ketik nama kotamu di kolom pencarian."
          : `${result.error || "Lokasi tidak dapat dideteksi"}. Ketik nama kotamu di kolom pencarian.`
      );
    }
  }, []);

  // Move focus into the prompt when it appears so keyboard and screen reader users find it
  useEffect(() => {
    if (showLocationPrompt) promptButtonRef.current?.focus();
  }, [showLocationPrompt]);

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

  // Auto-refresh when the month changes: checked hourly, and whenever the app comes
  // back to the foreground (timers are suspended while a phone is locked).
  useEffect(() => {
    let lastMonth = new Date().getMonth();
    const checkMonth = () => {
      const currentMonth = new Date().getMonth();
      if (currentMonth === lastMonth) return;
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
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkMonth();
    };
    const interval = setInterval(checkMonth, 3600000); // 1 hour
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchSchedule]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    if (query.length < 2) {
      setResults([]);
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
        }
      } catch (err) {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  const handleSelect = (city: Location) => {
    setQuery("");
    setShowLocationPrompt(false);
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
    <div className="relative w-full max-w-[260px]">
      {/* Location permission prompt */}
      {showLocationPrompt && (
        <div
          role="dialog"
          aria-labelledby="location-prompt-title"
          aria-describedby="location-prompt-desc"
          onKeyDown={(e) => {
            if (e.key === "Escape") handleDismissPrompt();
          }}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-lg dark:border-emerald-800 dark:bg-emerald-950"
        >
          <p id="location-prompt-title" className="mb-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?
          </p>
          <p id="location-prompt-desc" className="mb-2 text-xs text-emerald-800 dark:text-emerald-200">
            Saat ini menampilkan jadwal {location.cityName} sebagai contoh. Anda juga bisa mencari kota secara manual.
          </p>
          {promptError && (
            <p role="alert" className="mb-2 text-xs font-medium text-red-700 dark:text-red-300">
              {promptError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              ref={promptButtonRef}
              type="button"
              onClick={detectLocation}
              disabled={isDetecting}
              className="focus-ring min-h-11 flex-1 cursor-pointer rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {isDetecting ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span aria-hidden="true" className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Mendeteksi...
                </span>
              ) : promptError ? (
                "Coba Lagi"
              ) : (
                "Gunakan Lokasi"
              )}
            </button>
            <button
              type="button"
              onClick={handleDismissPrompt}
              className="focus-ring min-h-11 cursor-pointer rounded-md px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-800/50"
            >
              {promptError ? "Tutup" : "Nanti"}
            </button>
          </div>
        </div>
      )}

      <CityCombobox
        variant="compact"
        label="Cari kota"
        placeholder="Cari kota"
        query={query}
        onQueryChange={setQuery}
        results={results}
        getKey={(city) => city.id}
        getLabel={(city) => city.lokasi}
        onSelect={handleSelect}
        isSearching={isSearching}
      />
    </div>
  );
}
