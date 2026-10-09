"use client";

import type { Mosque } from "@/types";
import { formatDistance, formatRadius, MAX_SEARCH_RADIUS, widerRadius } from "@/lib/mosques";
import { MOSQUE_MESSAGES } from "@/lib/mosque-messages";
import { MosqueIcon, SearchIcon } from "@/components/ui/Icons";
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
      {/* Loading state */}
      {loading && (
        <div role="status" aria-label="Memuat daftar masjid" className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Refreshing failed, but the earlier results are still there */}
      {!loading && error && mosques.length > 0 && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {MOSQUE_MESSAGES.stale}
          </p>
          {coords && (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Coba lagi memperbarui daftar masjid"
              className="focus-ring min-h-11 cursor-pointer rounded-lg px-3 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/40"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Error state */}
      {!loading && error && mosques.length === 0 && (
        <div role="alert" className="rounded-2xl border border-slate-100 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
          <MosqueIcon size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
          {coords && (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Coba lagi mencari masjid"
              className="focus-ring mt-3 min-h-11 cursor-pointer rounded-lg bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Mosque list — nearby mosques reveal the user's area, so masked in Clarity recordings */}
      {!loading && mosques.length > 0 && (
        <div data-clarity-mask="True" className="space-y-2">
          {mosques.map((mosque, i) => (
            <div
              key={mosque.id}
              className="animate-fade-in rounded-xl border border-slate-100 bg-white px-4 py-3 transition-colors hover:border-emerald-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-800"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">
                      {mosque.name}
                    </h3>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                      mosque.type === "musholla"
                        ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}>
                      {mosque.type === "musholla" ? "Musholla" : "Masjid"}
                    </span>
                  </div>
                  {mosque.address && (
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      {mosque.address}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {formatDistance(mosque.distance)}
                </span>
              </div>
              <div className="mt-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Navigasi ke ${mosque.name} (buka Google Maps di tab baru)`}
                  className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                >
                  <NavigationIcon size={12} />
                  Navigasi
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Few results, and the search can still widen */}
      {!loading && coords && mosques.length < 5 && radius < MAX_SEARCH_RADIUS && (
        <button
          type="button"
          onClick={onWiden}
          className="focus-ring flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 py-3 text-xs font-semibold text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50"
        >
          <SearchIcon size={14} />
          Perluas Pencarian ({formatRadius(radius)} → {formatRadius(widerRadius(radius))})
        </button>
      )}

      {/* Google Maps fallback */}
      {!loading && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-4 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700 dark:hover:text-emerald-400"
        >
          <ExternalLinkIcon size={14} />
          Cari lebih banyak di Google Maps
          <span className="sr-only"> (buka di tab baru)</span>
        </a>
      )}
    </>
  );
}
