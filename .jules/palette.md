## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2023-10-04 - MosqueFinder Empty State Consistency
**Learning:** In dynamic search dropdowns within this application (e.g., MosqueFinder vs LocationSearch), users expect an explicit empty state like "Kota tidak ditemukan" instead of a silently vanishing dropdown when no results match their query.
**Action:** When working on similar search/dropdown components in this codebase, ensure that a zero-results condition is explicitly addressed with a clear message wrapped in `role="alert"` and `aria-live="polite"` to maintain UX and accessibility consistency.
