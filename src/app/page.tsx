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
import { useStore } from "@/store/useStore";

const MosqueFinder = dynamic(() => import("@/components/mosque/MosqueFinder"), {
  ssr: false,
  loading: () => <MosquePlaceholder />,
});

function MosquePlaceholder() {
  return <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />;
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

  // Load cached city/schedule/theme right after hydration but before the first paint:
  // the first client render matches the server HTML, and users still never see defaults.
  useLayoutEffect(() => {
    useStore.getState().hydrateFromCache();
  }, []);

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
        className="sr-only z-[70] rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Lewati ke konten
      </a>
      <Header />

      {/* Spacer for fixed header */}
      <div className="h-[calc(4rem+env(safe-area-inset-top))]" />

      <main id="konten" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 focus:outline-none">
        {/* Hero + Schedule — a tab on mobile, always visible on desktop */}
        <div
          id="panel-jadwal"
          role="tabpanel"
          aria-labelledby="tab-jadwal"
          className={activeTab === "masjid" ? "hidden md:block" : "block"}
        >
          {/* Hero: Full-width countdown */}
          <div className="animate-fade-in mb-3">
            <CountdownTimer />
          </div>

          {/* Today's prayer times */}
          <div className="animate-fade-in mb-4" style={{ animationDelay: "100ms" }}>
            <TodayCard />
          </div>

          {/* PWA install banner */}
          <div className="animate-fade-in mb-4" style={{ animationDelay: "200ms" }}>
            <InstallBanner />
          </div>

          {/* Schedule Table */}
          <div>
            <ScheduleTable />
          </div>
        </div>

        {/* Mosque Finder — tab on mobile, section on desktop */}
        <div
          id="panel-masjid"
          ref={mosqueSectionRef}
          role="tabpanel"
          aria-labelledby="tab-masjid"
          className={`${activeTab === "masjid" ? "block" : "hidden"} scroll-mt-24 md:mt-6 md:block`}
        >
          {showMosques ? <MosqueFinder /> : <MosquePlaceholder />}
        </div>
      </main>

      <Footer />

      <UpdateToast />

      {/* Mobile bottom navigation (tabs) */}
      <nav aria-label="Menu utama" className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-900/90">
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
                className={`flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset ${
                  selected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-semibold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
