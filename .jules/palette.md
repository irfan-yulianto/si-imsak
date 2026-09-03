## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-03 - Add aria-labels and focus states to generic retry buttons
**Learning:** Generic text buttons like "Coba Lagi" lack context for screen reader users and often lack keyboard focus rings.
**Action:** Always add descriptive `aria-label` attributes that include the visible text (e.g., `aria-label="Coba Lagi memuat halaman"`) to comply with WCAG 2.5.3, and ensure they have explicitly defined `focus-visible` styles.
