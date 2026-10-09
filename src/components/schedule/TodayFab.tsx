"use client";

import { useEffect, useState, type RefObject } from "react";
import { CalendarIcon } from "@/components/ui/Icons";

/**
 * The floating "Hari Ini" button, shown while today's card is scrolled out of view. It
 * watches the card on its own, so scrolling re-renders the button, never the month.
 */
export default function TodayFab({ todayRef, todayDate, active }: {
  /** Today's card */
  todayRef: RefObject<HTMLDivElement | null>;
  /** Today's date: at midnight the next card becomes today's */
  todayDate: string;
  /** Today's card is on screen: the month shown is loaded and contains today */
  active: boolean;
}) {
  const [cardVisible, setCardVisible] = useState(true);

  useEffect(() => {
    const card = todayRef.current;
    if (!card || !active) return;
    const observer = new IntersectionObserver(([entry]) => setCardVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(card);
    return () => observer.disconnect();
  }, [todayRef, todayDate, active]);

  if (!active || cardVisible) return null;
  return (
    <button
      type="button"
      onClick={() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      aria-label="Gulir ke jadwal hari ini"
      className="focus-ring fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-emerald-700 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-800 active:scale-95"
    >
      <CalendarIcon size={14} />
      Hari Ini
    </button>
  );
}
