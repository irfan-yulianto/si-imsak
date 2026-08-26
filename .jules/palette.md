## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Add aria-label to generic text buttons
**Learning:** Generic text buttons like "Coba Lagi" or "Refresh" lack context for screen reader users when read out of context. To comply with WCAG 2.5.3 (Label in Name), these buttons need descriptive `aria-label`s that include the visible text.
**Action:** When creating buttons with generic text, ensure the `aria-label` includes the exact visible text along with the specific action it performs (e.g., "Coba Lagi memuat jadwal" instead of just "Coba Lagi" or "Memuat jadwal").
