"use client";

import { useId, useState, type FormEvent } from "react";
import { NAME_MAX, NAME_MIN } from "@/lib/mosque-contrib";
import { MOSQUE_MESSAGES, suggestionIntro, suggestionSent } from "@/lib/mosque-messages";
import { isObject } from "@/lib/validate";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

/** The text inputs, as the city search's (16px on phones so iOS Safari doesn't zoom in on focus) */
const INPUT =
  "min-h-11 w-full rounded-control border border-border bg-surface-2 px-3 py-2.5 text-base font-medium text-fg placeholder:text-fg-subtle transition-colors focus:border-focus focus:bg-surface focus:outline-none focus:ring-2 focus:ring-focus/30 sm:text-sm";
const LABEL = "mb-1 block text-xs font-semibold text-fg-muted";
/** Sending, GitHub included */
const SEND_TIMEOUT_MS = 15_000;

type Phase = { name: "editing" } | { name: "sending" } | { name: "failed"; error: string } | { name: "sent"; number: number };

/**
 * The form for suggesting a mosque or musholla at the user's position, which
 * /api/mosques/suggest turns into an issue for the owner to check. Shown by MosqueList
 * when the fix is sharp and no listed place is near.
 */
export default function SuggestPlace({
  coords, accuracy, onSent, onClose,
}: {
  coords: { lat: number; lng: number };
  accuracy: number;
  /** The suggestion was taken */
  onSent: () => void;
  onClose: () => void;
}) {
  const id = useId();
  const [kind, setKind] = useState<"masjid" | "musholla">("musholla");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [phase, setPhase] = useState<Phase>({ name: "editing" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < NAME_MIN) return setPhase({ name: "failed", error: MOSQUE_MESSAGES.suggestionNameMissing });
    setPhase({ name: "sending" });
    try {
      const res = await fetch("/api/mosques/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name: trimmedName, street: street.trim() || undefined, lat: coords.lat, lng: coords.lng, accuracy }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      const data: unknown = await res.json().catch(() => null);
      if (res.ok && isObject(data) && data.status === true && isObject(data.data) && typeof data.data.number === "number") {
        setPhase({ name: "sent", number: data.data.number });
        onSent();
        return;
      }
      // The server's own reason, in the user's language, when it gives one
      const error =
        isObject(data) && typeof data.error === "string"
          ? data.error
          : res.status === 429
            ? MOSQUE_MESSAGES.tooManyRequests
            : MOSQUE_MESSAGES.serverError;
      setPhase({ name: "failed", error });
    } catch {
      setPhase({ name: "failed", error: MOSQUE_MESSAGES.connectionFailed });
    }
  };

  if (phase.name === "sent") {
    return (
      <Card role="status" className="p-4">
        <p className="text-sm leading-relaxed text-fg">{suggestionSent(phase.number)}</p>
        <Button variant="secondary" onClick={onClose} className="mt-3">
          Tutup
        </Button>
      </Card>
    );
  }

  const sending = phase.name === "sending";
  return (
    <Card as="section" aria-labelledby={`${id}-title`} className="p-4">
      <h3 id={`${id}-title`} className="text-sm font-bold text-fg">
        Tambahkan masjid atau musholla di sini
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-fg-muted">{suggestionIntro(accuracy)}</p>
      <form onSubmit={submit} className="mt-3 space-y-3" aria-busy={sending}>
        <fieldset>
          <legend className={LABEL}>Jenis</legend>
          <div className="flex gap-5">
            {(["musholla", "masjid"] as const).map((option) => (
              <label key={option} className="flex min-h-11 items-center gap-2 text-sm text-fg">
                <input
                  type="radio"
                  name={`${id}-kind`}
                  value={option}
                  checked={kind === option}
                  onChange={() => setKind(option)}
                  className="h-4 w-4 accent-accent"
                />
                {option === "musholla" ? "Musholla" : "Masjid"}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${id}-name`} className={LABEL}>
            Nama
          </label>
          <input
            id={`${id}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="Al-Ikhlas"
            aria-describedby={`${id}-name-hint`}
            className={INPUT}
          />
          <p id={`${id}-name-hint`} className="mt-1 text-xs text-fg-subtle">
            {MOSQUE_MESSAGES.suggestionNameHint}
          </p>
        </div>
        <div>
          <label htmlFor={`${id}-street`} className={LABEL}>
            Jalan (opsional)
          </label>
          <input
            id={`${id}-street`}
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="Gang Damai 3"
            className={INPUT}
          />
        </div>
        {phase.name === "failed" && (
          <p role="alert" className="text-xs font-medium text-danger">
            {phase.error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={sending} className="flex-1">
            {sending ? (
              <>
                <Spinner size="sm" />
                Mengirim…
              </>
            ) : (
              "Kirim Usulan"
            )}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Batal
          </Button>
        </div>
      </form>
    </Card>
  );
}
