"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Location } from "@/types";
import { searchCities } from "@/lib/api";
import { cityDate, monthKey } from "@/lib/city-time";
import { useStore } from "@/store/useStore";
import CityCombobox from "@/components/ui/CityCombobox";
import { detectAndUpdateLocation } from "@/lib/detect-location";

export default function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [promptError, setPromptError] = useState("");
  const promptButtonRef = useRef<HTMLButtonElement>(null);

  const location = useStore((s) => s.location);
  const showLocationPrompt = useStore((s) => s.locationPrompt);
  const setLocationPrompt = useStore((s) => s.setLocationPrompt);
  const loadCitySchedule = useStore((s) => s.loadCitySchedule);
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

  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    setPromptError("");
    const result = await detectAndUpdateLocation();
    setIsDetecting(false);
    if (result.success || result.superseded) {
      setLocationPrompt(false);
    } else {
      // Keep the prompt open and explain — the schedule already on screen stays usable
      const reason = (result.error || "Lokasi tidak dapat dideteksi").replace(/\.+$/, "");
      setPromptError(
        result.error?.includes("ditolak")
          ? "Izin lokasi ditolak. Ketik nama kotamu di kolom pencarian."
          : `${reason}. Ketik nama kotamu di kolom pencarian.`
      );
    }
  }, [setLocationPrompt]);

  // Move focus into the prompt when it appears so keyboard and screen reader users find it
  useEffect(() => {
    if (showLocationPrompt) promptButtonRef.current?.focus();
  }, [showLocationPrompt]);

  // Load the city restored from cache by the page's hydrateFromCache() (or the default
  // city). Layout effects run before this passive effect, so the store already holds it.
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const { location: current } = useStore.getState();
    loadCitySchedule({ id: current.cityId, lokasi: current.cityName, daerah: current.province });
  }, [loadCitySchedule]);

  // Reload when the month changes in the city's time zone: checked hourly, and whenever
  // the app comes back to the foreground (timers are suspended while a phone is locked).
  useEffect(() => {
    const currentMonth = () => {
      const { location: current, timeOffset } = useStore.getState();
      const today = cityDate(Date.now() + timeOffset, current.timezone);
      return monthKey(today.year, today.month);
    };
    let lastMonth = currentMonth();
    const checkMonth = () => {
      const month = currentMonth();
      if (month === lastMonth) return;
      lastMonth = month;
      const { location: current } = useStore.getState();
      loadCitySchedule({ id: current.cityId, lokasi: current.cityName, daerah: current.province });
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
  }, [loadCitySchedule]);

  // Typing updates the "searching" state right away; the debounced request below fills results
  const handleQueryChange = (value: string) => {
    setQuery(value);
    const searchable = value.trim().length >= 2;
    if (!searchable) setResults([]);
    setIsSearching(searchable);
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await searchCities(q, controller.signal);
        if (!controller.signal.aborted) setResults(res.status && res.data ? res.data : []);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (city: Location) => {
    handleQueryChange("");
    setLocationPrompt(false);
    try {
      localStorage.setItem("selectedLocation", JSON.stringify(city));
      localStorage.removeItem("detectedKecamatan"); // clean up legacy key
    } catch (e) {
      console.warn("Failed to save selected location", e);
    }
    loadCitySchedule(city);
  };

  const handleDismissPrompt = () => {
    setLocationPrompt(false);
    try {
      localStorage.setItem("locationPermissionDismissed", String(Date.now()));
    } catch (e) {
      console.warn("Failed to save location dismissal", e);
    }
  };

  return (
    // The city search, its results and the prompt reveal where the user is: kept out of
    // Clarity session recordings
    <div data-clarity-mask="True" className="relative w-full max-w-[260px]">
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
        onQueryChange={handleQueryChange}
        results={results}
        getKey={(city) => city.id}
        getLabel={(city) => city.lokasi}
        onSelect={handleSelect}
        isSearching={isSearching}
      />
    </div>
  );
}
