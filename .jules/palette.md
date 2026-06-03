
## 2026-06-03 - Add clear button to search inputs
**Learning:** Adding an absolute positioned clear button inside search inputs that conditionally renders when the query length is > 0 is a standard micro-UX pattern. Ensure to add adequate right padding to the input to prevent text overlap, conditionally hide the button during loading states to avoid layout collisions, and use `aria-label` with keyboard-friendly interactions (returning focus to the input upon clearing). Also localized the text as `Hapus pencarian`.
**Action:** Always verify search inputs have a clear way to reset the query. Include ARIA labels and focus management so keyboard/screen reader users can use them efficiently.
