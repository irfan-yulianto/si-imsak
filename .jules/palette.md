## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-09-09 - Add descriptive aria-labels to generic buttons
**Learning:** Generic button texts like "Coba Lagi" (Try Again) lack context for screen reader users when used out of visual context (e.g., error boundaries, retry states).
**Action:** Always add descriptive `aria-label` attributes to generic text buttons that include the visible text and context (e.g., "Coba Lagi mencari masjid") to comply with WCAG 2.5.3, and update the associated React Testing Library queries.
