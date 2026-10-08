import { CrescentIcon } from "@/components/ui/Icons";
import { BUILD_TIME } from "@/lib/constants";

// Year of the deployed build: identical in the server HTML and on the client
const COPYRIGHT_YEAR = new Date(BUILD_TIME).getFullYear();

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-gradient-to-b from-white to-slate-50 py-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CrescentIcon size={14} />
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Si-Imsak</span>
          </div>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Sumber data:{" "}
            <a
              href="https://bimasislam.kemenag.go.id"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring cursor-pointer rounded font-medium text-emerald-700 transition-colors hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              Bimas Islam Kemenag RI
              <span className="sr-only"> (buka di tab baru)</span>
            </a>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; {COPYRIGHT_YEAR} Created by Irfan Yulianto &middot;{" "}
            <a
              href="https://github.com/irfan-yulianto/si-imsak"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded font-medium text-slate-600 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              GitHub
              <span className="sr-only"> (buka di tab baru)</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
