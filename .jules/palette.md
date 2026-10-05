## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2025-05-24 - Missing Empty State in Search
**Learning:** In autocomplete or dynamic search inputs, silently hiding the dropdown when no results are found provides poor UX and leaves screen reader users with no feedback. We must always provide an explicit "No results" empty state with `role="status"` and `aria-live="polite"` to correctly align the ARIA role with the polite announcement behavior.
**Action:** Always verify that search and filter dropdowns have an explicit "No results" empty state and that the message is properly announced to screen readers.
