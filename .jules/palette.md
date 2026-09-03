## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Add descriptive ARIA labels to generic buttons
**Learning:** Generic text buttons like 'Refresh' or 'Coba Lagi' lack context when read by a screen reader out of visual sequence. To comply with WCAG 2.5.3, these buttons must have descriptive `aria-label` attributes that include the visible text.
**Action:** Add descriptive `aria-label` attributes to generic buttons that include the exact visible text of the button (e.g., 'Coba Lagi mencari masjid' instead of 'Cari masjid lagi') and remember to update the corresponding React Testing Library queries.
