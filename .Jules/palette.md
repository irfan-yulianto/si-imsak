
## 2024-05-18 - Input Clear Button Accessibility
**Learning:** Conditionally rendered clear buttons in search inputs can cause focus loss if simply clicked without explicitly returning focus to the input. Additionally, relying on DOM traversal (like `previousElementSibling`) is brittle when loading states or absolute positioning alter the structure.
**Action:** Always use `useRef` to maintain a reference to the input element and explicitly call `ref.current?.focus()` inside the clear button's `onClick` handler. Ensure the input has adequate right padding (e.g., `pr-9`) to prevent the button from overlapping user text.
