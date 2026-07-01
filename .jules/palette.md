## 2024-05-18 - Clear Button UX and A11y

**Learning:** When adding a clear button to a search input in React, setting focus back to the input after clearing is crucial for keyboard users, but relying on DOM traversal (like `previousElementSibling`) is brittle, especially when loading states conditionally alter the DOM structure.
**Action:** Always use a React `useRef` attached to the input element and call `inputRef.current?.focus()` when the clear button is clicked. Additionally, hide the clear button during loading states to prevent layout shifts or overlaps with loading spinners, and ensure the input has adequate right padding (e.g., `pr-9`) so text doesn't flow underneath the absolutely positioned button.
