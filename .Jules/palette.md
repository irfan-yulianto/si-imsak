
## 2024-05-18 - Clear Button for Search Input
**Learning:** Returning focus to an input field immediately after clicking a clear button greatly enhances keyboard accessibility and flow, preventing users from losing their focus context.
**Action:** Always maintain a `useRef` to the input element and programmatically trigger `.focus()` when creating inline clear actions. Ensure conditional loading states don't cause layout shifting by hiding the clear button during fetch operations.
