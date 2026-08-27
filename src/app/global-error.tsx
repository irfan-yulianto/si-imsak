"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-white dark:bg-slate-950">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center shadow-lg dark:border-red-900/50 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">
              Terjadi Kesalahan
            </h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Aplikasi mengalami masalah. Silakan coba lagi.
            </p>
            <button
              type="button"
              aria-label="Coba Lagi memuat halaman"
              onClick={reset}
              className="cursor-pointer rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
