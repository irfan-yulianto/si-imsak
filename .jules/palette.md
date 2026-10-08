## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Accessible empty states for search lists
**Learning:** Silently hiding list elements when there are zero search results gives no context to the user, and screen readers will just see nothing.
**Action:** When creating search list inputs, explicitly provide a visually readable message representing an empty state, wrapping it in a `<span role="status" aria-live="polite">` element. This avoids invalid nesting while communicating effectively to both standard users and assistive technology users.
