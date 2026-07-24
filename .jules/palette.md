## 2024-05-24 - Add clear button to location search input
**Learning:** When conditionally rendering clear buttons on input fields, it is critical to use a `useRef` to return focus to the input after the query is cleared. This ensures the user stays in context and maintains keyboard and screen reader accessibility flow.
**Action:** Always check if a React `useRef` exists for an element and use it to return focus after interacting with sibling controls like clear buttons.
