## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Add ARIA labels to generic error retry buttons
**Learning:** Generic text buttons like "Coba Lagi" lack context for screen reader users when multiple retry mechanisms exist (e.g. for app, page, location, schedules). Missing `focus-visible` styles also prevent keyboard users from knowing which retry button is currently focused.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons containing ambiguous text like "Coba Lagi", ensuring the label includes the exact visible text of the button (e.g., 'Coba Lagi memuat jadwal'). Also, always provide explicit `focus-visible` states for interactive elements.
