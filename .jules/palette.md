## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add focus-visible styles to error recovery buttons
**Learning:** Error states with retry buttons ("Coba Lagi") are critical for recovery, but users relying on keyboard navigation can easily lose their place if these buttons lack clear focus states. Ensuring all actionable buttons, especially in error and fallback UIs, have explicit `focus-visible` styles is essential for accessibility.
**Action:** Always add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color]` to all interactive elements, prioritizing error recovery actions.
