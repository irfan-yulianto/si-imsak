## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-10-24 - Provide empty state for search
**Learning:** When users search for a location or query and no results are found, hiding the dropdown silently can be confusing. Explicitly displaying a "Kota tidak ditemukan" or "Tidak ada hasil" empty state, wrapped in an alert (aria-live="polite") helps users understand the search yielded zero results.
**Action:** Always provide explicit, accessible empty states instead of silently hiding search results components when queries yield zero matches.
