"use client";

import { useMemo, useState } from "react";
import { formatRadius } from "@/lib/mosques";
import { CITIES, type CityCoord } from "@/lib/cities";
import { MapPinIcon, MosqueIcon } from "@/components/ui/Icons";
import { CrosshairIcon } from "./icons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import CityCombobox from "@/components/ui/CityCombobox";

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  const meters = Math.round(accuracy);
  if (accuracy <= 50) return <Badge tone="accent">GPS akurat ±{meters}m</Badge>;
  if (accuracy <= 300) return <Badge tone="warning">Akurasi sedang ±{meters}m</Badge>;
  return <Badge tone="danger">Akurasi rendah ±{meters}m</Badge>;
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
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MosqueIcon size={20} className="text-accent-fg" />
          <h2 className="text-base font-bold text-fg">Masjid Terdekat</h2>
        </div>
        {coords && !loading && (
          <Button variant="soft" onClick={onRefresh} aria-label="Muat ulang daftar masjid">
            Muat Ulang
          </Button>
        )}
      </div>

      {/* GPS detect / cancel button */}
      {watching ? (
        <div className="mb-3 flex gap-2">
          <div role="status" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent">
            <Spinner size="sm" />
            Mendeteksi lokasi…
          </div>
          <Button variant="secondary" onClick={onStopGps} aria-label="Batal mendeteksi lokasi">
            Batal
          </Button>
        </div>
      ) : (
        <Button onClick={onStartGps} className="mb-3 w-full">
          <CrosshairIcon size={16} />
          {isGps ? "Perbarui Lokasi GPS" : "Gunakan Lokasi GPS"}
        </Button>
      )}

      {gpsError && (
        <p role="alert" className="mb-3 text-xs text-danger">{gpsError}</p>
      )}

      {/* Search input — this and the location below are masked in Clarity recordings */}
      <div data-clarity-mask="True" className="mb-3">
        <CityCombobox
          label="Cari kota untuk lokasi masjid"
          placeholder="Cari kota untuk lokasi masjid…"
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

      {/* Where the search is; the coordinates themselves aren't worth showing */}
      <p data-clarity-mask="True" className="flex items-center gap-1.5 text-xs text-fg-subtle">
        <MapPinIcon size={14} />
        {isGps ? "Lokasi GPS Anda" : `Perkiraan lokasi: ${cityName}`}
      </p>

      {isGps && accuracy !== null && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AccuracyBadge accuracy={accuracy} />
          <span className="text-xs text-fg-subtle">Radius: {formatRadius(radius)}</span>
        </div>
      )}

      {!isGps && coords && (
        <p className="mt-2 text-xs text-warning">Aktifkan GPS untuk hasil yang lebih akurat.</p>
      )}
    </Card>
  );
}
