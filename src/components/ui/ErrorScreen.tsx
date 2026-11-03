/** Button's primary class list, written out (ErrorScreen.test.tsx keeps the two equal) */
const RETRY_BUTTON_CLASS =
  "focus-ring inline-flex cursor-pointer items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 rounded-control bg-accent text-on-accent hover:bg-accent-hover min-h-11 gap-2 px-4 text-sm";

/**
 * What error.tsx and global-error.tsx show: something broke, and a way to try again.
 * Both error pages load with every page, each with its own copy of what it imports, and
 * a module the page also uses comes along whole (Icons.tsx with every icon, Button with
 * every variant). So this screen uses plain elements with the classes of Card and
 * Button, and draws its one icon itself, in the style of Icons.tsx.
 */
export default function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div role="alert" className="w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-bold text-fg">Terjadi Kesalahan</h2>
        <p className="mb-4 text-sm text-fg-muted">Aplikasi mengalami masalah. Silakan coba lagi.</p>
        <button type="button" onClick={onRetry} aria-label="Coba lagi memuat halaman" className={RETRY_BUTTON_CLASS}>
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
