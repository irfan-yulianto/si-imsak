## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Add accessible empty state to city search dropdown in MosqueFinder
**Learning:** The city search dropdown in the Mosque Finder silently hid when no results matched the user's query, leaving them confused if their input was being processed or simply didn't exist.
**Action:** Always provide explicit, accessible empty states (e.g., "Kota tidak ditemukan") within a container using `role="alert"` and `aria-live="polite"` when an active search query or filter yields zero results.
