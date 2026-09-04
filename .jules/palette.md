## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-09-04 - Add descriptive aria-labels to generic "Coba Lagi" buttons
**Learning:** Generic error recovery buttons with text like "Coba Lagi" are ambiguous out of context for screen reader users. Adding context-specific `aria-label` attributes to these buttons greatly improves accessibility and compliance with WCAG 2.5.3.
**Action:** Always provide explicit, contextual `aria-label` attributes for generic action buttons, especially error retry buttons.
