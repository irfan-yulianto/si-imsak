## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-29 - Improve icon-only button accessibility
**Learning:** Icon-only buttons used for secondary actions like 'Coba Lagi' or 'Refresh' in error or empty states lack context for screen reader users. Adding descriptive `aria-label` attributes that include the visible text and clarify the action (e.g., 'Coba Lagi mencari masjid', 'Refresh lokasi masjid', 'Nanti, tunda izin lokasi') ensures all users can navigate and recover from errors effectively.
**Action:** Always add descriptive `aria-label` attributes to icon-only buttons or buttons with ambiguous text, and ensure test queries use the updated accessible names.
