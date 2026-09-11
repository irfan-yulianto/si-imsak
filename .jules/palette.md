## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-10-31 - Add context to ambiguous generic buttons via aria-labels
**Learning:** Generic text buttons like "Coba Lagi" or "Refresh" lack context for screen reader users and can fail WCAG criteria when their accessible name doesn't describe their specific action context.
**Action:** Always provide an `aria-label` that includes the exact visible text combined with its specific context (e.g., "Coba Lagi memuat jadwal"), and ensure clear `focus-visible` styles exist for keyboard navigation.
