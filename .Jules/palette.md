## 2024-06-30 - Added clear buttons to search inputs
**Learning:** When adding conditional clear buttons to search inputs, ensure the input has adequate right padding (e.g., `pr-9`) to prevent text overlap, hide the button during loading states to prevent layout collisions, and use a ref (`ref.current?.focus()`) to return focus to the input after clearing to maintain keyboard accessibility.
**Action:** Always verify right padding, consider loading states, and use `useRef` to properly restore focus for accessibility when adding interactive elements within input wrappers.
