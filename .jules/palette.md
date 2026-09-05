## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add descriptive aria-labels to generic text buttons
**Learning:** Generic text buttons like "Refresh" or "Coba Lagi" are ambiguous out of context, hurting accessibility. Additionally, adding an `aria-label` overrides the element's accessible name, requiring updates to React Testing Library queries that previously relied on visible text.
**Action:** Always add descriptive `aria-label` attributes (e.g., "Refresh pencarian masjid") to generic text buttons and ensure they have explicit `focus-visible` styles. When doing so, verify and update any `.test.tsx` files that query these elements to use `getByRole` with the new accessible name.
