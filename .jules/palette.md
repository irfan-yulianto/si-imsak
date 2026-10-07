## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-29 - Missing empty state in active search dropdowns
**Learning:** Users typing into a search field expect clear, immediate feedback. When filtering a list yields zero results, silently hiding the dropdown fails to confirm their input was processed, leading to confusion. Providing an explicit, accessible empty state inside the dropdown reassures users and completes the interaction loop.
**Action:** Always provide explicit, accessible empty states (e.g., "Kota tidak ditemukan") wrapped with `role="status"` when an active search query yields zero results, matching patterns established in other inputs within the same system.
