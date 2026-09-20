## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Announce dynamic error states to screen readers
**Learning:** When displaying dynamic error or empty state messages resulting from async operations (like searching for mosques), screen readers will not announce them by default. This forces visually impaired users to hunt for feedback after an action fails.
**Action:** Always wrap dynamic error/empty state messages in a container with `role="alert"` and `aria-live="polite"` so screen readers proactively announce the changes without stealing immediate focus.
