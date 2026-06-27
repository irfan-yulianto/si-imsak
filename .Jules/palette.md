
## 2024-06-27 - Location Search Input Clear Button
**Learning:** Adding interactive elements (like a clear button) inside an input field requires careful management of keyboard focus. If a user clicks the clear button, they expect to immediately start typing a new query. If focus is lost to the document body, the experience is disruptive.
**Action:** Always use a React `useRef` attached to the input and call `inputRef.current?.focus()` within the `onClick` handler of the clear button to maintain a seamless keyboard navigation flow.
