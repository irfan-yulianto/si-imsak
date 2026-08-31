## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Add descriptive aria-labels to generic text buttons
**Learning:** Generic text buttons like "Coba Lagi" or "Refresh" lack context for screen reader users. This violates WCAG 2.5.3 (Label in Name) which requires that the accessible name contains the visible text. Furthermore, explicitly providing focus states (like `focus-visible:ring-2`) is crucial for keyboard navigation, particularly in error fallback UI where users might rely solely on the keyboard.
**Action:** Always add context-specific `aria-label` attributes to generic action buttons (e.g., `aria-label="Coba Lagi mencari masjid"`) ensuring the accessible name starts with the exact visible text. Also ensure `focus-visible` classes are always included on interactive elements.
