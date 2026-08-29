## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-11-20 - Add ARIA labels to retry/refresh buttons
**Learning:** Users who rely on screen readers might find generic button text like "Refresh", "Batal", and "Coba Lagi" ambiguous out of context (e.g. when reviewing a list of all buttons on a page). This app heavily uses these terms for different contexts (e.g. refreshing location vs. refreshing mosque list).
**Action:** Always add descriptive `aria-label` attributes to generic text buttons containing ambiguous text (e.g., 'Coba Lagi'). Ensure the `aria-label` includes the exact visible text of the button (e.g., 'Coba Lagi mencari masjid') to comply with WCAG 2.5.3 (Label in Name).
