## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-10-01 - Add ARIA live regions for dynamic empty/error states
**Learning:** Dynamic UI states like empty search results or error messages after async operations need to be announced to screen readers. If missing, assistive technology users won't know the operation completed or failed.
**Action:** Always wrap conditional empty or error messages after an async operation in a container with `role="status"` and `aria-live="polite"`. When adding these to list items (`<li>`), apply the attributes to an inner `<span>` instead to avoid overriding the implicit `listitem` role.
