"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Location } from "@/types";
import { searchCities } from "@/lib/api";
import { useStore } from "@/store/useStore";
import CityCombobox from "@/components/ui/CityCombobox";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { MapPinIcon } from "@/components/ui/Icons";
import { KEYS, writeJson, writeRaw } from "@/lib/storage";
import { MESSAGES, detectFailedMessage } from "@/lib/messages";

export default function LocationSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // The last search failed (network, server): not the same as "no such city"
  const [searchFailed, setSearchFailed] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [promptError, setPromptError] = useState("");
  const promptButtonRef = useRef<HTMLButtonElement>(null);

  const location = useStore((s) => s.location);
  const showLocationPrompt = useStore((s) => s.locationPrompt);
  const setLocationPrompt = useStore((s) => s.setLocationPrompt);
  const selectCity = useStore((s) => s.selectCity);

  const detectLocation = useCallback(async () => {
    setIsDetecting(true);
    setPromptError("");
    const result = await useStore.getState().detectCity();
    setIsDetecting(false);
    if (result.success || result.superseded) {
      setLocationPrompt(false);
    } else {
      // Keep the prompt open and explain — the schedule already on screen stays usable
      setPromptError(detectFailedMessage(result.error));
    }
  }, [setLocationPrompt]);

  // Move focus into the prompt when it appears so keyboard and screen reader users find it
  useEffect(() => {
    if (showLocationPrompt) promptButtonRef.current?.focus();
  }, [showLocationPrompt]);

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
        if (controller.signal.aborted) return;
        setResults(res.status && res.data ? res.data : []);
        setSearchFailed(false);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchFailed(true);
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
    writeJson(KEYS.location, city);
    selectCity(city);
  };

  const handleDismissPrompt = () => {
    setLocationPrompt(false);
    writeRaw(KEYS.locationPromptDismissed, String(Date.now()));
  };

  return (
    // The city search, its results and the prompt reveal where the user is: kept out of
    // Clarity session recordings
    <div data-clarity-mask="True" className="relative w-full">
      {/* Location permission prompt */}
      {showLocationPrompt && (
        <div
          role="dialog"
          aria-labelledby="location-prompt-title"
          aria-describedby="location-prompt-desc"
          onKeyDown={(e) => {
            if (e.key === "Escape") handleDismissPrompt();
          }}
          className="absolute inset-x-0 top-full z-50 mt-2 rounded-card border border-border bg-surface p-4 shadow-xl sm:left-auto sm:w-80"
        >
          <div className="mb-2 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-fg">
              <MapPinIcon size={16} />
            </span>
            <div>
              <p id="location-prompt-title" className="text-sm font-semibold text-fg">
                Gunakan lokasi Anda untuk menampilkan jadwal yang sesuai?
              </p>
              <p id="location-prompt-desc" className="mt-1 text-xs text-fg-muted">
                Saat ini menampilkan jadwal {location.cityName} sebagai contoh. Anda juga bisa mencari kota secara manual.
              </p>
            </div>
          </div>
          {promptError && (
            <p role="alert" className="mb-2 text-xs font-medium text-danger">
              {promptError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button ref={promptButtonRef} onClick={detectLocation} disabled={isDetecting} className="flex-1">
              {isDetecting ? (
                <>
                  <Spinner size="sm" />
                  Mendeteksi…
                </>
              ) : promptError ? (
                "Coba Lagi"
              ) : (
                "Gunakan Lokasi"
              )}
            </Button>
            <Button variant="ghost" onClick={handleDismissPrompt}>
              {promptError ? "Tutup" : "Nanti"}
            </Button>
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
        emptyText={searchFailed ? MESSAGES.citySearchFailed : MESSAGES.cityNotFound}
      />
    </div>
  );
}
