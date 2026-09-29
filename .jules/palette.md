## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-05-24 - Dynamic Error Accessibility
**Learning:** Dynamic UI states (like error messages after async fetches) in this application often fail to alert screen reader users because they lack ARIA roles.
**Action:** Always wrap conditionally rendered error messages or alerts in a container with `role="alert"` and `aria-live="polite"` to ensure they are announced appropriately.
