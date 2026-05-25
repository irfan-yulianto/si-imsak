## 2026-05-25 - Add clear button to search inputs
**Learning:** Implementing absolute-positioned clear buttons inside text inputs is a common micro-UX pattern, but requires adding adequate right padding (e.g. `pr-9`) to the input to prevent text from overlapping the button, as well as an `aria-label` for screen readers and programmatically restoring focus (`ref.current.focus()`) after clearing.
**Action:** Always verify input padding and focus management when adding interactive elements inside form fields.
