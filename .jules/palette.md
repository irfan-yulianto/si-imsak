## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2025-05-18 - Improve ARIA labels for generic text buttons
**Learning:** The app contains several buttons with generic visible text like "Refresh" and "Coba Lagi" that are used in specific contexts (like refreshing mosque search or retrying schedule load). These can be ambiguous for screen reader users when read out of context.
**Action:** When adding generic text buttons, always add descriptive `aria-label` attributes to clarify the specific context of the action (e.g., "Coba Lagi mencari masjid" instead of just "Coba Lagi").
