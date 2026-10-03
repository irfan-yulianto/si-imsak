## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-10-24 - Explicit and Accessible Empty States
**Learning:** Silently hiding dropdowns when a query yields zero results is a poor user experience. Furthermore, when adding `role="status"` to empty states within a list (`<li>`), applying the role directly to the `<li>` element overrides its implicit `listitem` role and creates invalid ARIA nesting.
**Action:** Always provide an explicit empty state (e.g., 'Kota tidak ditemukan') when a search yields zero results. When adding ARIA live region roles to list items, wrap the text content inside a `<span role="status">` to ensure the announcement works without breaking the list structure.
