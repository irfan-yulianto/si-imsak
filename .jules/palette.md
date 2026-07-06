## 2024-07-06 - Search Input Clear Buttons
**Learning:** Adding a conditional clear button requires right padding on the input to prevent text overlap. Conditionally rendering it alongside other icons (like loading spinners) can mess up DOM querying, making relative queries like `previousElementSibling` unreliable.
**Action:** Always use a React `useRef` (e.g., `inputRef`) to explicitly refocus the input instead of relying on DOM traversal, ensure `type="button"` is set so it doesn't submit forms, and add right padding to the input for the clear button footprint.
