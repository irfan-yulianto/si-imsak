## 2025-02-18 - Input Clear Button Focus
**Learning:** When users clear a search input to search for a new city, it is extremely beneficial to return focus to the input automatically. However, conditional rendering such as loading indicators next to the button may interfere with DOM selection.
**Action:** Always add a clear button if the input has text and focus the input using a `useRef` hook attached to it for reliability, maintaining keyboard accessibility.
