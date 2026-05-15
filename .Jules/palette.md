## 2024-05-18 - Search Input Clear Button
**Learning:** Adding a clear button (X) inside search inputs with absolute positioning is a key micro-UX pattern, but requires careful attention to keyboard accessibility and loading states.
**Action:** When adding clear buttons, always ensure proper right padding (`pr-9`) to prevent text overlap, conditionally hide the button during loading states to avoid layout collisions, add `aria-label` for screen readers, and return focus to the input (`inputRef.current?.focus()`) after clearing so users can immediately type a new query.
