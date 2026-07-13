## 2024-07-13 - Search Input Clear Button
**Learning:** When conditionally rendering a clear button next to a loading spinner, using DOM sibling queries like `previousElementSibling` is unreliable due to structural changes.
**Action:** Always attach a React `useRef` to the input element to safely and consistently return focus after clearing, maintaining robust keyboard accessibility.
