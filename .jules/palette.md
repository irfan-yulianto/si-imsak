## 2024-05-19 - Adding accessible button labels and roles
**Learning:** Certain dynamic non-critical text messages like "Memuat Jadwal..." or error text need `role="status"` and `aria-live="polite"` so they are read smoothly to screen readers without being overly disruptive. `role="timer"` is already in place.
**Action:** Found a missing `role="status"` `aria-live="polite"` on the location error/loading states and we can add a visual loading indicator or disabled states for better UX. We can also add aria-labels to the "Batal" and "Coba Lagi" buttons.

## 2024-05-19 - Accessible Dynamic States
**Learning:** React state changes that dynamically update text content without shifting focus (like error states or loading indicators) are invisible to screen readers unless marked appropriately. Wait, wait, this isn't just about errors - anything that updates *dynamically* without an interaction event (e.g. timeout for loading, background fetch failures).
**Action:** Adding `role="status"` and `aria-live="polite"` makes these states properly vocalized by screen reading software, keeping the interaction seamless while providing accessibility.
