## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.
## 2025-01-31 - Add focus-visible states to error recovery buttons
**Learning:** Error states often require immediate user action (like "Coba Lagi" / Try Again). Users relying on keyboard navigation must be able to easily identify when these recovery buttons are focused. Lacking visible focus states on dynamically appearing error buttons causes severe accessibility and navigation friction.
**Action:** Always ensure that error recovery buttons, such as "Coba Lagi", include explicit `focus-visible` styles (e.g. `focus-visible:ring-2`) matching the alert's color theme to maintain visual focus indication.
