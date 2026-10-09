"use client";

import { useSyncExternalStore } from "react";
import { BUILD_DATE, cityDate } from "@/lib/city-time";

// The year is read once per render; nothing needs to push updates
const subscribe = () => () => {};

/**
 * The current year in WIB. The server HTML and the hydration render use the build
 * year, so they always match; React then re-renders with the live year if it differs.
 */
export default function CurrentYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => cityDate(Date.now(), "WIB").year,
    () => BUILD_DATE.year
  );
  return <>{year}</>;
}
