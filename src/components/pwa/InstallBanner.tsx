"use client";

import { useEffect, useState, useCallback } from "react";
import { CrescentIcon } from "@/components/ui/Icons";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

type BannerMode = "chromium" | "ios" | null;

function detectBannerMode(): BannerMode {
  if (window.matchMedia("(display-mode: standalone)").matches) return null;
  try {
    if (localStorage.getItem(DISMISSED_KEY)) return null;
  } catch {
    return null;
  }

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

// Share/export icon for iOS instructions
function ShareIcon() {
  return (
    <svg role="img" aria-label="Bagikan" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline -mt-0.5">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      aria-label="Tutup"
    >
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

export default function InstallBanner() {
  const [mode, setMode] = useState<BannerMode>(null);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const detected = detectBannerMode();
    if (!detected) return;

    if (detected === "ios") {
      setMode("ios");
      return;
    }

    // Chromium: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("chromium");
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setMode(null);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setMode(null);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  }, []);

  return (
    // inert while collapsed: the hidden buttons must not be reachable by Tab or screen readers
    <div inert={!mode} className={`relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-teal-50 transition-all duration-300 dark:border-emerald-800/40 dark:from-emerald-950/40 dark:to-teal-950/30 ${mode ? "max-h-32 px-4 py-3 opacity-100" : "max-h-0 border-0 opacity-0"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 shadow-md shadow-green-600/25">
          <CrescentIcon size={20} className="text-white" />
        </div>

        {mode === "chromium" ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Pasang Si-Imsak di perangkatmu
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sekali klik langsung buka — tanpa ketik alamat di browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleInstall}
              className="focus-ring min-h-11 shrink-0 cursor-pointer rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800"
            >
              Pasang
            </button>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Pasang Si-Imsak di Layar Utama
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ketuk <ShareIcon /> lalu pilih{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                &quot;Tambah ke Layar Utama&quot;
              </span>{" "}
              (Add to Home Screen)
            </p>
          </div>
        )}

        <CloseButton onClick={handleDismiss} />
      </div>
    </div>
  );
}
