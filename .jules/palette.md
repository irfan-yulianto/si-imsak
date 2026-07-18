## 2024-07-18 - Clear Button Focus and Layout
**Learning:** Adding a clear button to search inputs improves usability, but must be implemented carefully. Conditional rendering (loading states vs clear button) requires managing padding (`pr-9`) to prevent overlap, and returning focus to the input (`inputRef.current?.focus()`) after clicking the clear button is essential for keyboard accessibility and continuous typing.
**Action:** Always verify right padding, use explicit `type="button"`, and restore focus with a `useRef` when implementing inline clear or action buttons in text inputs.
