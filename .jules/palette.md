## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2025-01-26 - Accessible Empty States
**Learning:** React dynamically adds and removes DOM elements during empty search results and async error rendering (e.g. `Kota tidak ditemukan` or server error messages). When dynamic UI elements like error messages or empty lists appear or update visually, they are completely silent to screen readers unless they are explicitly marked as live regions.
**Action:** Always wrap dynamic UI error messages and empty result states in a container with `role="alert"` and `aria-live="polite"` so screen readers will automatically announce their contents when they are added to the DOM or modified.
