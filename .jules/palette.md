## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add descriptive aria-labels to generic text buttons
**Learning:** Buttons with generic text like "Coba Lagi" or "Refresh" lack context for screen reader users when read out of sequence.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons. To comply with WCAG 2.5.3 (Label in Name), ensure the `aria-label` includes the exact visible text of the button (e.g., "Coba Lagi mencari masjid" instead of "Cari masjid lagi").
