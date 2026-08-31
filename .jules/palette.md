## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-02 - Add explicit ARIA labels to generic text buttons
**Learning:** Buttons with generic text like "Coba Lagi" or "Refresh" can be ambiguous to screen reader users when multiple instances appear on the page or when their context is purely visual. This violates WCAG 2.5.3 (Label in Name) principles if their accessible name isn't descriptive. Furthermore, focus-visible styles are sometimes missed on non-primary error state buttons.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons containing ambiguous text, ensuring the `aria-label` includes the exact visible text of the button (e.g., "Coba Lagi memuat data masjid" instead of "Muat ulang masjid"). Always check corresponding RTL tests when updating these labels, and enforce `focus-visible` styles on all interactive elements.
