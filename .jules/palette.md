## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Accessible Empty States in Lists
**Learning:** When displaying dynamic dropdown lists (like search results), simply hiding the list on empty results or displaying plain text creates a poor experience for screen reader users who receive no feedback. Furthermore, applying `role="status"` directly to an `<li>` element overrides its implicit `listitem` role, breaking valid ARIA nesting.
**Action:** Always provide explicit, accessible empty states (e.g., 'Kota tidak ditemukan') when an active search query yields zero results. Wrap the text content inside the `<li>` with a `<span role="status" aria-live="polite">` so screen readers announce the state change without breaking list semantics.
