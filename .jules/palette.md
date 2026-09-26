## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-09-26 - Add alert role for dynamic errors
**Learning:** Dynamic empty and error states resulting from asynchronous operations (like finding mosques or fetching schedules) need ARIA live regions so screen readers announce the changes to users.
**Action:** When implementing dynamic feedback messages (stale data, API failures, or no-results states), always wrap them with `role="alert"` and `aria-live="polite"`.
