## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-17 - Provide clear empty states for local search filters
**Learning:** Silently hiding a search dropdown when no results match the query leaves users confused if the system is broken or just empty. Providing a clear "Kota tidak ditemukan" empty state reassures the user and provides actionable feedback.
**Action:** When implementing client-side filtering or search dropdowns, always ensure there is a visible empty state explicitly informing the user when zero results are returned.
