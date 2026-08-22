## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Add aria-labels to generic interactive elements
**Learning:** Generic button texts like "Refresh" and "Coba Lagi" or icon-only links like "Navigasi" lack sufficient context for screen reader users when read out of context. Providing a descriptive `aria-label` ensures the action's intent is clear.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons (e.g., 'Refresh', 'Coba Lagi') and links with ambiguous text to provide complete context for screen reader users.
