## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add explicit empty state for MosqueFinder search
**Learning:** Silently hiding a search results dropdown when a query yields no results causes confusion and hurts accessibility. Providing an explicit "Kota tidak ditemukan" empty state reassures the user that their query was processed but no match was found.
**Action:** When conditionally rendering search dropdowns, ensure there is always an explicit empty state branch (e.g. `searchResults.length === 0`) instead of relying on `searchResults.length > 0` to hide the list entirely.
