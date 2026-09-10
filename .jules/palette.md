## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-10-27 - Add aria-labels to ambiguous error recovery and refresh buttons
**Learning:** Icon-only buttons (like "Refresh") and buttons with context-dependent text (like "Coba Lagi" / Try Again) present significant accessibility barriers when out of context for screen reader users. The visible text alone is insufficiently descriptive. Explicit `aria-label`s are necessary to convey the specific action and context to assistive technologies.
**Action:** When implementing icon-only buttons or buttons with generic error recovery text ("Try Again"), explicitly define an `aria-label` that includes the full context of the action (e.g., `aria-label="Coba Lagi mencari masjid"`).
