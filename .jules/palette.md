## 2024-06-24 - Accessible Input Clear Button
**Learning:** Conditional rendering of clear buttons within inputs can disrupt keyboard accessibility if focus isn't managed. Also, input right-padding must be adjusted to prevent text overlapping the conditionally rendered button.
**Action:** Always use a `useRef` to maintain reference to the input element and call `.focus()` when the clear button is clicked. Use `pr-9` instead of standard padding when adding an inner right button.
