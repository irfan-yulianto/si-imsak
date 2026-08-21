## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-08-21 - Add contextual aria-labels to generic text buttons
**Learning:** Screen readers might announce generic text like "Coba Lagi" or "Refresh" without enough context for the user to understand what action is being repeated or refreshed. This can lead to confusion.
**Action:** Always add descriptive `aria-label` attributes to generic action buttons (e.g., `aria-label="Coba lagi memuat jadwal"`) to provide complete context to screen reader users.
