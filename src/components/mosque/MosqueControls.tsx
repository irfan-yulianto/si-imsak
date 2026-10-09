"use client";

import { useMemo, useState } from "react";
import { formatRadius } from "@/lib/mosques";
import { CITIES, type CityCoord } from "@/lib/cities";
import { MapPinIcon, MosqueIcon } from "@/components/ui/Icons";
import { CrosshairIcon } from "./icons";
import CityCombobox from "@/components/ui/CityCombobox";

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

/** Up to 8 cities of the local table whose name contains the query (fast enough per keystroke) */
function searchCityTable(query: string): CityCoord[] {
  const q = query.trim().toUpperCase();
  if (q.length < 2) return [];
  const results: CityCoord[] = [];
  for (let i = 0; i < CITIES.length; i++) {
    if (CITIES[i].name.includes(q)) {
      results.push(CITIES[i]);
      if (results.length === 8) break;
    }
  }
  return results;
}

/** The mosque finder's card: where it searches, and the ways to change that */
export default function MosqueControls({
  coords, isGps, accuracy, radius, cityName, loading, watching, gpsError, onRefresh, onStartGps, onStopGps, onPickCity,
}: {
  coords: { lat: number; lng: number } | null;
  /** The search is around the GPS position (not a city's centre) */
  isGps: boolean;
  accuracy: number | null;
  radius: number;
  /** The selected city, whose centre is the fallback */
  cityName: string;
  loading: boolean;
  /** The GPS is being read */
  watching: boolean;
  gpsError: string | null;
  onRefresh: () => void;
  onStartGps: () => void;
  onStopGps: () => void;
  onPickCity: (city: CityCoord) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCityTable(query), [query]);

  return (
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
            onClick={onRefresh}
            aria-label="Muat ulang daftar masjid"
            className="focus-ring min-h-11 cursor-pointer rounded-lg px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          >
            Muat Ulang
          </button>
        )}
      </div>

      {/* GPS detect / cancel button */}
      {watching ? (
        <div className="mb-3 flex gap-2">
          <div role="status" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">
            <span aria-hidden="true" className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Mendeteksi lokasi...
          </div>
          <button
            type="button"
            onClick={onStopGps}
            aria-label="Batal mendeteksi lokasi"
            className="focus-ring min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartGps}
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
          query={query}
          onQueryChange={setQuery}
          results={results}
          getKey={(city) => city.name}
          getLabel={(city) => city.name}
          onSelect={(city) => {
            onPickCity(city);
            setQuery("");
          }}
        />
      </div>

      {/* Location info */}
      <div data-clarity-mask="True" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <MapPinIcon size={12} />
        <span>
          {isGps ? (
            <>Lokasi GPS ({coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)})</>
          ) : (
            <>Perkiraan lokasi: {cityName}</>
          )}
        </span>
      </div>

      {/* Accuracy badge */}
      {isGps && accuracy !== null && (
        <div className="mt-1.5 flex items-center gap-2">
          <AccuracyBadge accuracy={accuracy} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Radius: {formatRadius(radius)}
          </span>
        </div>
      )}

      {!isGps && coords && (
        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
          Aktifkan GPS untuk hasil yang lebih akurat.
        </p>
      )}
    </div>
  );
}
