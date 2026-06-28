## 2025-06-28 - Conditional Clear Buttons and Focus Restoration
**Learning:** When conditionally rendering a clear button for an input field (e.g. only when there is text and no loading spinner is present), using `previousElementSibling` to restore focus to the input can fail because the loading spinner's presence might shift DOM positions.
**Action:** Always use a React `useRef` directly attached to the target input (e.g., `inputRef.current?.focus()`) to maintain robust keyboard accessibility and focus restoration instead of relying on brittle DOM traversal.
