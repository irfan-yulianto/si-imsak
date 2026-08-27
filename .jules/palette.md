## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-08-27 - Add aria-labels to buttons for better accessibility
**Learning:** Icon-only buttons or buttons with ambiguous text (like "Hari Ini" or "Coba Lagi") lack context for screen reader users. Adding descriptive `aria-label`s makes these actions clear and accessible.
**Action:** When adding generic action buttons or icon-only buttons, always include an `aria-label` that describes the exact action that will be performed. Ensure corresponding React Testing Library queries are updated since the `aria-label` becomes the element's accessible name.
