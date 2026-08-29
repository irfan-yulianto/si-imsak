## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add aria-labels to generic text buttons
**Learning:** Buttons with generic text like "Coba Lagi" (Try Again) lack context for screen reader users, especially when multiple such buttons might exist on a page (e.g., trying to fetch location vs. trying to fetch mosques).
**Action:** Always add descriptive `aria-label` attributes to generic text buttons (e.g., `aria-label="Coba Lagi mencari masjid"`). To comply with WCAG 2.5.3 (Label in Name), ensure the `aria-label` includes the exact visible text of the button.
## 2024-07-31 - Fix React hooks lint errors during code edits
**Learning:** Legacy codebase issues (like `react-hooks/set-state-in-effect`) can cause CI/lint failures when unrelated UX changes are made.
**Action:** Do not attempt to fix unrelated architectural linting issues (like `set-state-in-effect`) if they are pre-existing in unmodified files, to avoid regressions and large PR sizes. Ensure your own specific changes do not introduce new lint errors.
