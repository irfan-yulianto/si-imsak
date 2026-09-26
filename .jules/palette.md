## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-26 - Add alert role to dynamic UI error states
**Learning:** Screen readers do not automatically announce dynamic error messages or empty states that appear after an asynchronous operation (like GPS failure or API errors). This causes a severe accessibility gap where visually impaired users are unaware of the failure.
**Action:** Always wrap dynamic UI error messages and async empty states in a container with `role="alert"` and `aria-live="polite"` so that assistive technologies announce the state change immediately.
