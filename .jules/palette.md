## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add aria-live to empty and error states
**Learning:** When async operations result in an empty state or an error, screen readers often stay silent if the new UI doesn't have an ARIA alert role or live region. This leaves visually impaired users confused about whether the action completed.
**Action:** Always add `role="alert"` and `aria-live="polite"` to containers that conditionally render empty states or error messages (e.g., "Kota tidak ditemukan" or "Jadwal hari ini belum tersedia").
