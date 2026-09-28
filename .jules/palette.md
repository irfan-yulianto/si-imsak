## 2024-07-29 - Add clear buttons to search inputs
**Learning:** Users often need to clear the entire search query to restart their location or mosque search. A lack of a clear button forces repetitive keyboard deletes, hurting accessibility and efficiency. Adding an accessible clear button that correctly restores focus to the input drastically improves the search UX.
**Action:** When creating search inputs with state, proactively include a clear button with an `aria-label` that restores focus to the input via a `useRef` when clicked.

## 2024-07-30 - Announce Dynamic Empty and Error States
**Learning:** Screen reader users often miss important UI updates when dynamic elements like location prompts, error messages, or "no results" empty states appear.
**Action:** Always wrap dynamic UI states that provide critical feedback (like search results not found, API errors, or location prompts) in a container with `role="alert"` and `aria-live="polite"` to ensure they are announced appropriately.
