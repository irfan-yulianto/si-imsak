## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2024-07-30 - Add ARIA labels to generic text buttons
**Learning:** Generic text buttons like "Refresh" or "Coba Lagi" lack context for screen reader users, making it unclear what action will be performed or what will be retried. Relying solely on visual context or surrounding text fails to provide an inclusive experience.
**Action:** Always add descriptive `aria-label` attributes to generic text buttons. To comply with WCAG 2.5.3 (Label in Name), ensure the `aria-label` includes the exact visible text of the button (e.g., `aria-label="Coba Lagi memuat jadwal"` instead of `aria-label="Muat ulang jadwal"`).
