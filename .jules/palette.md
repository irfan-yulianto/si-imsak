## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Add accessible names to generic buttons
**Learning:** Screen reader users encounter issues when generic buttons like "Nanti" or "Coba Lagi" lack context.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons containing ambiguous text. Ensure the `aria-label` includes the exact visible text of the button (e.g., 'Coba Lagi mencari masjid' instead of 'Cari masjid lagi') to comply with WCAG 2.5.3 (Label in Name). Verify corresponding React Testing Library queries in `.test.tsx` files.
