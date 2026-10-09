"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CountdownTimer from "@/components/schedule/CountdownTimer";
import TodayCard from "@/components/schedule/TodayCard";
import ScheduleTable from "@/components/schedule/ScheduleTable";
import InstallBanner from "@/components/pwa/InstallBanner";
import { CalendarIcon, MosqueIcon } from "@/components/ui/Icons";
import UpdateToast from "@/components/pwa/UpdateToast";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";

const MosqueFinder = dynamic(() => import("@/components/mosque/MosqueFinder"), {
  ssr: false,
  loading: () => <MosquePlaceholder />,
});

/** Until the finder loads: as tall as its controls card, so nothing jumps */
function MosquePlaceholder() {
  return <div aria-hidden="true" className="h-60 animate-shimmer rounded-card lg:w-1/3" />;
}

type ActiveTab = "jadwal" | "masjid";

const TABS: { id: ActiveTab; label: string; Icon: typeof CalendarIcon }[] = [
  { id: "jadwal", label: "Jadwal", Icon: CalendarIcon },
  { id: "masjid", label: "Masjid", Icon: MosqueIcon },
];

function tabFromUrl(): ActiveTab {
  return new URLSearchParams(window.location.search).get("tab") === "masjid" ? "masjid" : "jadwal";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("jadwal");

  useAppBootstrap();

  // The active mobile tab lives in the URL (?tab=masjid) so the back button and
  // shared links work. Read after hydration, before paint.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from the URL, an external store
    setActiveTab(tabFromUrl());
    const onPopState = () => setActiveTab(tabFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const tabRefs = useRef<Record<ActiveTab, HTMLButtonElement | null>>({ jadwal: null, masjid: null });

  const selectTab = (tab: ActiveTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "masjid") url.searchParams.set("tab", "masjid");
    else url.searchParams.delete("tab");
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };

  // WAI-ARIA tabs: arrow keys move between tabs (roving tabindex)
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === activeTab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  // MosqueFinder (its chunk plus a /api/mosques request) is only mounted once its
  // section is on screen: the masjid tab on mobile, or scrolled near on desktop.
  const mosqueSectionRef = useRef<HTMLDivElement>(null);
  const [showMosques, setShowMosques] = useState(false);
  useEffect(() => {
    const el = mosqueSectionRef.current;
    if (!el || showMosques) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowMosques(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [showMosques]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#konten"
        className="sr-only z-[70] rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Lewati ke konten
      </a>
      <Header />

      {/* Room for the fixed header */}
      <div className="h-[calc(0.75rem+var(--header-h)+var(--safe-t))] shrink-0" />

      <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-6 pt-3 focus:outline-none">
        {/* Hero + Schedule — a tab on mobile, always visible on desktop */}
        <div
          id="panel-jadwal"
          role="tabpanel"
          aria-labelledby="tab-jadwal"
          className={activeTab === "masjid" ? "hidden md:block" : "block"}
        >
          {/* Countdown and today's times side by side on wide screens, the same height */}
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <CountdownTimer />
            </div>
            <div className="lg:col-span-5">
              <TodayCard />
            </div>
          </div>

          <div className="mt-6">
            <ScheduleTable />
          </div>

          {/* Last in the panel: when it appears, nothing above it moves */}
          <InstallBanner />
        </div>

        {/* Mosque Finder — tab on mobile, section on desktop */}
        <div
          id="panel-masjid"
          ref={mosqueSectionRef}
          role="tabpanel"
          aria-labelledby="tab-masjid"
          className={`${activeTab === "masjid" ? "block" : "hidden"} md:mt-10 md:block`}
        >
          {showMosques ? <MosqueFinder /> : <MosquePlaceholder />}
        </div>
      </main>

      <Footer />

      {/* What floats above the page bottom, stacked instead of on top of each other: the
          update notice, and the "Hari Ini" button (both render into it with a portal) */}
      <div
        id="dock"
        data-tab={activeTab}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-h)+var(--safe-b)+0.75rem)] z-[60] mx-auto flex max-w-md flex-col items-end gap-2 px-4 md:bottom-[calc(1.5rem+var(--safe-b))]"
      />
      <UpdateToast />

      {/* Mobile bottom navigation (tabs) */}
      <nav aria-label="Menu utama" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 pb-[var(--safe-b)] backdrop-blur-xl md:hidden">
        <div role="tablist" aria-label="Tampilan" className="mx-auto flex max-w-md">
          {TABS.map(({ id, label, Icon }) => {
            const selected = activeTab === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[id] = el;
                }}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectTab(id)}
                onKeyDown={onTabKeyDown}
                className={`flex h-[var(--nav-h)] flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus ${
                  selected ? "text-accent-fg" : "text-fg-subtle"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Room for the phone's tab bar */}
      <div className="h-[calc(var(--nav-h)+var(--safe-b))] shrink-0 md:hidden" />
    </div>
  );
}
