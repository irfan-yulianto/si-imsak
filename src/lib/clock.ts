// One shared timer for everything that changes with the clock's minutes (today's date,
// the time in progress). It fires just after each minute boundary of the server-
// corrected clock, and at once when the page comes back: phones suspend timers in the
// background, and a restored page (back/forward cache) or a reconnect may be minutes on.

type Listener = () => void;

const listeners = new Set<Listener>();
let offsetMs = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Fire this long after the boundary, so the new minute is surely there */
const SLACK_MS = 50;

function tick() {
  for (const listener of listeners) listener();
}

function schedule() {
  clearTimeout(timer);
  const intoMinute = (((Date.now() + offsetMs) % 60_000) + 60_000) % 60_000;
  timer = setTimeout(() => {
    tick();
    schedule();
  }, 60_000 - intoMinute + SLACK_MS);
}

function wake() {
  if (document.visibilityState === "hidden") return;
  tick();
  schedule();
}

/** The server clock's lead over the device clock; minute boundaries follow it */
export function setClockOffset(offset: number): void {
  offsetMs = offset;
  if (listeners.size > 0) schedule();
}

/** For useSyncExternalStore: call `listener` at every new minute */
export function subscribeToClock(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    schedule();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("online", wake);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", wake);
    window.removeEventListener("pageshow", wake);
    window.removeEventListener("online", wake);
  };
}
