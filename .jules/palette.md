## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-06 - Accessible error state buttons
**Learning:** Error state buttons and retry actions (like "Coba Lagi" or "Refresh") often lack context when read out of sequence by screen readers, making it unclear what action is being retried. Additionally, they frequently lack explicit `focus-visible` styling, hindering keyboard accessibility.
**Action:** Always add descriptive `aria-label` attributes to generic retry/refresh buttons (e.g., `aria-label="Coba Lagi mencari masjid"`) and ensure they have explicit focus indicators like `focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500` for keyboard navigation.
