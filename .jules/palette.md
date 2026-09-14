## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-30 - Add focus-visible styles to standard buttons
**Learning:** Many standard interactive elements (like custom buttons and list items acting as buttons) lack explicit focus states, hurting keyboard navigation accessibility. Relying purely on hover styles leaves keyboard users without visual feedback of their current position.
**Action:** Consistently apply `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color]-500` (and `focus-visible:bg-[color]` for list items) to ensure all interactive elements clearly indicate focus when navigated via keyboard.
