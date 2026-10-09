"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { CrescentIcon, ShareIcon, XIcon } from "@/components/ui/Icons";
import Button from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { KEYS, isAvailable, readRaw, writeRaw } from "@/lib/storage";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BannerMode = "chromium" | "ios" | null;

function detectBannerMode(): BannerMode {
  if (window.matchMedia("(display-mode: standalone)").matches) return null;
  // Without storage a dismissal couldn't be remembered: no banner at all
  if (!isAvailable() || readRaw(KEYS.installDismissed)) return null;

  // iOS Safari detection (no beforeinstallprompt support)
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua);

  if (isIOS && isSafari) return "ios";

  // Chromium-based browsers will fire beforeinstallprompt
  return "chromium";
}

const noSubscribe = () => () => {};

export default function InstallBanner() {
  // iOS instructions depend only on the browser, so read them as an external value:
  // false during server render and hydration, the real answer right after.
  const isIosBanner = useSyncExternalStore(
    noSubscribe,
    () => detectBannerMode() === "ios",
    () => false
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [chromiumReady, setChromiumReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (detectBannerMode() !== "chromium") return;

    // Chromium: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setChromiumReady(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const mode: BannerMode = hidden ? null : isIosBanner ? "ios" : chromiumReady ? "chromium" : null;

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // A prompt can be shown only once, so "Pasang" would do nothing from now on. Not
    // remembered: the browser offers installing again on a later visit.
    setHidden(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setHidden(true);
    writeRaw(KEYS.installDismissed, "1");
  }, []);

  return (
    // inert while collapsed: the hidden buttons must not be reachable by Tab or screen readers
    <div
      inert={!mode}
      className={cx(
        "relative overflow-hidden rounded-card border border-border bg-surface shadow-card transition-all duration-300",
        mode ? "mt-4 max-h-32 px-4 py-3 opacity-100" : "max-h-0 border-0 opacity-0"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-brand text-on-accent">
          <CrescentIcon size={20} />
        </div>

        {mode === "chromium" ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Pasang Si-Imsak di perangkat Anda</p>
              <p className="text-xs text-fg-subtle">Sekali ketuk langsung terbuka, tanpa mengetik alamat.</p>
            </div>
            <Button onClick={handleInstall}>Pasang</Button>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Pasang Si-Imsak di Layar Utama</p>
            <p className="text-xs text-fg-subtle">
              Ketuk <ShareIcon size={14} role="img" aria-hidden={false} aria-label="Bagikan" className="-mt-0.5 inline" /> lalu
              pilih <span className="font-semibold text-fg-muted">&quot;Tambah ke Layar Utama&quot;</span> (Add to Home Screen)
            </p>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={handleDismiss} aria-label="Tutup">
          <XIcon size={16} />
        </Button>
      </div>
    </div>
  );
}
