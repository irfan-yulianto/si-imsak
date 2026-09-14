## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-14 - Empty States in Local Search
**Learning:** Omitting empty states (e.g., when a search query yields no results, or when filtering returns an empty list) leaves users unsure if the app is still loading, if their input was registered, or if there genuinely are no results.
**Action:** Always provide explicit, accessible empty states (like "Kota tidak ditemukan" or "Tidak ada masjid ditemukan") when an active query or filter yields zero results.
