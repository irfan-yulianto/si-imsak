## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Add aria-labels to ambiguous text buttons
**Learning:** Screen reader users struggle with buttons that have generic text like "Refresh", "Batal", "Coba Lagi", or "Nanti" out of context. To comply with WCAG 2.5.3 (Label in Name), these buttons must have descriptive `aria-label`s that include their exact visible text.
**Action:** When adding buttons with ambiguous visible text, proactively include an `aria-label` that provides context while containing the visible text (e.g., `aria-label="Coba Lagi mencari masjid"` for a "Coba Lagi" button).
