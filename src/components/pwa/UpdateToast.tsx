"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BUILD_ID } from "@/lib/constants";
import Button from "@/components/ui/Button";

/**
 * Registers the service worker and offers a reload when a new version is ready.
 *
 * The worker URL carries the build id, so every deploy installs a new worker. It
 * waits (instead of taking over mid-use) until the user taps "Muat Ulang", which
 * matters for an installed PWA that stays open for hours, e.g. overnight for sahur.
 */
export default function UpdateToast() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const reloadRequestedRef = useRef(false);

  useEffect(() => {
    // Dev builds change chunks in place — a caching worker would serve stale code
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    const sw = navigator.serviceWorker;
    let registration: ServiceWorkerRegistration | null = null;

    // Only reload when the user asked for it; the very first install also
    // changes the controller and must not reload the page.
    const onControllerChange = () => {
      if (reloadRequestedRef.current) window.location.reload();
    };

    const trackInstalling = (worker: ServiceWorker | null) => {
      worker?.addEventListener("statechange", () => {
        // "installed" with an existing controller = an update is waiting
        if (worker.state === "installed" && sw.controller) setWaitingWorker(worker);
      });
    };

    // Long-open apps should still notice new deploys
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };

    sw.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", onVisible);

    sw.register(`/sw.js?v=${encodeURIComponent(BUILD_ID)}`)
      .then((reg) => {
        registration = reg;
        if (reg.waiting && sw.controller) setWaitingWorker(reg.waiting);
        trackInstalling(reg.installing);
        reg.addEventListener("updatefound", () => trackInstalling(reg.installing));
      })
      .catch(() => {});

    return () => {
      sw.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const dock = waitingWorker ? document.getElementById("dock") : null;
  if (!waitingWorker || !dock) return null;

  const applyUpdate = () => {
    reloadRequestedRef.current = true;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  return createPortal(
    <div
      role="status"
      className="pointer-events-auto order-2 flex items-center gap-3 self-stretch rounded-card border border-border bg-surface p-3 shadow-lg"
    >
      <p className="flex-1 text-sm text-fg">Versi baru Si-Imsak tersedia.</p>
      <Button variant="ghost" onClick={() => setWaitingWorker(null)}>
        Nanti
      </Button>
      <Button onClick={applyUpdate}>Muat Ulang</Button>
    </div>,
    dock
  );
}
