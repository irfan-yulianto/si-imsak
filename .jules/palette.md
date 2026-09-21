## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-08-01 - Add aria-live regions to dynamic error and empty states
**Learning:** Screen readers won't announce dynamically appearing error messages or empty states unless explicitly guided. Leaving out `role="status"` and `aria-live="polite"` on conditional empty or error states (like location search failures, mosque fetching errors, or empty schedule views) makes users dependent on assistive technologies unaware of critical updates.
**Action:** When implementing dynamic UI states in this repository (such as conditional empty or error messages after an async operation), always wrap them in a container with `role="status"` and `aria-live="polite"` so that screen readers can announce the changes.
