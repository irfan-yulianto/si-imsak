## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-02 - Add accessible ARIA labels to generic text buttons
**Learning:** Generic text buttons like "Coba Lagi" (Try Again) or "Refresh" lack context for screen reader users and often miss focus-visible states.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons (e.g., `aria-label="Coba Lagi mencari masjid"`) and explicitly provide `focus-visible` styles to ensure keyboard accessibility. Ensure the aria-label contains the visible text of the button to comply with WCAG 2.5.3 (Label in Name).
