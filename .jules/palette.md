## 2024-05-24 - Search Input Clear Button Accessibility
**Learning:** When conditionally rendering a clear button inside a search input (e.g., hidden during loading states), using relative DOM traversal like `previousElementSibling` to restore focus is brittle because the DOM structure changes.
**Action:** Always attach a React `useRef` to the input element and call `ref.current?.focus()` on it from the clear button's click handler to ensure robust keyboard accessibility, and always use `type="button"` to avoid unintended form submissions.
