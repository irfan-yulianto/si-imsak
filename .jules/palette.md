## 2024-07-23 - Clear button for search input
**Learning:** Providing a clear button inside a search input significantly improves the experience of correcting a search query, but it requires carefully managing focus so the user doesn't lose context after clearing.
**Action:** When adding clear buttons, always use a `useRef` to return focus to the input field immediately after clearing the query. Also ensure the input has adequate right padding to prevent text overlap.
