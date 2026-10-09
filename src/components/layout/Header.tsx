"use client";

import LocationSearch from "@/components/location/LocationSearch";
import { CrescentIcon, SunIcon, MoonIcon } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useStore } from "@/store/useStore";

export default function Header() {
  const isOffline = useStore((s) => s.isOffline);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  return (
    <header className="fixed left-[max(1rem,var(--safe-l))] right-[max(1rem,var(--safe-r))] top-[calc(0.75rem+var(--safe-t))] z-50 mx-auto max-w-6xl">
      {/* Phones: the city search on a row of its own, so it has room for a name */}
      <div className="flex h-[var(--header-h)] flex-wrap content-center items-center gap-x-2 gap-y-2 rounded-card border border-border bg-surface/90 px-3 shadow-card backdrop-blur-xl sm:flex-nowrap sm:px-4">
        <div className="mr-auto flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-tile bg-brand text-on-accent">
            <CrescentIcon size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight text-fg">Si-Imsak</h1>
            <p className="hidden text-2xs font-medium text-fg-subtle sm:block">Jadwal sholat &amp; imsakiyah</p>
          </div>
        </div>

        {isOffline && <Badge tone="warning">Offline</Badge>}
        <a
          href="#panel-masjid"
          className="focus-ring hidden min-h-11 items-center rounded-control px-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-soft md:inline-flex"
        >
          Masjid Terdekat
        </a>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
        >
          {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </Button>
        <div className="w-full sm:w-64">
          <LocationSearch />
        </div>
      </div>
    </header>
  );
}
