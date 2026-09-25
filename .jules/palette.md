## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Announce dynamic empty and error states to screen readers
**Learning:** When async operations like searching or data fetching result in empty states ("Kota tidak ditemukan") or error states, screen readers often remain silent if the DOM changes aren't explicitly announced, causing confusion for users relying on assistive technology.
**Action:** Always wrap conditionally rendered empty or error message containers with `role="alert"` and `aria-live="polite"` so that assistive technologies proactively announce these important state changes.
