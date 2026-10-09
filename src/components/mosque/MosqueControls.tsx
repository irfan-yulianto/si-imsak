"use client";

import { useMemo, useState } from "react";
import { cityCentreLabel } from "@/lib/mosque-messages";
import { CITIES, type CityCoord } from "@/lib/cities";
import type { GpsStatus } from "@/hooks/useGeolocationWatch";
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
  mode, placeName, accuracy, canRefresh, refreshing, gpsStatus, gpsError, onRefresh, onStartGps, onStopGps, onPickCity,
}: {
  /** Around the GPS position, a city picked here, or the selected city's centre */
  mode: "gps" | "picked" | "centre";
  /** The picked or selected city */
  placeName: string;
  /** The GPS fix's accuracy (m), when there is one */
  accuracy: number | null;
  canRefresh: boolean;
  /** A search is on its way while results are shown */
  refreshing: boolean;
  gpsStatus: GpsStatus;
  gpsError: string | null;
  onRefresh: () => void;
  onStartGps: () => void;
  onStopGps: () => void;
  onPickCity: (city: CityCoord) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCityTable(query), [query]);
  const watching = gpsStatus !== "idle";

  return (
    <Card className="p-4">
      <div className="mb-3 flex min-h-11 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MosqueIcon size={20} className="text-accent-fg" />
          <h2 className="text-base font-bold text-fg">Masjid Terdekat</h2>
        </div>
        {/* The same height either way, so the results below don't move */}
        {refreshing ? (
          <span role="status" className="flex items-center gap-2 px-2 text-xs text-fg-subtle">
            <Spinner size="sm" />
            Memperbarui…
          </span>
        ) : (
          canRefresh && (
            <Button variant="soft" onClick={onRefresh} aria-label="Muat ulang daftar masjid">
              Muat Ulang
            </Button>
          )
        )}
      </div>

      {/* GPS detect / cancel button */}
      {watching ? (
        <div className="mb-3 flex gap-2">
          <div role="status" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent">
            <Spinner size="sm" />
            {gpsStatus === "locating" ? "Mendeteksi lokasi…" : "Mempertajam lokasi…"}
          </div>
          <Button variant="secondary" onClick={onStopGps} aria-label="Batal mendeteksi lokasi">
            Batal
          </Button>
        </div>
      ) : (
        <Button onClick={onStartGps} className="mb-3 w-full">
          <CrosshairIcon size={16} />
          {mode === "gps" ? "Perbarui Lokasi GPS" : "Gunakan Lokasi GPS"}
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
      <p
        data-clarity-mask="True"
        className={`flex items-center gap-1.5 text-xs ${mode === "centre" ? "text-warning" : "text-fg-subtle"}`}
      >
        <MapPinIcon size={14} className="shrink-0" />
        {mode === "gps" ? "Lokasi GPS Anda" : cityCentreLabel(placeName, mode === "picked")}
      </p>

      {mode === "gps" && accuracy !== null && (
        <div className="mt-2">
          <AccuracyBadge accuracy={accuracy} />
        </div>
      )}
    </Card>
  );
}
