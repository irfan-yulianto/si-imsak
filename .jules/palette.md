## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-09-10 - Label ambiguous text buttons
**Learning:** Generic text buttons containing ambiguous text (e.g., 'Coba Lagi', 'Refresh') lack context for screen reader users and fail to convey the action's purpose.
**Action:** Proactively add descriptive `aria-label` attributes to these buttons that include the visible text (to comply with WCAG 2.5.3 Label in Name) and provide clear context (e.g., 'Coba Lagi mencari masjid' instead of 'Cari masjid lagi'). Also ensure to update React Testing Library queries querying the old text to query the new accessible name.
