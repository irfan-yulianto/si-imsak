## 2024-07-12 - Focus Management in Clear Buttons
**Learning:** When adding clear buttons to search inputs, standard `previousElementSibling` may fail due to conditional rendering (like loading spinners).
**Action:** Always use a React `useRef` attached directly to the input to safely and predictably restore focus after clearing the search.
