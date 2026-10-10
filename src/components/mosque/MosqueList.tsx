"use client";

import { useState } from "react";
import type { Mosque } from "@/types";
import { formatDistance, formatRadius } from "@/lib/mosques";
import { MEDIUM_M, SHARP_M, atPlace } from "@/lib/geofix";
import { NEAR_PLACE_M } from "@/lib/mosque-contrib";
import { roundCoord } from "@/lib/constants";
import { MOSQUE_MESSAGES } from "@/lib/mosque-messages";
import { MosqueIcon } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import Button, { buttonClass } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ExternalLinkIcon, NavigationIcon } from "./icons";
import SuggestPlace from "./SuggestPlace";

/** Results shown at first, and added by each "Tampilkan lebih banyak" */
const PAGE = 20;

/**
 * The search's outcome — loading, a failure, the mosques — and the ways to search further.
 * Rendered as siblings of the controls card (the page spaces them evenly).
 */
export default function MosqueList({ mosques, loading, error, coords, accuracy, suggestions, onRetry }: {
  /** Nearest first */
  mosques: Mosque[];
  loading: boolean;
  error: string | null;
  /** Where the search is; null when no place is known yet */
  coords: { lat: number; lng: number } | null;
  /** How well that position is known (m) when it is the GPS position, else null */
  accuracy: number | null;
  /** The server takes suggestions, and the position is the user's own */
  suggestions: boolean;
  onRetry: () => void;
}) {
  const [shown, setShown] = useState(PAGE);
  // Suggesting the place the user stands at: the form is open, or one was sent from here
  const [suggesting, setSuggesting] = useState(false);
  const [suggested, setSuggested] = useState(false);
  // Only from a sharp fix with nothing listed within NEAR_PLACE_M of it (nearest first)
  const canSuggest =
    suggestions && !suggested && coords !== null && accuracy !== null && accuracy <= SHARP_M &&
    (mosques.length === 0 || mosques[0].distance > NEAR_PLACE_M);

  // Links to other sites carry the position rounded to ~110 m, like the search itself
  const at = coords ? `${roundCoord(coords.lat)},${roundCoord(coords.lng)}` : null;
  const mapsUrl = at
    ? `https://www.google.com/maps/search/masjid/@${at},16z`
    : "https://www.google.com/maps/search/?api=1&query=masjid";
  const noteUrl = coords
    ? `https://www.openstreetmap.org/note/new#map=18/${roundCoord(coords.lat)}/${roundCoord(coords.lng)}`
    : null;

  return (
    <>
      {/* Loading state: shaped like the results it waits for */}
      {loading && (
        <div role="status" aria-label="Memuat daftar masjid" className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-11 w-28 rounded-control" />
            </Card>
          ))}
        </div>
      )}

      {/* Refreshing failed, but the earlier results are still there */}
      {!loading && error && mosques.length > 0 && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-tile bg-warning-soft px-3 py-2 ring-1 ring-warning/30">
          <p className="text-xs text-warning">{MOSQUE_MESSAGES.stale}</p>
          {coords && (
            <Button variant="ghost" onClick={onRetry} aria-label="Coba lagi memperbarui daftar masjid">
              Coba Lagi
            </Button>
          )}
        </div>
      )}

      {/* Error state */}
      {!loading && error && mosques.length === 0 && (
        <Card role="alert" className="p-6 text-center">
          <MosqueIcon size={24} className="mx-auto mb-2 text-fg-subtle" />
          <p className="text-sm text-fg-muted">{error}</p>
          {coords && (
            <Button variant="soft" onClick={onRetry} aria-label="Coba lagi mencari masjid" className="mt-3">
              Coba Lagi
            </Button>
          )}
        </Card>
      )}

      {/* Mosque list — nearby mosques reveal the user's area, so masked in Clarity recordings */}
      {!loading && mosques.length > 0 && (
        <ul data-clarity-mask="True" className="space-y-2">
          {mosques.slice(0, shown).map((mosque) => (
            <li key={mosque.id}>
              <Card className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-fg">{mosque.name}</h3>
                      <Badge tone={mosque.type === "musholla" ? "neutral" : "accent"}>
                        {mosque.type === "musholla" ? "Musholla" : "Masjid"}
                      </Badge>
                      {/* Suggested by a user of the app and checked by hand, not from a map */}
                      {mosque.id.startsWith("c") && <Badge tone="neutral">Usulan pengguna</Badge>}
                    </div>
                    {mosque.address && <p className="mt-0.5 truncate text-xs text-fg-subtle">{mosque.address}</p>}
                  </div>
                  <Badge tone="accent" className="text-xs tabular-nums">
                    {accuracy !== null && atPlace(mosque.distance, accuracy) ? "Di lokasi Anda" : formatDistance(mosque.distance, accuracy ?? 0)}
                  </Badge>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Navigasi ke ${mosque.name} (buka Google Maps di tab baru)`}
                  className={cx(buttonClass("soft"), "mt-2")}
                >
                  <NavigationIcon size={14} />
                  Navigasi
                </a>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {!loading && mosques.length > shown && (
        <Button variant="secondary" onClick={() => setShown(shown + PAGE)} className="w-full">
          Tampilkan lebih banyak ({mosques.length - shown} lagi)
        </Button>
      )}

      {!loading && (
        // The links carry the area searched: masked in Clarity recordings
        <div data-clarity-mask="True" className="space-y-3">
          {/* Google Maps fallback */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring flex min-h-11 items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface py-4 text-sm font-semibold text-fg-muted transition-colors hover:text-accent-fg"
          >
            <ExternalLinkIcon size={16} />
            Cari lebih banyak di Google Maps
            <span className="sr-only"> (buka di tab baru)</span>
          </a>

          {/* Open until the user closes it, thank-you included; only the way in depends on canSuggest */}
          {suggesting && coords !== null && accuracy !== null && (
            <SuggestPlace coords={coords} accuracy={accuracy} onSent={() => setSuggested(true)} onClose={() => setSuggesting(false)} />
          )}

          {/* The data's sources (their licenses ask for this), and a way to add what they lack */}
          <p className="text-center text-xs leading-relaxed text-fg-subtle">
            {mosques.length > 0 &&
              (accuracy !== null && accuracy > MEDIUM_M
                ? `Jarak hanya kira-kira: diukur dalam garis lurus dari posisi ±${formatRadius(accuracy)}. `
                : "Jarak diukur dalam garis lurus. ")}
            Data ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-fg">
              kontributor OpenStreetMap
              <span className="sr-only"> (buka di tab baru)</span>
            </a>{" "}
            dan{" "}
            <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-fg">
              Overture Maps Foundation
              <span className="sr-only"> (buka di tab baru)</span>
            </a>
            , serta usulan pengguna aplikasi ini
            {noteUrl && (
              <>
                .{" "}Ada yang belum tercantum?{" "}
                {canSuggest && !suggesting && (
                  <>
                    <button type="button" onClick={() => setSuggesting(true)} className="focus-ring cursor-pointer underline hover:text-accent-fg">
                      Tambahkan di sini
                    </button>{" "}
                    atau{" "}
                  </>
                )}
                <a href={noteUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-fg">
                  {canSuggest && !suggesting ? "laporkan di OpenStreetMap" : "Laporkan di OpenStreetMap"}
                  <span className="sr-only"> (buka di tab baru)</span>
                </a>
              </>
            )}
          </p>
        </div>
      )}
    </>
  );
}
