"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";

/**
 * The floating "Hari Ini" button (phones), shown while today's row is scrolled out of
 * view. It watches the row on its own, so scrolling re-renders the button, never the month.
 */
export default function TodayFab({ todayRef, todayDate, active }: {
  /** Today's row */
  todayRef: RefObject<HTMLElement | null>;
  /** Today's date: at midnight the next row becomes today's */
  todayDate: string;
  /** Today's row is on screen: the month shown is loaded and contains today */
  active: boolean;
}) {
  const [rowVisible, setRowVisible] = useState(true);

  useEffect(() => {
    const row = todayRef.current;
    if (!row || !active) return;
    const observer = new IntersectionObserver(([entry]) => setRowVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(row);
    return () => observer.disconnect();
  }, [todayRef, todayDate, active]);

  const dock = active && !rowVisible ? document.getElementById("dock") : null;
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
