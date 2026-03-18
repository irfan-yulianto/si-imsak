"use client";

import { useEffect, useMemo } from "react";
import LocationSearch from "@/components/location/LocationSearch";
import { CrescentIcon, SunIcon, MoonIcon } from "@/components/ui/Icons";
import { useStore } from "@/store/useStore";
import { getHijriMonthsForGregorianMonth } from "@/lib/hijri";

export default function Header() {
  const isOffline = useStore((s) => s.isOffline);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const viewMonth = useStore((s) => s.viewMonth);
  const viewYear = useStore((s) => s.viewYear);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme") as "light" | "dark" | null;
      if (saved) {
        setTheme(saved);
      } else {
        // Default dark — matches layout.tsx inline script
        setTheme("dark");
      }
    } catch (e) {
      console.warn("Failed to access localStorage", e);
      // localStorage unavailable (Safari private mode) — default dark
      setTheme("dark");
    }
  }, [setTheme]);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const hijriSubtitle = useMemo(() => {
    const hijriMonths = getHijriMonthsForGregorianMonth(viewYear, viewMonth);
    return hijriMonths
      .map((h, i) =>
        i === hijriMonths.length - 1
          ? `${h.monthName} ${h.year}H`
          : h.monthName
      )
      .join(" – ");
  }, [viewYear, viewMonth]);

  return (
    <header className="fixed top-3 left-4 right-4 z-50 mx-auto max-w-5xl">
      <nav aria-label="Navigasi utama" className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 shadow-lg shadow-black/[0.03] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-black/20">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 shadow-md shadow-green-600/25">
            <CrescentIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100">
              Si-Imsak
            </h1>
            <p className="hidden text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-500 sm:block">
              {hijriSubtitle} / {viewYear}
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isOffline && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700">
              Offline
            </span>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          >
            {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
          <LocationSearch />
        </div>
      </nav>
    </header>
  );
}
