## 2024-06-06 - Micro-UX Clear Buttons
**Learning:** Adding clear buttons (`XIcon`) inside search inputs with absolute positioning and conditional rendering based on query length is a standard micro-UX pattern that improves search interaction efficiency, especially on mobile, without needing custom CSS.
**Action:** When adding clear buttons, make sure to add adequate right padding (e.g., `pr-9`) to the underlying `<input>` to prevent text from overlapping the absolutely positioned icon, and ensure it supports screen readers via `aria-label`.
