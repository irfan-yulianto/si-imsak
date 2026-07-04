## 2024-05-24 - Focus Restoration on Clear Buttons
**Learning:** When attempting to programmatically return focus to an input element from a sibling button (e.g., a clear button) in React, conditional rendering (like loading spinners) can alter the DOM structure, making relative queries unreliable.
**Action:** Always check if a React `useRef` already exists for that element in the component and use it (e.g., `inputRef.current?.focus()`). Avoid falling back to relative DOM queries.
