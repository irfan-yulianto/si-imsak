"use client";

import { useEffect, useState } from "react";

/** unknown: not answered yet; unsupported: the browser can't say */
export type GeoPermission = "unknown" | "unsupported" | PermissionState;

/**
 * Whether this site may read the location, kept up to date when the user changes it.
 * Only a hint: some browsers report it wrongly, so a watch still handles a refusal.
 */
export function useGeolocationPermission(): GeoPermission {
  const [state, setState] = useState<GeoPermission>(() =>
    typeof navigator !== "undefined" && typeof navigator.permissions?.query === "function" ? "unknown" : "unsupported"
  );

  useEffect(() => {
    if (typeof navigator.permissions?.query !== "function") return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    const update = () => {
      if (status) setState(status.state);
    };
    navigator.permissions.query({ name: "geolocation" }).then(
      (answer) => {
        if (cancelled) return;
        status = answer;
        setState(answer.state);
        answer.addEventListener("change", update);
      },
      () => {
        if (!cancelled) setState("unsupported");
      }
    );
    return () => {
      cancelled = true;
      status?.removeEventListener("change", update);
    };
  }, []);

  return state;
}
