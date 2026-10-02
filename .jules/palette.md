## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-10-02 - Add empty states to search results
**Learning:** Hiding the search dropdown entirely when there are no results (but a search query is actively typed) leaves the user wondering if the search broke or if it is still loading. Providing an explicit empty state ("Kota tidak ditemukan") provides clear feedback and reassures the user.
**Action:** When implementing search-as-you-type dropdowns, ensure an explicit empty state (with `role="status"`) is rendered when `searchResults.length === 0` and the user query is non-empty.
