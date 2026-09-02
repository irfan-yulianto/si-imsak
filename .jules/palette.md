## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-09-02 - Add context to generic recovery buttons
**Learning:** Error state buttons with generic text like "Coba Lagi" or "Refresh" lack context for screen reader users, especially when multiple such buttons might exist across a complex UI. Relying only on visible text violates WCAG 2.5.3 (Label in Name) when additional context is needed.
**Action:** Always add descriptive `aria-label` attributes (e.g., `aria-label="Coba Lagi mencari masjid"`) to generic error recovery or refresh buttons, and ensure explicit `focus-visible` states are present for keyboard accessibility. Update associated RTL queries to use `getByRole` with the new accessible name.
