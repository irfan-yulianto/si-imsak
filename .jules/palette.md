## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add aria-labels to generic retry buttons
**Learning:** Generic text buttons like "Coba Lagi" (Try Again) lack context for screen reader users, violating WCAG 2.5.3 if the visible text isn't included in a descriptive aria-label. Adding specific context (e.g., "Coba Lagi mencari masjid") makes error recovery much more accessible without cluttering the visual UI.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons (like "Refresh" or "Coba Lagi") ensuring the aria-label includes the exact visible text of the button.
