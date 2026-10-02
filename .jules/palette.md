## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Add accessible empty states for dynamic searches
**Learning:** Silently hiding dropdowns or lists when an active search query yields zero results leaves users confused about whether the search failed, is still loading, or found no results. Providing an explicit empty state (e.g., "Kota tidak ditemukan") wrapped in `role="status"` and `aria-live="polite"` ensures screen readers announce the outcome, vastly improving UX and accessibility.
**Action:** Always provide explicit, accessible empty states (e.g., "Kota tidak ditemukan" or "Tidak ada masjid ditemukan") when an active search query or filter yields zero results, rather than silently hiding the UI. Ensure they are wrapped in an appropriate ARIA status container.
