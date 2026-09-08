## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-30 - Add context to generic Try Again buttons
**Learning:** Generic text buttons like "Coba Lagi" (Try Again) lack context when read by screen readers outside of their surrounding text. This is a common pattern in error states.
**Action:** When adding error state reset buttons with generic text, proactively include an `aria-label` attribute (e.g., "Coba Lagi mencari masjid") that provides the necessary context for screen reader users and ensure proper `focus-visible` styling for keyboard navigation.
