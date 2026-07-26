## 2025-07-26 - Init\n**Learning:** Initializing journal.\n**Action:** Starting exploration.
## 2025-07-26 - Conditional Clear Button Focus Management
**Learning:** When adding clear buttons to search inputs, if they conditionally render only when there is input and no loading state, users lose focus if the button is unmounted upon click.
**Action:** Always bind a React `useRef` to the input and call `.focus()` inside the clear button's `onClick` handler to return focus to the input and maintain keyboard accessibility.
