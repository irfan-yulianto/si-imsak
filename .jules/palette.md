## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Add focus-visible state to error recovery buttons
**Learning:** Error recovery buttons like "Coba Lagi" are critical interaction points when the user is frustrated or stuck. Lacking clear keyboard focus indicators on these buttons significantly degrades accessibility and confidence in the interface.
**Action:** Always ensure critical action buttons, especially in error and empty states, have explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color]-500` styles.
