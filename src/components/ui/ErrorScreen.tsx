import { AlertIcon } from "./Icons";
import Button from "./Button";
import Card from "./Card";

/** What error.tsx and global-error.tsx show: something broke, and a way to try again */
export default function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Card role="alert" className="w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertIcon size={24} />
        </div>
        <h2 className="mb-2 text-lg font-bold text-fg">Terjadi Kesalahan</h2>
        <p className="mb-4 text-sm text-fg-muted">Aplikasi mengalami masalah. Silakan coba lagi.</p>
        <Button onClick={onRetry} aria-label="Coba lagi memuat halaman" className="px-6">
          Coba Lagi
        </Button>
      </Card>
    </div>
  );
}
