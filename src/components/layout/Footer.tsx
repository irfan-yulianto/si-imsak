import { CrescentIcon } from "@/components/ui/Icons";
import CurrentYear from "./CurrentYear";

const LINK = "focus-ring rounded font-medium text-accent-fg underline-offset-2 hover:underline";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 text-center text-xs text-fg-subtle">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
          <CrescentIcon size={14} />
          Si-Imsak
        </p>
        <p>
          Sumber data:{" "}
          <a href="https://bimasislam.kemenag.go.id" target="_blank" rel="noopener noreferrer" className={LINK}>
            Bimas Islam Kemenag RI
            <span className="sr-only"> (buka di tab baru)</span>
          </a>
        </p>
        <p>
          &copy; <CurrentYear /> Dibuat oleh Irfan Yulianto &middot;{" "}
          <a href="https://github.com/irfan-yulianto/si-imsak" target="_blank" rel="noopener noreferrer" className={LINK}>
            GitHub
            <span className="sr-only"> (buka di tab baru)</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
