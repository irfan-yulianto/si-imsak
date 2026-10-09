"use client";

import type { Mosque } from "@/types";
import { formatDistance, formatRadius, MAX_SEARCH_RADIUS, widerRadius } from "@/lib/mosques";
import { MOSQUE_MESSAGES } from "@/lib/mosque-messages";
import { MosqueIcon, SearchIcon } from "@/components/ui/Icons";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import Button, { buttonClass } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { ExternalLinkIcon, NavigationIcon } from "./icons";

/**
 * The search's outcome — loading, a failure, the mosques — and the ways to search further.
 * Rendered as siblings of the controls card (the page spaces them evenly).
 */
export default function MosqueList({ mosques, loading, error, coords, radius, onRetry, onWiden }: {
  mosques: Mosque[];
  loading: boolean;
  error: string | null;
  /** Where the search is; null when no place is known yet */
  coords: { lat: number; lng: number } | null;
  radius: number;
  onRetry: () => void;
  onWiden: () => void;
}) {
  const mapsUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=masjid&center=${coords.lat},${coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=masjid`;

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
          {mosques.map((mosque) => (
            <li key={mosque.id}>
              <Card className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-fg">{mosque.name}</h3>
                      <Badge tone={mosque.type === "musholla" ? "neutral" : "accent"}>
                        {mosque.type === "musholla" ? "Musholla" : "Masjid"}
                      </Badge>
                    </div>
                    {mosque.address && <p className="mt-0.5 truncate text-xs text-fg-subtle">{mosque.address}</p>}
                  </div>
                  <Badge tone="accent" className="text-xs tabular-nums">
                    {formatDistance(mosque.distance)}
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

      {/* Few results, and the search can still widen */}
      {!loading && coords && mosques.length < 5 && radius < MAX_SEARCH_RADIUS && (
        <button
          type="button"
          onClick={onWiden}
          className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-accent/40 bg-accent-soft py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-soft-hover"
        >
          <SearchIcon size={16} />
          Perluas Pencarian ({formatRadius(radius)} → {formatRadius(widerRadius(radius))})
        </button>
      )}

      {/* Google Maps fallback */}
      {!loading && (
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
      )}
    </>
  );
}
