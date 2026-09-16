## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-05-15 - Add explicit focus-visible states to all interactive elements
**Learning:** Many secondary buttons and list items lacked visible focus states, making keyboard navigation difficult and violating accessibility best practices. Relying on default browser focus outlines can be inconsistent across browsers and OS.
**Action:** Always ensure every interactive element (`button`, `a`, custom list items) explicitly includes `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color]-500` (e.g., `focus-visible:ring-emerald-500`) to guarantee clear visual feedback during keyboard navigation.
