## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-10-24 - Focus states on interactive buttons
**Learning:** Even auxiliary fallback buttons like "Coba Lagi" or "Refresh" inside error boundaries or data sections require distinct keyboard focus states, as screen reader and keyboard-only users often navigate directly to actions following read errors.
**Action:** Always include `focus-visible:outline-none focus-visible:ring-2` on every interactive `<button>` element regardless of its placement inside the component tree.
