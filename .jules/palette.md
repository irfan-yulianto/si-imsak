## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2025-02-18 - Add clear empty states for active searches
**Learning:** Silently hiding a search dropdown when no results are found leaves users confused. Providing explicit empty states (e.g., "Kota tidak ditemukan") with proper ARIA attributes (`role="alert" aria-live="polite"`) is crucial for providing feedback to screen readers and general UX.
**Action:** Always provide explicit, accessible empty states instead of silently hiding dropdowns when an active search query yields zero results.
