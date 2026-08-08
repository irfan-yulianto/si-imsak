## 2025-02-14 - Add clear button to search inputs
**Learning:** Users need a quick way to clear text in search fields, especially on mobile devices. Combining the clear button with `useRef` to immediately refocus the input field is a smooth UX pattern, but we must ensure it doesn't overlap the text and remains hidden during loading.
**Action:** When adding clear buttons, always add right padding to the input field, use `type="button"`, and restore focus to the input via a ref after clearing.
