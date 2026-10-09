"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";

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

  const dock = active && !cardVisible ? document.getElementById("dock") : null;
  if (!dock) return null;
  return createPortal(
    <Button
      pill
      onClick={() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
      aria-label="Gulir ke jadwal hari ini"
      className="pointer-events-auto order-1 shadow-lg md:hidden"
    >
      <CalendarIcon size={14} />
      Hari Ini
    </Button>,
    dock
  );
}
